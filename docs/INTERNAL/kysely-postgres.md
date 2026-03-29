# Kysely + Postgres reference (`@multitenant/kysely`)

**Phase 8.7** — thin helpers over **`kysely`** **`PostgresDialect`** + **`pg`**, wired to **`@multitenant/database`** (ALS, bounded pool cache, per-tenant DSN).

This is a **reference adapter**, not a second query builder: install **`kysely`** and **`pg`** in your app; this package only standardizes pool + `Kysely` construction.

## Install

```bash
npm install @multitenant/kysely @multitenant/database @multitenant/core kysely pg
```

Define your **`Database`** interface (or codegen from schema) as usual for Kysely.

## Topology A — shared database

One `Pool`; enforce isolation with **`tenant_id`** (`assignTenantIdForWrite`, `assertRowTenantColumn`) and optionally Postgres RLS ([postgres-rls-tenant.md](postgres-rls-tenant.md)).

```ts
import { Pool } from 'pg';
import { createNodePgKysely } from '@multitenant/kysely';
import type { Database } from './types';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = createNodePgKysely<Database>(pool);
```

Inside `runWithTenantScope`, use **`assignTenantIdForWrite`** on inserts/updates and **`assertRowTenantColumn`** after reads.

## Topology B — per-tenant DSN

Configure `tenants[*].database.envVar` ([per-tenant-database-url.md](per-tenant-database-url.md)). Reuse one process-wide **`BoundedTenantDbResourceCache<Pool>`** ([bounded-tenant-db-pools.md](bounded-tenant-db-pools.md)), then:

```ts
import { BoundedTenantDbResourceCache } from '@multitenant/database';
import { getTenantNodePgKysely } from '@multitenant/kysely';
import type { ResolvedTenant } from '@multitenant/core';
import type { Database } from './types';

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
  return getTenantNodePgKysely<Database>(poolCache, resolved, tenants);
}
```

Each call returns a **new** `Kysely` over a **cached** pool; pooling is on `Pool`.

Lower-level: **`getOrCreateTenantNodePgPool`** + **`createNodePgKysely(pool)`** if you need the `Pool` for non-Kysely code paths.

## Threat model

Same as [database-scope.md](database-scope.md) and [per-tenant-database-url.md](per-tenant-database-url.md): resolve tenant from **trusted** host/registry path (and identity when applicable) **before** choosing a DSN or opening a pool.

## See also

- [Drizzle + Postgres](drizzle-postgres.md) — `@multitenant/drizzle`
- [Prisma + Postgres](prisma-postgres.md) — `@multitenant/prisma`
- Package README — `packages/kysely/README.md`
- [Shared DB `tenant_id`](shared-db-tenant-id.md)
- [Migrations (multi-tenant)](database-migrations-multitenant.md)
- [PLAN Phase 8](../../PLAN.md)
