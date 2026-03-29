# Changelog

All notable changes to this project are documented here. Each `@multitenant/*` package has its own semver in `packages/<name>/package.json`; only packages with `src/` changes get bumped per release (versions may differ across packages between releases).

## [0.5.1] - 2026-03-29

### Added

- **`@multitenant/cli`:** Vitest tests and `npm run test:coverage` for `init` (`buildMinimalTenantsConfig`, `runInit`, framework stubs, overwrite prompts). Optional `confirmOverwrite` on `InitOptions` for programmatic/tests.

### Changed

- **`@multitenant/cli`:** `InitAbortedError` when init overwrite is declined; CLI command catches and exits with code 1 (replaces `process.exit` inside `runInit`).

## [0.5.0] - 2026-03-29

### Added

- **`@multitenant/cli`:** `multitenant init` — writes a minimal valid `tenants.config.json` and optional framework stubs (`--framework next-app` \| `next-pages` \| `express`). `--force` / interactive overwrite rules for existing files.

### Documentation

- `docs/CLI/init.md`, `docs/GETTING-STARTED.md`, `docs/INDEX.md`, `packages/cli/README.md` — init flow and options.

## [0.4.0] - 2026-03-21

### Added

- **`@multitenant/core`:** `MultitenantError` base class with stable `code`; `InvalidTenantsConfigError`, `DomainResolutionError`, `TenantNotFoundError`; `isMultitenantError()`.
- **`createTenantRegistry` options:** `debug?: boolean` (logs via `console.debug`); `log?: (message, ...args) => void` for custom resolution logging.
- **Unit tests:** Vitest in `@multitenant/core` and `@multitenant/config`; root `npm test` runs `turbo run test` (tests depend on `^build`).

### Changed

- **`@multitenant/config`:** `validateTenantsConfig` / `loadTenantsConfig` throw `InvalidTenantsConfigError` instead of generic `Error` for validation and I/O failures.
- **`@multitenant/core`:** Registry resolution failures use typed errors (`DomainResolutionError`, `TenantNotFoundError`); auto-load failures use `InvalidTenantsConfigError` with `cause`.
- **`@multitenant/next-app`:** `requireTenant` and middleware `onMissingTenant: 'throw'` throw `TenantNotFoundError` (still `instanceof Error`).

### Documentation

- `docs/INTERNAL/errors.md` — error reference; `docs/INDEX.md` + `docs/CONFIG/tenants-config.md` + `docs/INTERNAL/architecture.md` updated.

---

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

[0.4.0]: https://github.com/klypalskyi/multitenant/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/klypalskyi/multitenant/compare/v0.2.0...v0.3.0
