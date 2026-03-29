# TypeORM + Postgres reference (`@multitenant/typeorm`)

**Phase 8.7** — thin helpers over **`typeorm`** **`DataSource`** (driver **`postgres`**), wired to **`@multitenant/database`** (bounded pool cache, per-tenant DSN).

Install **`typeorm`** in your app and own **entities**, **migrations**, and **`initialize()`** / **`destroy()`**. This package only standardizes how you build a **`DataSource`** from a URL (shared vs per-tenant).

## Install

```bash
npm install @multitenant/typeorm @multitenant/database @multitenant/core typeorm
```

## Lifecycle

**`DataSource` is lazy:** call **`await dataSource.initialize()`** before repositories / queries. On cache eviction, use **`await dataSource.destroy()`** (or **`void ds.destroy().catch(() => undefined)`** in **`onEvict`**) to close connections.

## Topology A — shared database

One URL; isolate tenants with **`tenant_id`**, RLS, or schema-per-tenant patterns from **`@multitenant/database`**.

```ts
import { createSharedPostgresDataSource } from '@multitenant/typeorm';
import { User } from './entity/User';

const dataSource = createSharedPostgresDataSource(process.env.DATABASE_URL!, {
  entities: [User],
  synchronize: false,
});

await dataSource.initialize();
```

Use **`runWithTenantScope`**, **`assignTenantIdForWrite`**, and **`assertRowTenantColumn`** (or RLS helpers) as in other Phase 8 docs.

## Topology B — per-tenant DSN

Configure `tenants[*].database.envVar` ([per-tenant-database-url.md](per-tenant-database-url.md)). Reuse one **`BoundedTenantDbResourceCache<DataSource>`** ([bounded-tenant-db-pools.md](bounded-tenant-db-pools.md)):

```ts
import { BoundedTenantDbResourceCache } from '@multitenant/database';
import { getOrCreateTenantPostgresDataSource } from '@multitenant/typeorm';
import type { ResolvedTenant } from '@multitenant/core';
import { User } from './entity/User';

const dsCache = new BoundedTenantDbResourceCache({
  maxPools: 24,
  idleEvictMs: 20 * 60 * 1000,
  onEvict: (ds) => {
    void ds.destroy().catch(() => undefined);
  },
});

export function dataSourceForTenant(
  resolved: ResolvedTenant,
  tenants: Record<string, import('@multitenant/core').TenantDefinition>,
) {
  return getOrCreateTenantPostgresDataSource(dsCache, resolved, tenants, {
    dataSourceOptions: {
      entities: [User],
      synchronize: false,
    },
  });
}
```

Pass **`env`** (or **`getEnv`**) like **`resolveTenantDatabaseUrl`** — same options as other ORM adapters.

**Warm-up:** the first request per tenant may need **`await dataSource.initialize()`** if not already initialized (e.g. in a Nest `onModuleInit` or request-scoped factory). Avoid **`initialize()`** on every HTTP request unless you cache the initialized instance yourself.

## Migrations

Same guidance as [database-migrations-multitenant.md](database-migrations-multitenant.md). TypeORM CLI runs against **one** `DataSource` at a time — for **N** tenant DBs, automate **N** runs or use a shared DB + `tenant_id` / RLS.

## Threat model

Same as [database-scope.md](database-scope.md): resolve tenant from a **trusted** path before choosing a DSN or returning a **`DataSource`**.

## See also

- [Drizzle + Postgres](drizzle-postgres.md) — `@multitenant/drizzle`
- [Kysely + Postgres](kysely-postgres.md) — `@multitenant/kysely`
- [Prisma + Postgres](prisma-postgres.md) — `@multitenant/prisma`
- Package README — `packages/typeorm/README.md`
- [PLAN Phase 8](../../PLAN.md)
