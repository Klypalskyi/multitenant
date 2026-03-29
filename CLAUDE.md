# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Multitenant** is a TypeScript monorepo for multi-tenant and multi-market apps. It provides:
- A **config-driven** tenant/market model via `tenants.config.json`
- **Core** resolution engine (`createTenantRegistry`) with typed errors
- **Framework adapters** (React, Next.js App/Pages Router, Express, Nest)
- **CLI** for scaffolding (`multitenant init`), local development (`multitenant dev`), validation, and printing config
- **Identity** layer with encrypted session cookies (AES-256-GCM)

## Monorepo Structure

**Examples:** `examples/` — runnable **`express-minimal`**, **`next-minimal`**, **`config-smoke`** (see `examples/README.md`); copy-paste refs under `next-app-router`, etc.

```
packages/
├── core/           # Types, TenantRegistry, typed errors, identity guards, getTenantConfig (merged market/tenant/env config)
├── config/         # Load/validate tenants.config.json (Zod + cross-field checks)
├── database/       # Node ALS tenant scope (runWithTenantScope); pool cache; no bundled driver
├── drizzle/        # Reference: Drizzle + pg wired to database package (Phase 8.7)
├── kysely/         # Reference: Kysely + pg wired to database package (Phase 8.7)
├── typeorm/        # Reference: TypeORM DataSource (Postgres) + database cache (Phase 8.7)
├── prisma/         # Reference: Prisma Client + database cache / per-tenant DSN (Phase 8.7)
├── identity/       # Cookie encryption/decryption, session header helpers, re-exports identity types
├── dev-proxy/      # HTTP proxy + WebSocket upgrade, tenant-by-host resolution
├── cli/            # multitenant binary: init, check, print, dev (proxy mode)
├── react/          # TenantProvider, hooks (useTenant, useMarket, etc.)
├── next-app/       # App Router middleware, getTenantFromHeaders; subpaths /auto, /auto-node
├── next/           # Meta-package: core + config + react + next-app
├── next-paages/    # Next.js Pages Router: withTenantGSSP, withTenantApi (folder name is a typo)
├── express/        # Express middleware: multitenantExpress() → req.tenant
└── nest/           # Nest module, @Tenant() decorator, middleware
```

Each package builds with **tsup** to CJS, ESM, and `.d.ts` files.

## Core Architecture

1. **Config** (`@multitenant/config`): Load and validate `tenants.config.json` (Zod schema). Defines `markets` (locales, currency, timezone) and `tenants` (per-environment domain → tenant mapping). Throws `InvalidTenantsConfigError` with detailed validation messages.

2. **Registry** (`@multitenant/core`): `createTenantRegistry(config?, options?)` returns a `TenantRegistry` with resolution methods:
   - `resolveByHost(hostname)` → `ResolvedTenant | null`
   - `resolveByRequest(req, { environment })` → `ResolvedTenant | null`
   - Optional auto-load of `tenants.config.json` in Node (edge-safe when config is passed explicitly)
   - Optional `debug: true` (console.debug logs) or custom `log` function for resolution events

3. **Errors** (`@multitenant/core`): Typed error hierarchy (`MultitenantError` base class):
   - `InvalidTenantsConfigError` – config validation or I/O failure
   - `DomainResolutionError` – host doesn't match any tenant domain
   - `TenantNotFoundError` – tenant key not in registry
   - Use `isMultitenantError(err)` to check; all are `instanceof Error` for compatibility

4. **Adapters**: Each framework adapter wraps the registry, resolves tenant from request, and attaches to framework context (headers, req.tenant, React context, etc.). All accept optional `environment` parameter (defaults based on process/runtime).

## Build & Development

```bash
# Install and build
npm install
npm run build                           # Build all packages in dependency order
npm run build -w @multitenant/core    # Build single package
npm run typecheck                       # tsc -b (cross-package type checking)
npm run clean                           # rm -rf node_modules packages/*/dist

# Testing
npm test                                # Run all tests (turbo run test)
npm test -w @multitenant/core          # Test single package
npm run test -- --watch                # Watch mode (from repo root)

# Local dev (when examples/test apps are configured)
npm run dev                             # turbo dev (if configured)
```

Tests use **Vitest** (configured per package via `vitest.config.ts` or default). Test files follow `src/**/*.test.ts` pattern. Turbo task config: tests depend on `^build` (transitive package builds).

## Key Patterns

### Registry with debugging
```ts
const registry = createTenantRegistry(config, {
  debug: true,  // logs all resolution attempts
  log: (msg, ...args) => logger.info(msg, ...args),  // custom logger
});
```

### Error handling
```ts
import { isMultitenantError, TenantNotFoundError } from '@multitenant/core';

try {
  const tenant = registry.resolveByHost(hostname);
  if (!tenant) throw new TenantNotFoundError('...');
} catch (err) {
  if (isMultitenantError(err)) {
    console.error(`Multitenant error (${err.code}): ${err.message}`);
  } else {
    throw err;
  }
}
```

