# Bounded per-tenant DB pools (Phase 8.6)

**Goal:** Cache one pool/client per **`tenantKey` + resolved DSN** without an unbounded `Map`, using a **hard cap** and **LRU eviction** (plus optional **idle TTL**).

## API

From **`@multitenant/database`**:

| Export | Role |
|--------|------|
| **`makeTenantDatabaseCacheKey(tenantKey, databaseUrl)`** | Stable composite key (`tenant` and URL both required so two tenants never share a pool for the same URL string, and URL rotation yields a new entry). |
| **`BoundedTenantDbResourceCache<T>`** | `getOrCreate(cacheKey, factory)`, optional **`idleEvictMs`**, **`onEvict`** for `pool.end()` / teardown, **`destroy()`** for shutdown. |
| **`getOrCreateTenantDatabaseResource(cache, resolved, tenants, factory, options?)`** | Combines **`resolveTenantDatabaseUrl`** (Phase 8.5) + cache. |

Drivers are **not** bundled: `T` is typically `pg.Pool`, a Prisma client, etc. Set each pool’s own **`max`** (connections) in the factory — this package only bounds **how many distinct pools** you retain.

## Long-lived Node vs serverless

| Runtime | Guidance |
|---------|-----------|
| **Long-lived Node** (Express, Nest, custom HTTP) | One process-wide **`BoundedTenantDbResourceCache`** with **`maxPools`** tuned to hot-tenant cardinality + headroom; register **`destroy()`** on **`SIGTERM`**. Prefer **`idleEvictMs`** so cold tenants release sockets. |
| **Serverless / per-request isolates** | Often **no shared cache** across invocations — create a short-lived pool per invocation or use **external pooler** (PgBouncer). If you do cache on a warm instance, keep **`maxPools` very small** to avoid connection storms. |

## Example (`pg`)

```ts
import pg from 'pg';
import {
  BoundedTenantDbResourceCache,
  getOrCreateTenantDatabaseResource,
} from '@multitenant/database';

const poolCache = new BoundedTenantDbResourceCache<pg.Pool>({
  maxPools: 32,
  idleEvictMs: 15 * 60 * 1000,
  onEvict: (pool) => {
    void pool.end().catch(() => undefined);
  },
});

export function poolForRequest(
  resolved: ResolvedTenant,
  tenants: Record<string, import('@multitenant/core').TenantDefinition>,
): pg.Pool {
  return getOrCreateTenantDatabaseResource(
    poolCache,
    resolved,
    tenants,
    (url) =>
      new pg.Pool({
        connectionString: url,
        max: 5,
      }),
  );
}
```

## Threat model / ops

- **Secrets:** same as Phase 8.5 — URLs from env only; never log full DSNs.
- **Eviction:** `onEvict` should close pools; LRU runs synchronously on the hot path — use non-blocking teardown (`void pool.end()…`) if needed.
- **Caps:** **`maxPools`** limits distinct cached pools, not total connections — total ≈ sum of each pool’s `max`.

## See also

- [Per-tenant database URL](per-tenant-database-url.md) (Phase 8.5)
- [Drizzle + Postgres reference](drizzle-postgres.md) (Phase 8.7) — `getOrCreateTenantNodePgPool`
- [Database scope / ALS](database-scope.md)
- [PLAN Phase 8](../../PLAN.md)
