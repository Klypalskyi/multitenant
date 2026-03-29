# Multitenant Docs

Multi-tenant and multi-market management for TypeScript apps.

## For integrators

- [Why Multitenant / pitfalls](WHY-MULTITENANT.md) – mental model, mermaid flow, when not to use
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
- [Session cookies & cross-domain](INTERNAL/session-cookies.md) – SameSite, `Domain`, `@multitenant/identity` attributes
- [Tenant-bound sessions](INTERNAL/tenant-bound-sessions.md) – `assertAccess` vs host-resolved tenant
- [Release (tag, push, npm)](RELEASE.md) – versioning, git tag, publish order
