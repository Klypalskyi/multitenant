# Multitenant Docs

Multi-tenant and multi-market management for TypeScript apps.

## For integrators

- [Getting started](GETTING-STARTED.md) – install, config, first tenant
- [Configuration reference](CONFIG/tenants-config.md) – `tenants.config.json` schema
- [CLI: init](CLI/init.md) – `multitenant init` (scaffold config + optional framework stubs)
- [CLI: dev / check / print](CLI/tenantify-dev.md) – `multitenant dev`, `check`, `print`
- [Frameworks](FRAMEWORKS/overview.md) – Next.js, React, Express, Nest

## For contributors

- [CODEMAP: CLI](CODEMAPS/cli.md) – `multitenant` command layout
- [Architecture](INTERNAL/architecture.md) – packages, build, adding adapters
- [Errors](INTERNAL/errors.md) – `MultitenantError` classes and codes
- [Database tenant scope (ALS)](INTERNAL/database-scope.md) – `@multitenant/database` for Node request context
- [Release (tag, push, npm)](RELEASE.md) – versioning, git tag, publish order
