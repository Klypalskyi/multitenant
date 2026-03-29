# Shared database — `tenant_id` column (Phase 8.2)

**Topology A** from [PLAN.md](../../PLAN.md): one physical database, strict tenant isolation with a **tenant discriminator column** (often `tenant_id` / `org_id`) on shared tables.

This repo does **not** execute SQL. Use **`@multitenant/database`** together with ALS (`runWithTenantScope` at the HTTP boundary) and these helpers:

| Helper | Use |
|--------|-----|
| `requireTenantKey()` | Current scoped tenant key; throws if no ALS scope. |
| `assignTenantIdForWrite(row, column?)` | Merge tenant key into a write payload; throws if the row already has a **different** tenant on that column. |
| `assertRowTenantColumn(row, column?)` | After a read, assert the row’s tenant column matches scope (catch wide queries / mapping bugs). |

Always use **parameterized** queries from your driver/ORM; these helpers only manage **values** and **invariants**.

## Composite tenant keys

If your model uses **multiple** columns (e.g. `(tenant_id, subsidiary_id)`), do **not** rely on a single default column: set scope to a stable **`tenantKey`** string that encodes your tuple (e.g. `acme:eu`) **or** pass explicit `tenantKey` into repositories from `ResolvedTenant` without relying on a single DB column helper. Add `AND` predicates per column in your query layer and index **(tenant_id, …)** for selective scans.

## Indexes

- Prefer indexes that lead with the tenant column: **`(tenant_id, id)`** or **`(tenant_id, created_at)`** so per-tenant queries stay narrow.
- Uniqueness inside a tenant: **`UNIQUE (tenant_id, slug)`** rather than global `slug` alone.

## Threat model (reminder)

Host / header resolution **does not** authenticate the user. `tenant_id` in the row must match **ALS scope** set only after **trusted** resolution (or `assertAccess` when using identity). Never trust a client-supplied `X-Tenant-Id` as the only scope source.

## See also

- [Postgres RLS tenant GUC](postgres-rls-tenant.md) — `SET LOCAL` + policies (Phase 8.3)
- [Schema-per-tenant Postgres](schema-per-tenant-postgres.md) — one cluster, one schema per tenant (Phase 8.4)
- [Database scope / ALS](database-scope.md)
- [Tenant-bound sessions](tenant-bound-sessions.md)
