# Multitenant Docs

Multi-tenant and multi-market management for TypeScript apps.

## For integrators

- [Marketing / docs site (Nextra)](../apps/site/README.md) – `npm run site:dev`; deploy via Vercel (**Root Directory:** `apps/site`) or `.github/workflows/deploy-site.yml`
- [Examples (runnable + reference)](../examples/README.md) – `express-minimal`, `next-minimal`, `config-smoke`
- [Why Multitenant / pitfalls](WHY-MULTITENANT.md) – mental model, resolution + Next middleware mermaid, when not to use
- [Getting started](GETTING-STARTED.md) – install, config, first tenant
- [Configuration reference](CONFIG/tenants-config.md) – `tenants.config.json` schema
- [CLI: init](CLI/init.md) – `multitenant init` (scaffold config + optional framework stubs)
- [CLI: dev / check / print](CLI/tenantify-dev.md) – `multitenant dev`, `check`, `print`
- [Frameworks](FRAMEWORKS/overview.md) – Next.js, React, Express, Nest
- [Next.js App Router checklist](FRAMEWORKS/next-app-router.md) – Edge vs Node, middleware, Server Actions
- [Express](FRAMEWORKS/express.md) – `multitenantExpress`, `onMissingTenant`, typings
- [NestJS](FRAMEWORKS/nestjs.md) – module, `@Tenant()`, null tenant
- [React SSR / RSC](FRAMEWORKS/react-ssr.md) – `TenantProvider`, serializable `ResolvedTenant` vs registry, then Next.js examples

## For contributors

- [CODEMAP: CLI](CODEMAPS/cli.md) – `multitenant` command layout
- [Architecture](INTERNAL/architecture.md) – packages, build, adding adapters
- [Errors](INTERNAL/errors.md) – `MultitenantError` classes and codes
- [Database tenant scope (ALS)](INTERNAL/database-scope.md) – `@multitenant/database` for Node request context
- [Shared DB `tenant_id` helpers](INTERNAL/shared-db-tenant-id.md) – `assignTenantIdForWrite` / `assertRowTenantColumn` (Phase 8.2)
- [Schema-per-tenant Postgres](INTERNAL/schema-per-tenant-postgres.md) – `schemaNameForTenant`, `search_path`, pooling (Phase 8.4)
- [Postgres RLS tenant GUC](INTERNAL/postgres-rls-tenant.md) – `SET LOCAL`, policies, poolers (Phase 8.3)
- [Per-tenant database URL](INTERNAL/per-tenant-database-url.md) – `tenants[].database.envVar`, `resolveTenantDatabaseUrl` (Phase 8.5)
- [Bounded per-tenant DB pools](INTERNAL/bounded-tenant-db-pools.md) – LRU-capped cache, `getOrCreateTenantDatabaseResource` (Phase 8.6)
- [Drizzle + Postgres reference](INTERNAL/drizzle-postgres.md) – `@multitenant/drizzle`, shared vs per-tenant DSN (Phase 8.7)
- [Kysely + Postgres reference](INTERNAL/kysely-postgres.md) – `@multitenant/kysely` (Phase 8.7)
- [TypeORM + Postgres reference](INTERNAL/typeorm-postgres.md) – `@multitenant/typeorm` (Phase 8.7)
- [Prisma + Postgres reference](INTERNAL/prisma-postgres.md) – `@multitenant/prisma` (Phase 8.7)
- [Database migrations (multi-tenant)](INTERNAL/database-migrations-multitenant.md) – shared DB vs N DBs (Phase 8.8)
- [Session cookies & cross-domain](INTERNAL/session-cookies.md) – SameSite, `Domain`, `@multitenant/identity` attributes
- [Tenant-bound sessions](INTERNAL/tenant-bound-sessions.md) – `assertAccess` vs host-resolved tenant
- [Release (tag, push, npm)](RELEASE.md) – versioning, git tag, publish order
