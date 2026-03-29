# Schema-per-tenant on one Postgres cluster (Phase 8.4)

**Topology A (variant):** one database server, **one schema per tenant** (e.g. `tnt_acme`, `tnt_us_main`) instead of a shared `tenant_id` column on every table. Compare with [shared `tenant_id`](shared-db-tenant-id.md).

## Naming

Use logical `tenantKey` from `ResolvedTenant` with **`schemaNameForTenant`** / **`requireSchemaNameForCurrentTenant`** from `@multitenant/database` (PostgreSQL-safe unquoted identifier: lowercased, punctuation → `_`, max **63 UTF-8 bytes**, leading digits get `t_`). Optional `prefix` keeps app namespaces clear (e.g. `tnt_acme`).

**Collisions:** two different keys can normalize to the same schema name; keep registry keys distinct under the same normalization rule.

## `search_path`

Typical pattern per transaction:

```sql
SET LOCAL search_path TO tnt_acme, public;
```

Use **`SET LOCAL`** so the setting dies with the transaction (safer with pools than session-scoped `SET`).

## Pooling & prepared statements

- **Session pooling (PgBouncer in session mode, or long-lived app connections):** `SET LOCAL` each transaction; avoid relying on a connection’s `search_path` across transactions.
- **Transaction pooling:** `search_path` must be set **inside** every transaction that runs tenant SQL; prefer **fully qualified** names `schema.table` if you cannot guarantee per-request `SET LOCAL`.
- **Prepared statements** built without schema qualification can see the wrong schema if `search_path` leaked — qualify identifiers or re-prepare per tenant/schema.

This repo does not run SQL; wire the above in your driver layer.

## Migrations

Each tenant schema needs the same object set: run migrations **per schema** (loop `CREATE SCHEMA` + `SET search_path` + migrate) or use a tool that targets schema-qualified DDL. Operational blast radius: **N tenants ⇒ N schema applies**.

## See also

- [Database scope / ALS](database-scope.md) — `requireSchemaNameForCurrentTenant`
- [PLAN Phase 8](../../PLAN.md)
