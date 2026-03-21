# Changelog

All notable changes to this project are documented here. Monorepo packages share the same version number.

## [0.3.0] - 2026-03-20

### Added

- **Markets: multiple locales** — optional `locales` on `MarketDefinition`; Zod validates duplicates and that `locale` is included when `locales` is set. `NormalizedMarket.locales` is always a deduped list (default `locale` first).
- **`@multitenant/core`:** `createTenantRegistry(config?, options?)` — optional config auto-loads `<cwd>/tenants.config.json` in Node using static `node:fs` imports (Turbopack-safe; no dynamic `require`).
- **`@multitenant/next-app`:** `onMissingTenant?: 'passthrough' | 'warn' | 'throw'` on `createTenantMiddleware`; tenant headers forwarded on **request** headers; `x-forwarded-host` comma-list normalization.

### Changed

- **Breaking (middleware):** default for unresolved tenant is `passthrough` instead of throw; use `onMissingTenant: 'throw'` for previous strict behavior.

### Fixed

- Next.js / Turbopack: avoid dynamic `require('node:fs')` in registry auto-load path.

---

## [0.2.0] - earlier

Initial published line (see git history for details).

[0.3.0]: https://github.com/klypalskyi/multitenant/compare/v0.2.0...v0.3.0
