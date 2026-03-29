# Prisma + Postgres reference (`@multitenant/prisma`)

Optional peer package: **`getOrCreateTenantPrismaClient`** and **`createSharedPrismaClient`**, wired to **`BoundedTenantDbResourceCache`** and **`resolveTenantDatabaseUrl`** (via `@multitenant/database`).

Install **`@prisma/client`** from your app (with your own `schema.prisma`). This repo package ships only **construction helpers** — it does not replace `prisma migrate` or your schema.

## Install

```bash
npm install @multitenant/prisma @multitenant/database @multitenant/core @prisma/client
```

## Topology A — shared database

One DSN; tenant isolation in app + DB (`tenant_id`, RLS, etc.).

```ts
import { createSharedPrismaClient } from '@multitenant/prisma';

export const prisma = createSharedPrismaClient(process.env.DATABASE_URL!);
```

Use **`runWithTenantScope`** + **`assignTenantIdForWrite`** / **`assertRowTenantColumn`** where applicable.

## Topology B — per-tenant DSN

Configure `tenants[*].database.envVar` ([per-tenant-database-url.md](per-tenant-database-url.md)). Cache **`PrismaClient`** instances (they are **not** as cheap to create as Drizzle wrappers — cap **`maxPools`** and evict with **`$disconnect`**):

```ts
import { BoundedTenantDbResourceCache } from '@multitenant/database';
import { getOrCreateTenantPrismaClient } from '@multitenant/prisma';
import type { ResolvedTenant } from '@multitenant/core';

const clientCache = new BoundedTenantDbResourceCache({
  maxPools: 24,
  idleEvictMs: 20 * 60 * 1000,
  onEvict: (c) => {
    void c.$disconnect().catch(() => undefined);
  },
});

export function prismaForTenant(
  resolved: ResolvedTenant,
  tenants: Record<string, import('@multitenant/core').TenantDefinition>,
) {
  return getOrCreateTenantPrismaClient(clientCache, resolved, tenants);
}
```

Optional **`prismaOptions`** (e.g. `log`) are merged into `new PrismaClient({ ... })` after **`datasourceUrl`**.

## Migrations

Same guidance as [database-migrations-multitenant.md](database-migrations-multitenant.md).

## See also

- [Drizzle + Postgres](drizzle-postgres.md) (`@multitenant/drizzle`)
- [Bounded per-tenant DB pools](bounded-tenant-db-pools.md)
- [PLAN Phase 8](../../PLAN.md)