### Next.js App Router
```ts
// middleware.ts
export const middleware = createTenantMiddleware(registry, {
  environment: process.env.MULTITENANT_ENV ?? 'local',
  onMissingTenant: 'warn',  // 'passthrough' (default) | 'warn' | 'throw'
});

// In server components
const tenant = getTenantFromHeaders(headers(), registry);
// or to require tenant:
const tenant = requireTenant(headers(), registry);  // throws TenantNotFoundError
```

## Common Tasks

- **Add framework adapter**: Create `packages/<name>/` with `src/index.ts` exporting a middleware/provider. Depends on `@multitenant/core`. Document in `docs/FRAMEWORKS/` and update `docs/FRAMEWORKS/overview.md`.
- **Add typed error**: Add class to `packages/core/src/errors.ts`, extend `MultitenantError`, define stable `code`. Export from `packages/core/src/index.ts`.
- **Update version**: Only bump `packages/<name>/package.json` if `packages/<name>/src/` changed. Use `git diff main --name-only | grep 'packages/.*/src/'` to identify modified packages. See versioning strategy below.
- **Publish**: `npm run release:publish` (builds + runs `scripts/publish-packages.sh`). Publishes **in dependency order** for modified packages only. See `docs/RELEASE.md` for full details.

## Versioning Strategy

**Required bumps:** only `packages/<name>/package.json` where `packages/<name>/src/` changed (never the root `package.json`). When the CLI package ships, also bump `packages/cli/src/cli.ts` `.version(...)` to match that package’s version. Per-package semver can **diverge** across the repo until each package ships again; **only publish** workspaces whose version you bumped (dependency semver ranges pick up published deps — you do **not** republish dependents solely because a dependency updated).

### Identify changed packages

```bash
# Show which src/ directories changed
git diff main --name-only | grep 'packages/.*/src/'

# Example:
# packages/core/src/errors.ts
# packages/core/src/index.ts
# → Bump @multitenant/core’s package.json only
```

### Version bump rules

1. Only bump `packages/<name>/package.json` version if `packages/<name>/src/` has changes
2. Do NOT bump version if only docs, tests (`.test.ts`), or config files changed
3. Bump a dependent’s `package.json` only when **that** package’s `src/` changed — not automatically when a dependency updates
4. Update `CHANGELOG.md` with all changes grouped by package
5. When tagging, use the release version (e.g., `v0.5.0`) — typically the new semver used for every **bumped** package in that release

### Example

**If only `packages/express/src/` changed:**
- Bump `packages/express/package.json` to `0.5.0`
- Keep `packages/core/package.json` at `0.4.0`
- Keep all other packages at their current versions
- Tag as `v0.5.0` (release tag matches the new shipped version(s))
- Publish only `@multitenant/express` (not core unless core’s `src/` also changed)

**If `packages/core/src/` and `packages/react/src/` changed:**
- Bump both `packages/core/package.json` and `packages/react/package.json` to `0.5.0`
- Keep others at `0.4.0`
- Tag as `v0.5.0`
- Publish both in dependency order: core first, then react

## Documentation

- `docs/INDEX.md` – entry point
- `docs/GETTING-STARTED.md` – quick start for integrators
- `docs/CONFIG/tenants-config.md` – `tenants.config.json` schema reference
- `docs/FRAMEWORKS/overview.md` – list of adapters
- `docs/INTERNAL/architecture.md` – package layout and adapter development
- `docs/INTERNAL/errors.md` – error codes and recovery strategies
- `docs/RELEASE.md` – versioning, publishing, and auth setup

## Package Dependencies

- **core**: no runtime deps (pure resolution logic)
- **config**: `zod`, `@multitenant/core`
- **identity**: `@multitenant/core` (Node-only, AES-256-GCM encryption)
- **dev-proxy**: `http-proxy`, `@multitenant/core` (Node-only)
- **cli**: `commander`, `chokidar`, `@multitenant/config`, `@multitenant/core`, `@multitenant/dev-proxy`
- **database**: `@multitenant/core` (Node-only ALS + DB helpers)
- **drizzle**: `@multitenant/core`, `@multitenant/database` (peers: `drizzle-orm`, `pg`)
- **kysely**: `@multitenant/core`, `@multitenant/database` (peers: `kysely`, `pg`)
- **typeorm**: `@multitenant/core`, `@multitenant/database` (peer: `typeorm`)
- **prisma**: `@multitenant/core`, `@multitenant/database` (peer: `@prisma/client`)
- **react**: `@multitenant/core` (peer: `react`)
- **next-app**: `@multitenant/core`, `@multitenant/config` (peer: `next`) — config used by `auto-node`
- **next**: `@multitenant/core`, `@multitenant/config`, `@multitenant/react`, `@multitenant/next-app` (peers: `next`, `react`)
- **next-paages**: `@multitenant/core` (peer: `next`) — note: folder is `next-paages`, npm package is `next-pages`
- **express**: `@multitenant/core` (peer: `express`)
- **nest**: `@multitenant/core` (peer: `@nestjs/common`, `@nestjs/core`)
