# Internal architecture

## Packages

- **core** – Types (`TenantsConfig`, `ResolvedTenant`), `createTenantRegistry`, typed errors (`MultitenantError`, `InvalidTenantsConfigError`, …), identity guards. Pure resolution is edge-safe when you pass a loaded config; **optional** Node auto-load of `tenants.config.json` uses `fs` (see `createTenantRegistry` options).
- **config** – Load/validate `tenants.config.json` (Zod), cross-field validation. Node-only.
- **identity** – Encrypt/sign session cookie (AES-256-GCM). Node-only. Re-exports core identity types and guards. See `docs/INTERNAL/session-cookies.md` (cookie attributes) and `docs/INTERNAL/tenant-bound-sessions.md` (session vs host-resolved tenant).
- **dev-proxy** – HTTP (+ WS upgrade) proxy server; resolves tenant by Host and injects headers. Node-only.
- **cli** – `multitenant` binary (with deprecated `tenantify` alias): `init`, `dev`, `check`, `print`. Uses config + core + dev-proxy; `dev` optionally spawns `npm run dev`. See `docs/CLI/init.md`, `docs/CLI/tenantify-dev.md`.
- **database** – Node-only ALS + shared-DB + Postgres naming + RLS `SET LOCAL` builders + **`resolveTenantDatabaseUrl`** + **`BoundedTenantDbResourceCache`** (per-tenant DSN + bounded pool cache). Depends on core. See `docs/INTERNAL/database-scope.md`, `docs/INTERNAL/shared-db-tenant-id.md`, `docs/INTERNAL/schema-per-tenant-postgres.md`, `docs/INTERNAL/postgres-rls-tenant.md`, `docs/INTERNAL/per-tenant-database-url.md`, `docs/INTERNAL/bounded-tenant-db-pools.md`.
- **drizzle** – Reference adapter: Drizzle ORM + `pg` wired to **`@multitenant/database`** (Phase 8.7). Peers: `drizzle-orm`, `pg`. See `docs/INTERNAL/drizzle-postgres.md`.
- **prisma** – Reference adapter: Prisma Client construction + **`BoundedTenantDbResourceCache`** (Phase 8.7). Peer: `@prisma/client`. See `docs/INTERNAL/prisma-postgres.md`.
- **react** – `TenantProvider`, hooks. Depends on core.
- **next-app** – Middleware factory, `getTenantFromHeaders`, `requireTenant`. Depends on core; `auto-node` subpath uses `@multitenant/config`.
- **next** – Meta-package re-exporting core, config, react, next-app (single install line).
- **next-pages** – `withTenantGSSP`, `withTenantApi`. Depends on core.
- **express** – Single middleware attaching `req.tenant`. Depends on core.
- **nest** – Dynamic module + middleware + `@Tenant()` decorator. Depends on core.

## Build order

Core → config, database, drizzle, prisma, identity, dev-proxy → react, next-app, next, next-pages, express, nest, cli.

## Adding an adapter

1. New package under `packages/<name>`, dependency on `@multitenant/core`.
2. Export a thin wrapper: accept `TenantRegistry` (+ optional `environment`), resolve via `registry.resolveByRequest(req, { environment })`, attach result to framework context (req, locals, etc.).
3. Document in `docs/FRAMEWORKS/overview.md` and add a short framework-specific doc under `docs/FRAMEWORKS/`.

## npm metadata

Published workspaces include **`license`**, **`repository`** (monorepo URL + `directory`), **`bugs`**, and **`homepage`** pointing at the package folder on GitHub so npmjs.com links back to the open-source repo.

## Versioning

**Bump only what changed:** `packages/<name>/package.json` **only if** `packages/<name>/src/` changed. Unchanged packages keep their previous semver until they next ship — versions **may differ across packages** (e.g. core `0.4.0`, express `0.5.0`). The root `package.json` is not versioned for npm.

### Rules

- Bump `packages/<name>/package.json` **only if** `packages/<name>/src/` changed (not root `package.json`)
- Test files (`.test.ts`), docs, and config do **not** trigger version bumps
- Use `git diff main --name-only | grep 'packages/.*/src/'` to identify which packages changed
- Packages **released in one git tag** use the **same new semver** for each bumped package (e.g. all go to `0.5.0`), not mixed patch levels in one release
- Publish in **dependency order** (core → config, identity, dev-proxy → adapters, cli); `scripts/publish-packages.sh` skips workspaces already at the published version
- Do not republish a package just because a dependency updated — consumers resolve semver ranges; republish when **that** package’s `src/` changed

See `docs/RELEASE.md` for detailed release instructions.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, `npm run build`, `npm test`, and **`npm run examples:smoke`** (`examples/config-smoke` against the repo root `tenants.config.json`) on pushes and pull requests to `master` / `main` (Node 22).

Workspace packages with tests today: `core`, `config`, `cli`, `database`, `drizzle`, `prisma`, `identity`, `next-app`, `next-pages`, `express`, `nest`, `react`.
