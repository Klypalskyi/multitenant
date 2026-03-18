# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Multitenant** (formerly Tenantify) is a TypeScript monorepo for multi-tenant and multi-market apps. It provides:
- A **config-driven** tenant/market model via `tenants.config.json`
- **Core** resolution (tenant registry, identity guards)
- **Framework adapters**: React, Next.js App Router, Next.js Pages Router, Express, Nest
-- **CLI**: `multitenant dev` (local proxy with per-tenant subdomains), `multitenant check`, `multitenant print` (deprecated alias: `tenantify`)
- **Identity**: encrypted session cookie encode/decode and access guards

## Monorepo Structure

```
packages/
├── core/           # @multitenant/core – TenantsConfig, createTenantRegistry, ResolvedTenant, identity guards
├── config/         # @multitenant/config – load/validate tenants.config.json (Zod)
├── identity/       # @multitenant/identity – session cookie encode/decode (AES-256-GCM), re-exports guards
├── dev-proxy/      # @multitenant/dev-proxy – HTTP proxy for tenant-by-host resolution
├── cli/            # @multitenant/cli – multitenant dev | check | print (tenantify alias)
├── react/          # @multitenant/react – TenantProvider, useTenant, useMarket, useTenantFlag, useExperiment, etc.
├── next-app/       # @multitenant/next-app – createTenantMiddleware, getTenantFromHeaders, requireTenant
├── next-pages/     # @multitenant/next-pages – withTenantGSSP, withTenantApi
├── express/        # @multitenant/express – multitenantExpress() → req.tenant
└── nest/           # @multitenant/nest – MultitenantModuleForRoot(), @Tenant() decorator
```

Each package builds with **tsup** (CJS, ESM, `.d.ts`).

## Key Concepts

1. **Config**: `tenants.config.json` at repo root defines `markets`, `tenants`, and per-environment `domains` (host pattern → tenant). Validated by `@multitenant/config` with hard errors on overlap or invalid refs.

2. **Registry**: `createTenantRegistry(config)` returns a `TenantRegistry` with `resolveByHost(hostname)` and `resolveByRequest(req)` returning `ResolvedTenant | null`.

3. **Adapters**: All adapters take a `TenantRegistry` (and optional `environment`). They resolve from the request and attach the result to framework context (headers, req.tenant, context, etc.).

4. **Identity**: Core defines `Identity`, `EncodedSession`, `canAccessTenant`, `assertAccess`. `@multitenant/identity` adds `encodeSessionToCookie` / `decodeSessionFromCookie` (Node, AES-256-GCM).

## Build Commands

```bash
npm run build                    # Build all packages in dependency order
npm run build -w @multitenant/core # Build a single package
npm run typecheck                # tsc -b
npm run clean                    # rm -rf node_modules packages/*/dist
```

## Usage (concise)

- **Load config**: `import { loadTenantsConfig } from '@multitenant/config'; const config = await loadTenantsConfig({ cwd });`
- **Create registry**: `import { createTenantRegistry } from '@multitenant/core'; const registry = createTenantRegistry(config);`
- **Next App Router**: `createTenantMiddleware(registry, { environment })` in `middleware.ts`; in handlers use `getTenantFromHeaders(headers, registry)` or `requireTenant(headers, registry)`.
- **React**: `<TenantProvider registry={registry} tenant={resolvedTenant}>` then `useTenant()`, `useMarket()`, etc.
- **Express**: `app.use(multitenantExpress({ registry, environment }));` then `req.tenant`.
- **Nest**: `imports: [MultitenantModuleForRoot({ registry, environment })]`, then `@Tenant()` in controllers.
- **CLI**: `npx multitenant check`, `npx multitenant print`, `npx multitenant dev --target http://localhost:3000 --port 3100` (optional `--run-dev`; alias: `tenantify`).

## Docs

- `docs/INDEX.md` – entry point
- `docs/GETTING-STARTED.md` – quick start
- `docs/CONFIG/tenants-config.md` – schema reference
- `docs/CLI/tenantify-dev.md` – dev proxy CLI
- `docs/FRAMEWORKS/overview.md` – adapter list
- `docs/INTERNAL/architecture.md` – package layout and adding adapters

## Error Handling

- **Throw early**: Missing tenant in middleware/server → throw. Use `requireTenant` / `assertAccess` when access is required.
- Config validation throws with a clear message (and list of issues for Zod).

## Dependencies

- **core**: no runtime deps
- **config**: zod, @multitenant/core
- **identity**: @multitenant/core
- **dev-proxy**: http-proxy, @multitenant/core
- **cli**: commander, chokidar, @multitenant/config, @multitenant/core, @multitenant/dev-proxy
- **react**: @multitenant/core (peer: react)
- **next-app**: @multitenant/core (peer: next)
- **next-pages**: @multitenant/core (peer: next)
- **express**: @multitenant/core (peer: express)
- **nest**: @multitenant/core (peer: @nestjs/common, @nestjs/core)
