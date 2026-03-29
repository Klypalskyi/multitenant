# Drizzle + Postgres reference (`@multitenant/drizzle`)

**Phase 8.7** — thin helpers over **`drizzle-orm/node-postgres`** and **`pg`**, wired to **`@multitenant/database`** (ALS, `assignTenantIdForWrite`, bounded pool cache, per-tenant DSN).

This is a **reference adapter**, not a second ORM: install **`drizzle-orm`** and **`pg`** in your app; this package only standardizes pool + Drizzle construction.

## Install

```bash
npm install @multitenant/drizzle @multitenant/database @multitenant/core drizzle-orm pg
```

## Topology A — shared database

One `Pool` (or serverless-friendly client) for all tenants; enforce isolation with **`tenant_id`** (`assignTenantIdForWrite`, `assertRowTenantColumn`) and optionally Postgres RLS ([postgres-rls-tenant.md](postgres-rls-tenant.md)).

```ts
import { Pool } from 'pg';
import { createNodePgDrizzle } from '@multitenant/drizzle';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = createNodePgDrizzle(pool, schema);
```

Inside `runWithTenantScope`, use **`assignTenantIdForWrite`** on inserts/updates and **`assertRowTenantColumn`** after reads.

## Topology B — per-tenant DSN

Configure `tenants[*].database.envVar` ([per-tenant-database-url.md](per-tenant-database-url.md)). Reuse one process-wide **`BoundedTenantDbResourceCache<Pool>`** ([bounded-tenant-db-pools.md](bounded-tenant-db-pools.md)), then:

```ts
import { BoundedTenantDbResourceCache } from '@multitenant/database';
import { getTenantNodePgDrizzle } from '@multitenant/drizzle';
import type { ResolvedTenant } from '@multitenant/core';
import * as schema from './schema';

const poolCache = new BoundedTenantDbResourceCache<import('pg').Pool>({
  maxPools: 32,
  idleEvictMs: 15 * 60 * 1000,
  onEvict: (p) => {
    void p.end().catch(() => undefined);
  },
});

export function dbForTenant(
  resolved: ResolvedTenant,
  tenants: Record<string, import('@multitenant/core').TenantDefinition>,
) {
  return getTenantNodePgDrizzle(poolCache, resolved, tenants, schema);
}
```

Each call returns a **new** Drizzle instance over a **cached** pool; that is intentional and cheap.

Lower-level: **`getOrCreateTenantNodePgPool`** + **`createNodePgDrizzle(pool, schema)`** if you need the `Pool` for non-Drizzle code paths.

## Threat model

Same as [database-scope.md](database-scope.md) and [per-tenant-database-url.md](per-tenant-database-url.md): resolve tenant from **trusted** host/registry path (and identity when applicable) **before** choosing a DSN or opening a pool.

## See also

- Package README — `packages/drizzle/README.md`
- [Shared DB `tenant_id`](shared-db-tenant-id.md)
- [Migrations (multi-tenant)](database-migrations-multitenant.md)
- [PLAN Phase 8](../../PLAN.md)
