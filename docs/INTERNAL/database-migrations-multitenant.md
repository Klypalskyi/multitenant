# Database migrations — shared DB vs N tenant databases

**Phase 8.8** — operational patterns only; this repo does **not** ship a hosted migration orchestrator.

## Shared database (single migration set)

- **One** schema, **`tenant_id`** (or RLS GUC) on tenant-bound tables — see [shared-db-tenant-id.md](shared-db-tenant-id.md).
- **Migrations:** standard **one** linear history (Drizzle Kit, Prisma Migrate, TypeORM migrations, Flyway, etc.) against the shared URL.
- **Idempotency:** use your tool’s native migrations; avoid ad-hoc `CREATE TABLE IF NOT EXISTS` scattered across app startup unless you have a single controlled bootstrap path.
- **Ordering:** never deploy app code that expects a column **before** the migration that adds it has run (same as single-tenant apps).

## N physical databases (per-tenant DSN)

- **Blast radius:** a bad migration can affect **one** tenant DB or **all**, depending how you roll out.
- **Patterns (pick one):**
  1. **Batch script** — iterate tenant keys from config, resolve each DSN (`resolveTenantDatabaseUrl`), run the same migration CLI in a loop with logging / exit codes.
  2. **Template DB** — provision new tenants from a **golden** database snapshot (copy/restore), then run only **delta** migrations for existing tenants.
  3. **External provisioner** — Terraform / k8s job / SaaS that owns DB creation + migrate per tenant.
- **Idempotency:** each run should be safe to retry (migration tools usually record version in DB).
- **Concurrency:** cap parallel migrates to avoid connection exhaustion; serialize per cluster if your provider limits DDL.

CLI integration (`multitenant migrate-all`) is **optional** and not required for Phase 8.8 — **documented `npm run` scripts** that call your ORM’s migrate command with env are enough.

## Schema-per-tenant (same cluster)

- One cluster, **many schemas** — see [schema-per-tenant-postgres.md](schema-per-tenant-postgres.md).
- Migrations often run **once per schema** (loop `SET search_path` / qualified names), or use a tool that supports multi-schema templates.

## See also

- [Per-tenant database URL](per-tenant-database-url.md)
- [Bounded per-tenant DB pools](bounded-tenant-db-pools.md)
- [PLAN Phase 8](../../PLAN.md)
