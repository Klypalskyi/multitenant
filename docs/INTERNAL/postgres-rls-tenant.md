# Postgres row-level security — tenant GUC (Phase 8.3)

Use **RLS** as *defense in depth* with app-layer checks ([`tenant_id` column](shared-db-tenant-id.md), [ALS scope](database-scope.md), [identity `assertAccess`](tenant-bound-sessions.md)). Host resolution ≠ end-user authorization.

## Pattern: `SET LOCAL` + `current_setting`

1. At the **start of each transaction** that runs row queries, set a **transaction-local** custom parameter to the resolved **`tenantKey`** (after trusted resolution).
2. Policies compare a **`tenant_id`** column to that setting.

Example DDL (adapt names to your schema):

```sql
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets FORCE ROW LEVEL SECURITY;

CREATE POLICY widgets_tenant_isolation ON widgets
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

`true` = *missing_ok* — if `SET LOCAL` was not run, the setting is NULL and rows **do not match** (fail closed for `USING`).

## Node: building `SET LOCAL`

Use **`buildSetLocalTenantGucSql`** / **`buildSetLocalTenantGucSqlFromScope`** from `@multitenant/database` (escape + GUC name validation). Default GUC is **`app.tenant_id`** (`POSTGRES_RLS_TENANT_GUC_DEFAULT`).

```ts
import { buildSetLocalTenantGucSqlFromScope, runWithTenantScopeAsync } from '@multitenant/database';

await runWithTenantScopeAsync({ tenantKey: resolved.tenantKey }, async () => {
  const sql = buildSetLocalTenantGucSqlFromScope();
  await client.query('BEGIN');
  await client.query(sql);
  // … queries …
  await client.query('COMMIT');
});
```

Prefer **`SET LOCAL`** (not session-level `SET`) so pooled connections do not leak tenant context into the next lease.

## Poolers (PgBouncer) and prepared statements

- **Transaction pooling:** `SET LOCAL` is visible only inside the current transaction — run it **after** `BEGIN` on the same connection you use for queries. You cannot rely on session-level state.
- **Session pooling:** still use **`SET LOCAL` per transaction** to avoid subtle leaks when the app reuses transactions incorrectly.
- **Prepared statements** that omit `tenant_id` in the text but expect RLS to filter must run **after** `SET LOCAL` on the same transaction. **Supavisor / pooler** quirks: validate against your vendor docs.

## Table owner / superuser

Table owners bypass RLS unless **`FORCE ROW LEVEL SECURITY`** is set on the table. Application roles should **not** own tenant tables in production if you depend on RLS.

## Optional dockerized CI

End-to-end RLS against a real Postgres is **optional** for this repo (no shared `docker compose` in CI today). Contract tests live in `packages/database` (SQL string + validation only).

## See also

- [Shared DB `tenant_id`](shared-db-tenant-id.md)
- [Schema-per-tenant](schema-per-tenant-postgres.md)
- [PLAN Phase 8](../../PLAN.md)
