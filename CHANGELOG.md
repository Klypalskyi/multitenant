# Changelog

All notable changes to this project are documented here. Each `@multitenant/*` package has its own semver in `packages/<name>/package.json`; only packages with `src/` changes get bumped per release (versions may differ across packages between releases).

## [Unreleased]

- _(nothing yet)_

## [2026-03-29] `@multitenant/nest` 0.4.2 — middleware factory + tests

### Added

- **`createMultitenantNestMiddleware(registry, environment?)`** — public factory used by `MultitenantModule`; sets `req.tenant` like before.
- **Vitest:** `packages/nest/src/multitenant-nest.test.ts` — forwarded host, match, null tenant, array `x-forwarded-host`.

### Documentation

- `packages/nest/README.md`, `docs/FRAMEWORKS/nestjs.md`, `docs/INTERNAL/architecture.md`, `PLAN.md` (Phase 6.1).

## [2026-03-29] Docs — React SSR / App Router RSC boundary

### Documentation

- **`docs/FRAMEWORKS/react-ssr.md`** — why `TenantRegistry` is not a serializable RSC prop; shared `tenant-registry` + client `TenantProvider` shell + async `layout`; Pages Router note; links.

_No package `src/` changes — no npm publish._

## [2026-03-29] Docs — tenant-bound sessions + async config bootstrap

### Documentation

- **`docs/INTERNAL/tenant-bound-sessions.md`** — align `EncodedSession` with host resolution; `assertAccess`; header trust; non-`MultitenantError` denial path.
- **`docs/GETTING-STARTED.md`** — async/remote config at bootstrap; sync `createTenantRegistry`.
- **`docs/WHY-MULTITENANT.md`**, **`docs/INDEX.md`**, **`docs/INTERNAL/session-cookies.md`**, **`PLAN.md`**, **`docs/INTERNAL/architecture.md`** — cross-links and Phase 1.2 / 3.4 / 4.2 / 6.4 rows.

_No package `src/` changes — no npm publish._

## [2026-03-29] Examples smoke + Nest DI docs

### Added

- **`examples/config-smoke`** — private workspace; `npm run examples:smoke` validates repo root `tenants.config.json` and host resolution (`us.localhost` → `us-main`).
- **CI:** `.github/workflows/ci.yml` runs `npm run examples:smoke` after tests.

### Documentation

- **`docs/FRAMEWORKS/nestjs.md`** — singleton `TenantRegistry` + `useValue` provider + `MultitenantModuleForRoot`; sample service; guards note.
- **`examples/README.md`**, **`PLAN.md`**, **`docs/INTERNAL/architecture.md`** — dashboard / CI description updates.

_No `@multitenant/*` package `src/` changes — no npm publish._

## [2026-03-29] Docs — examples README, session cookies, Next copy-paste

### Documentation

- **`examples/README.md`** — reference layout for App Router / Pages / Express snippets; how to integrate with `multitenant init` and `multitenant dev`.
- **`docs/INTERNAL/session-cookies.md`** — SameSite, `Domain` vs host-only, `__Host-`, subdomain patterns; links identity helpers.
- **`docs/FRAMEWORKS/next-app-router.md`** — copy-paste **Route Handler**, **Server Action**, and shared `tenant-registry` module.
- **`docs/INDEX.md`**, **`docs/INTERNAL/architecture.md`**, **`PLAN.md`** — cross-links and Phase 4.3 / 5.1 / 6.3 dashboard updates.

_No package `src/` changes — no npm publish._

## [2026-03-29] Sprint D — README + npm metadata + next-pages API

### Changed

- **`@multitenant/next-pages` (0.4.2):** `withTenantApi` returns **404** JSON `{ error, code: 'MULTITENANT_TENANT_NOT_FOUND' }` when host resolution fails; Vitest (`src/with-tenant-api.test.ts`).

### Added

- **`@multitenant/express` (0.4.2):** optional `onMissingTenant: 'throw'` → `next(TenantNotFoundError)`; Vitest (`src/multitenant-express.test.ts`).

### Housekeeping

- **All published workspaces:** `package.json` fields `license` (MIT), `repository` (monorepo + `directory`), `bugs`, `homepage`.
- **Package READMEs:** open-source footer (GitHub, Issues, npm); core/nest/identity/next README corrections; root README copy-paste Next `middleware.ts` + open-source section.
- **Tooling:** CI on Node 22; **`@multitenant/next-app`** middleware integration tests (from earlier in sprint).

## [0.5.2] / coordinated bumps — 2026-03-29

### Added

- **`@multitenant/core` (0.5.0):** `getTenantConfig`, `isTenantFeatureEnabled` for server / non-React parity with `useTenantConfig` / flags.
- **`@multitenant/next-app` (0.5.0):** `@multitenant/next-app/auto` — `createTenantMiddlewareFromConfig`; `@multitenant/next-app/auto-node` — `createNodeTenantMiddlewareFromProjectRoot` (Node middleware: loads default `tenants.config.json` via `@multitenant/config`).
- **`@multitenant/next` (0.5.0, new):** Meta-package re-exporting `core`, `config`, `react`, `next-app` for a single install line.
- **`@multitenant/database` (0.5.0, new):** Node `AsyncLocalStorage` helpers — `runWithTenantScope`, `getTenantScope`, `requireTenantScope` (Phase 8.1 slice).
- **`@multitenant/identity` (0.5.0):** `getSessionFromCookieHeader`, `buildSessionSetCookieHeader` for thin session wiring on top of existing cookie primitives.

### Changed

- **`@multitenant/cli` (0.5.2):** Depends on `@multitenant/core` ^0.5.0.
- **Adapters (patch bumps):** `@multitenant/config`, `react`, `dev-proxy`, `express`, `nest`, `next-pages` — dependency alignment on core ^0.5.0 where applicable.

### Documentation

- `docs/INTERNAL/database-scope.md`, `PLAN.md` dashboard, `docs/RELEASE.md` publish order (database + next).

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
