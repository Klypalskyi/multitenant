# Internal architecture

## Packages

- **core** – Types (`TenantsConfig`, `ResolvedTenant`), `createTenantRegistry`, identity guards. No Node APIs, edge-safe.
- **config** – Load/validate `tenants.config.json` (Zod), cross-field validation. Node-only.
- **identity** – Encrypt/sign session cookie (AES-256-GCM). Node-only. Re-exports core identity types and guards.
- **dev-proxy** – HTTP (+ WS upgrade) proxy server; resolves tenant by Host and injects headers. Node-only.
- **cli** – `multitenant` binary (with deprecated `tenantify` alias): `dev`, `check`, `print`. Uses config + core + dev-proxy; optionally spawns `npm run dev`.
- **react** – `TenantProvider`, hooks. Depends on core.
- **next-app** – Middleware factory, `getTenantFromHeaders`, `requireTenant`. Depends on core.
- **next-pages** – `withTenantGSSP`, `withTenantApi`. Depends on core.
- **express** – Single middleware attaching `req.tenant`. Depends on core.
- **nest** – Dynamic module + middleware + `@Tenant()` decorator. Depends on core.

## Build order

Core → config, identity, dev-proxy → react, next-app, next-pages, express, nest, cli.

## Adding an adapter

1. New package under `packages/<name>`, dependency on `@multitenant/core`.
2. Export a thin wrapper: accept `TenantRegistry` (+ optional `environment`), resolve via `registry.resolveByRequest(req, { environment })`, attach result to framework context (req, locals, etc.).
3. Document in `docs/FRAMEWORKS/overview.md` and add a short framework-specific doc under `docs/FRAMEWORKS/`.
