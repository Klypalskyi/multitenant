# Changelog

All notable changes to this project are documented here. Each `@multitenant/*` package has its own semver in `packages/<name>/package.json`; only packages with `src/` changes get bumped per release (versions may differ across packages between releases).

## [Unreleased]

### Added

- **`@multitenant/contentful`** — Contentful SDK wrapper with build-time caching. Wraps SDK methods (getEntries, getEntry, getAsset, etc.) with transparent, three-layer cache: (1) inflight Promise dedup (concurrent callers share one API request), (2) filesystem persistence (`.next/.build-cache/locales/{locale}/{hash}.json`), (3) real SDK call. Framework-agnostic build-phase detection (`isBuildPhase` injectable). Includes `getCacheStats()`, `resetCacheStats()`, debug logging, and structured log events. Two public factories: `createCachedContentfulClient(sdkClient, options)` (direct wrapping) and `createTenantContentfulClient(registry, tenantKey, sdkConfig, options?)` (TenantRegistry integration).
- **`@multitenant/next-app`** — build-time request cache: `cachedFetch` and `createTenantCachedFetch` for multi-locale builds. Reduces redundant API calls to CMS/data services during `next build` by caching responses at `.next/.build-cache/locales/<locale>/<hash>.json`. Includes `getCacheStats()` and `resetCacheStats()` for observability. Zero overhead outside `next build`.
- **`@multitenant/cli`** — cache commands: `multitenant cache --stats` (view cache entries per locale) and `multitenant cache --locale [locale]` (invalidate cache for specific locales or `all`).
- **`docs/CONTENTFUL.md`** — comprehensive Contentful caching guide: problem statement (race condition, no persistence, request-scoped cache), architecture (three-layer cache), API reference, framework-agnostic build detection, cache key format, CLI integration, migration example, and verification.
- **`apps/site/content/docs/guide/contentful-cache.mdx`** — site guide: when to use Contentful caching, quick start, TenantRegistry integration, framework-specific build detection, observability, real-world example, performance impact.
- **`docs/BUILD-TIME-CACHE.md`** — comprehensive guide: problem statement, design decisions, API reference (cachedFetch, createTenantCachedFetch, CLI), examples, performance notes, and invalidation strategies.

## [2026-03-30] v0.6.20 — `@multitenant/dev-proxy` 0.4.2 + site docs

### Fixed

- **`@multitenant/dev-proxy`** — tenant resolution tries **`Host` before `x-forwarded-host`**, then sets **`x-forwarded-host`** on the upstream request so a stale **`x-forwarded-host`** (e.g. `localhost`) cannot override **`us.localhost`**. WebSocket upgrades apply the same check; **`xfwd: true`** on proxy; error-page example hosts use **`domains.<env>`** patterns when available.

### Changed

- **`@multitenant/cli`** — init success output references **`npx @multitenant/cli check`** (npm package is **`@multitenant/cli`**, not **`multitenant`**); depends on **`@multitenant/dev-proxy` ^0.4.2**.
- **`apps/site`** — docs and README use **`npx @multitenant/cli`** for copy-paste commands; **Mermaid** diagrams render via **`remarkMdxMermaid`** + a **`Mermaid`** MDX component (**`mermaid`** + **`next-themes`**).
- **`apps/site`** — **Frameworks** section removed: adapter overview lives on **`/docs`** (home); Next/Express/Nest/React guides merged into **`content/docs/packages/*`**. Legacy **`/docs/frameworks/*`** URLs redirect. Sidebar **Tooling** is **CLI** only.
- **`apps/site`** — **Nextra** replaced by **Fumadocs** (`fumadocs-mdx`, `fumadocs-ui`, Tailwind 4). MDX source is **`content/docs/`** with **`meta.json`** sidebars; routes are **`/`** (landing) and **`/docs/*`**. **`@vercel/analytics`** retained.

### Added

- **`apps/site`** — full **integrator** documentation in MDX (not link-only): why / getting started / config / packages (incl. adapter guides) / errors / examples / CLI; **`docs-structure.test.ts`** (Vitest).

### Removed

- **`.github/workflows/deploy-site.yml`** — site deploy is handled by **Vercel** Git integration only (see **`apps/site/vercel.json`**).

## [2026-03-29] Docs site (`apps/site`) + CI (Vercel, npm)

### Added

- **`apps/site`** — **Nextra 4** + **`nextra-theme-docs`** marketing / docs shell (aligned with [shuding/nextra-docs-template](https://github.com/shuding/nextra-docs-template) stack: Next.js + docs theme); App Router + **`app/_meta.global.js`**, `npm run site:dev` from root.
- **`.github/workflows/deploy-site.yml`** — optional Vercel deploy (**`amondnet/vercel-action`**); **`apps/site/vercel.json`** sets monorepo install/build from repo root.
- **`.github/workflows/publish-npm.yml`** — publish **`@multitenant/*`** on **`v*`** tags or manual run (**`NPM_TOKEN`**).

### Changed

- **Root `package.json`** — **`apps/*`** workspaces; **`react` / `react-dom`** **overrides** @ **19.2.4** for a single tree with **`@multitenant/site`**; root **devDependencies** **`nextra`** + **`nextra-theme-docs`** for consistent hoisting; script **`site:dev`**.
- **`packages/react`** — devDependency **`@testing-library/react`** **^16** + **React 19**-aligned type/dev packages for workspace overrides.
- **`turbo.json`** — **`build`** outputs include **`.next/**`** (site).

### Documentation

- **`docs/RELEASE.md`**, **`PLAN.md`**, **`README.md`**, **`docs/INDEX.md`**, **`CLAUDE.md`**, **`apps/site/README.md`**.

## [2026-03-29] Phase 2 — DX closure (PLAN + dashboard)

### Documentation

- **`PLAN.md`** — Phase **2** **Done** (no partial); **2.4** base vs TTY stretch (**Appendix A** item 10); **Sprint B** + success criterion **2** aligned; **Identity** dashboard row (**`@multitenant/identity` v0.5.1** session helpers). Tag **v0.6.19** (docs-only).

## [2026-03-29] Phase 3.2 / Phase 3 — feature flags documented (`flags` only)

### Documentation

- **`docs/CONFIG/tenants-config.md`** — **Feature flags (`flags`)**: **`isTenantFeatureEnabled`**, **`useTenantFlag`**, no separate **`features`** field; CMS → map into **`flags`**.
- **`PLAN.md`** — Phase **3** **Done** for listed tasks; **3.2** **Done**; Sprint **C**; **Last reviewed** (tag **v0.6.18**).

## [2026-03-29] `@multitenant/identity` 0.5.1 — Phase 4 complete (`CookieConfig.domain`)

### Added

- **`CookieConfig.domain`** — **`buildSessionSetCookieHeader`** emits **`Domain=`** when set; throws if combined with **`__Host-`** **`cookieName`**.
- Tests in **`src/session.test.ts`**.

### Documentation

- **`docs/INTERNAL/session-cookies.md`**, **`packages/identity/README.md`**, **`PLAN.md`** (Phase **4** **Done** for **4.1–4.3**; dashboard; Sprint **C**).

## [2026-03-29] Phase 3.4 — async config bootstrap docs

### Documentation

- **`docs/GETTING-STARTED.md`** — **`loadTenantsConfig`** + **`createTenantRegistry`**; remote **`fetch`** + **`validateTenantsConfig`**; refresh explicitly **out of scope**; Next / Edge caveat.
- **`PLAN.md`** — Phase **3.4** **Done**; **Last reviewed**; Sprint **C**.

## [2026-03-29] `@multitenant/database` 0.5.6 — Phase 8.1 ResolvedTenant in ALS scope

### Added

- **`getResolvedTenantFromScope()`** — returns **`TenantScopeState.resolved`** if set.
- **`requireResolvedTenantFromScope()`** — throws when scope or **`resolved`** is missing (for code paths that need full **`ResolvedTenant`**).

### Documentation

- **`docs/INTERNAL/database-scope.md`**, **`packages/database/README.md`**, **`PLAN.md`** (8.1 **Done**, dashboard **database** version, Sprint **E**); **`CHANGELOG.md`**.

## [2026-03-29] Phase 1.1 — Error taxonomy closed (Next Pages GSSP tests + docs)

### Added

- **`@multitenant/next-pages`** — **`src/with-tenant-gssp.test.ts`** — **`withTenantGSSP`** returns **`{ notFound: true }`** when host unresolved; happy path + **`x-forwarded-host`**.

### Documentation

- **`PLAN.md`** — Phase **1** task table **1.1** **Done**; Phase **1** checklist complete for listed scope; **Last reviewed**; Sprint **D** next-pages tests bullet.
- **`docs/INTERNAL/errors.md`** — Next Pages table: **`withTenantApi`** vs **`withTenantGSSP`** outcomes.
- **`packages/next-pages/README.md`** — GSSP **`notFound`** behavior.
- **`docs/INTERNAL/architecture.md`** — list **GSSP** test file.

## [2026-03-29] Phase 6.2 — Integration tests (next-app + express package)

### Added

- **`@multitenant/next-app`** — expanded **`src/middleware.integration.test.ts`**: **`x-forwarded-host`** (first list entry), **`onMissingTenant: 'warn'`** (once per host), custom middleware header names, **`x-middleware-request-*`** flags JSON; **`getTenantFromHeaders`** / **`requireTenant`** (**`x-forwarded-host`**, happy **`requireTenant`**).
- **`@multitenant/express`** — **`src/express.integration.test.ts`** — **supertest** against real **`express()`**: resolved tenant on **`req.tenant`**, **`X-Forwarded-Host`**, null tenant, **`onMissingTenant: 'throw'`** + **`TenantNotFoundError`** error handler (**devDependencies:** **`express`**, **`supertest`**, **`@types/supertest`**).

### Documentation

- **`PLAN.md`** — Phase **6.2** **Done**; dashboard + Sprint D + success criteria **#3**.

## [2026-03-29] Phase 6.1 — Vitest coverage gates (monorepo)

### Added

- Root **`npm run test:coverage`** (`turbo run test:coverage`); **`configs/vitest-coverage-base.ts`** — shared v8 **`thresholds`** + **`exclude`**; per-package **`test:coverage`** scripts.
- **`package.json`** **`overrides`** — **`vitest`** + **`@vitest/coverage-v8`** @ **3.2.4** (aligned tooling).
- **CI** — **`Test coverage (thresholds)`** after **`npm test`** (`.github/workflows/ci.yml`).

### Changed

- **`@multitenant/next-app`** — **`test`** / **`test:coverage`** invoke **repo-root** `vitest` (no direct **`vitest`** devDependency — avoids nested Vitest 4 vs **`@vitest/coverage-v8`** 3 mismatch).
- **`packages/cli`** — drop duplicate **`@vitest/coverage-v8`** (use root).
- Per-package **`vitest.config.ts`** — merge shared coverage; overrides for **core**, **config**, **database**, **identity**, **react**, **nest**, **next-app**, **next-pages**, **prisma** where needed.

### Documentation

- **`PLAN.md`** — Phase **6.1** **Done**; dashboard + Sprint D + success criteria **#3**.

## [2026-03-29] Phase 7.1 — README hero complete

### Documentation

- **`README.md`** — one-line value prop; **`@multitenant/core`** npm badge; **Quick links** row; **`TenantsConfig`** in copy-paste middleware; **App Router `layout.tsx`**: `await headers()`, **`requireTenant`**, **`TenantProvider`** + `environment`; link to **react-ssr** checklist.
- **`PLAN.md`** — **7.1** **Done**; **7.2** framed as ongoing brand convention; last reviewed; Sprint D bullet.

## [2026-03-29] Phase 5.3–5.4 — Nest + React framework docs closed

### Documentation

- **`docs/FRAMEWORKS/nestjs.md`** — copy-paste **`TenantNotFoundFilter`** (404 JSON + `exception.code`) + `useGlobalFilters` bootstrap; Fastify typing note.
- **`PLAN.md`** — Phase **5.3** / **5.4** **Done**; Phase **5** polish complete for **5.1–5.4**; Sprint D bullets aligned.

## [2026-03-29] Phase 5.1 — Next.js App Router integration doc complete

### Documentation

- **`docs/FRAMEWORKS/next-app-router.md`** — fix Route Handler example (`ResolvedTenant.marketKey`); add **RSC `page.tsx`** + merged **`getTenantConfig`**; clarify Node vs Edge for Server Actions + **`runtime = 'nodejs'`** on layout/page.
- **`PLAN.md`** — Phase **5.1** **Done**; last reviewed.

## [2026-03-29] `@multitenant/core` 0.5.2, `@multitenant/config` 0.4.3, `@multitenant/react` 0.5.2 — Phase 3.3 config merge

### Added

- **Market `config`**, tenant **`configByEnvironment`** (`local` \| `development` \| `staging` \| `production`), **deep merge** order: market → tenant → env overlay; object vs non-object **`InvalidTenantsConfigError`** on clash.
- **`mergeTenantConfigLayers`** in **`@multitenant/core`**; **`getTenantConfig(registry, tenantKey, environment?)`** uses merged layers; **`useTenantConfig`** uses resolved tenant’s **`environment`**.

### Documentation

- **`docs/CONFIG/tenants-config.md`**, **`docs/INTERNAL/errors.md`**, **`PLAN.md`** (Phase 3.3 **Done**).

## [2026-03-29] `@multitenant/typeorm` 0.1.0 — TypeORM Postgres DataSource reference (Phase 8.7)

### Added

- New package **`@multitenant/typeorm`**: **`createSharedPostgresDataSource`**, **`getOrCreateTenantPostgresDataSource`** (peer **`typeorm`**; deps: core, database).
- **Vitest:** `packages/typeorm/src/postgres-data-source.test.ts` (mocked **`DataSource`**).

### Documentation

- **`docs/INTERNAL/typeorm-postgres.md`**, **`packages/typeorm/README.md`**, cross-links from Drizzle/Kysely/Prisma/INDEX/frameworks overview, **`docs/INTERNAL/architecture.md`**, **`docs/INTERNAL/database-migrations-multitenant.md`** (TypeORM mention), **`CLAUDE.md`**, **`scripts/publish-packages.sh`** (publish-order slot + **`npm view pkg@version`** skip for idempotency), **`PLAN.md`** — Phase **8.7** ORM set complete; dashboard ORM **Shipped**.

## [2026-03-29] `@multitenant/kysely` 0.1.0 — Kysely + node-postgres reference (Phase 8.7)

### Added

- New package **`@multitenant/kysely`**: **`getOrCreateTenantNodePgPool`**, **`createNodePgKysely`**, **`getTenantNodePgKysely`** (peers: **`kysely`**, **`pg`**; deps: core, database).
- **Vitest:** `packages/kysely/src/node-pg.test.ts` (mocked `pg`).

### Documentation

- **`docs/INTERNAL/kysely-postgres.md`**, **`packages/kysely/README.md`**, cross-links from Drizzle/Prisma/internal INDEX, **`docs/FRAMEWORKS/overview.md`**, **`docs/INTERNAL/architecture.md`**, **`CLAUDE.md`**, **`scripts/publish-packages.sh`**, **`PLAN.md`** (Phase 8.7 + dashboard).

## [2026-03-29] Phase 6.4 + 7.3 — orientation & README demo pointers

### Documentation

- **`docs/WHY-MULTITENANT.md`** — **Next steps** expanded (examples, INDEX, frameworks overview, database-scope).
- **`README.md`** — demo line names runnable **express-minimal** / **next-minimal**.
- **`PLAN.md`** — Phase **6.4** + **7.3** **Done**; dashboard **Orientation** **Shipped**; CI row lists **drizzle/prisma** tests + **examples:express-smoke**.

## [2026-03-29] Phase 6.3 — runnable Express + Next examples

### Added

- **`examples/express-minimal`** — workspace with `app.cjs` / `server.cjs` / **`smoke.cjs`** (supertest); root script **`npm run examples:express-smoke`**.
- **`examples/next-minimal`** — Next 15 App Router: **`createTenantMiddlewareFromConfig`** (`@multitenant/next-app/auto`), RSC **`getTenantFromHeaders`**, **`next build`** in turbo.

### CI / docs

- **`.github/workflows/ci.yml`** — Express minimal smoke step.
- **`examples/README.md`**, **`PLAN.md`** (dashboard, Phase 6.3, Sprint D), **`package.json`** scripts.

## [2026-03-29] `@multitenant/prisma` 0.1.0 — Prisma client helpers (Phase 8.7 follow-up)

### Added

- New package **`@multitenant/prisma`**: **`createSharedPrismaClient`**, **`getOrCreateTenantPrismaClient`** (peer **`@prisma/client`**); minimal `prisma/schema.prisma` + **`prebuild`** `prisma generate` for package CI/build.
- **Vitest:** `packages/prisma/src/client.test.ts` (mocked client).

### Documentation

- **`docs/INTERNAL/prisma-postgres.md`**, **`packages/prisma/README.md`**, **`docs/INTERNAL/drizzle-postgres.md`** (cross-link), **`docs/FRAMEWORKS/overview.md`**, **`docs/INTERNAL/architecture.md`**, **`docs/INDEX.md`**, **`CLAUDE.md`**, **`scripts/publish-packages.sh`**, **`PLAN.md`** (8.7 row + **8.8** typo **N DBs**).

## [2026-03-29] `@multitenant/drizzle` 0.1.0 — Drizzle + node-postgres reference (Phase 8.7)

### Added

- New package **`@multitenant/drizzle`**: **`getOrCreateTenantNodePgPool`**, **`createNodePgDrizzle`**, **`getTenantNodePgDrizzle`** (peers: **`drizzle-orm`**, **`pg`**; deps: core, database).
- **Vitest:** `packages/drizzle/src/node-pg.test.ts` (mocked `pg`).

### Documentation

- **`docs/INTERNAL/drizzle-postgres.md`**, **`packages/drizzle/README.md`**, **`docs/FRAMEWORKS/overview.md`**, **`docs/INTERNAL/architecture.md`**, **`docs/INDEX.md`**, **`CLAUDE.md`**, **`scripts/publish-packages.sh`**, **`PLAN.md`**.

## [2026-03-29] Phase 8.8 — multi-tenant database migrations (documentation)

### Added

- **`docs/INTERNAL/database-migrations-multitenant.md`** — shared DB vs N databases vs schema-per-tenant; operational patterns (no hosted orchestrator).

### Documentation

- **`docs/INDEX.md`**, **`PLAN.md`**, **`docs/INTERNAL/drizzle-postgres.md`** (See also).

## [2026-03-29] `@multitenant/database` 0.5.5 — bounded per-tenant pool cache (Phase 8.6)

### Added

- **`BoundedTenantDbResourceCache<T>`** — `maxPools`, optional **`idleEvictMs`**, **`onEvict`**, LRU eviction, **`destroy()`**.
- **`makeTenantDatabaseCacheKey(tenantKey, databaseUrl)`** — composite cache key (tenant + URL).
- **`getOrCreateTenantDatabaseResource`** — **`resolveTenantDatabaseUrl`** + cache `getOrCreate`.
- **Vitest:** `src/bounded-tenant-db-resource-cache.test.ts`.

### Documentation

- **`docs/INTERNAL/bounded-tenant-db-pools.md`**, **`docs/INTERNAL/database-scope.md`**, **`docs/INTERNAL/per-tenant-database-url.md`**, **`docs/INTERNAL/architecture.md`**, **`docs/INDEX.md`**, **`PLAN.md`**, **`packages/database/README.md`**.

## [2026-03-29] `@multitenant/database` 0.5.4 — per-tenant DSN resolution (Phase 8.5)

### Added

- **`resolveTenantDatabaseUrl(resolved, tenants, options?)`** — reads **`TenantDefinition.database.envVar`** from validated config, returns `process.env[envVar]` (or custom **`env`** map); optional **`required`** (default `true`).
- **Vitest:** `src/resolve-tenant-db-url.test.ts`.

### Documentation

- **`docs/INTERNAL/per-tenant-database-url.md`**, **`docs/CONFIG/tenants-config.md`**, **`docs/INTERNAL/database-scope.md`**, **`packages/database/README.md`**, **`PLAN.md`**.

## [2026-03-29] `@multitenant/config` 0.4.2 — optional tenant `database.envVar` (Phase 8.5)

### Added

- **`tenantDatabaseConfigSchema`** — **`envVar`** must match `/^[A-Za-z_][A-Za-z0-9_]*$/` (rejects URL-like values).
- **`database`** optional on **`tenantDefinitionSchema`**.
- **Vitest:** `validate.test.ts` — valid **`database.envVar`** + invalid cases.

### Documentation

- **`docs/CONFIG/tenants-config.md`**, **`PLAN.md`**.

## [2026-03-29] `@multitenant/core` 0.5.1 — `TenantDatabaseConfig` type (Phase 8.5)

### Added

- **`TenantDatabaseConfig`** (`envVar: string`); optional **`database?: TenantDatabaseConfig`** on **`TenantDefinition`**.

### Documentation

- **`docs/CONFIG/tenants-config.md`**, **`PLAN.md`**.

## [2026-03-29] `@multitenant/database` 0.5.3 — Postgres RLS `SET LOCAL` helpers (Phase 8.3)

### Added

- **`POSTGRES_RLS_TENANT_GUC_DEFAULT`** — `'app.tenant_id'`.
- **`assertSafePostgresCustomGucName`**, **`escapePostgresStringLiteral`** — safe `SET LOCAL` / policy wiring.
- **`buildSetLocalTenantGucSql`**, **`buildSetLocalTenantGucSqlFromScope`** — transaction-level tenant GUC SQL text.
- **Vitest:** `src/postgres-rls.test.ts` (**9** cases; **34** tests in package).

### Documentation

- **`docs/INTERNAL/postgres-rls-tenant.md`** — RLS policies, `SET LOCAL`, poolers, `FORCE ROW LEVEL SECURITY`; cross-links.
- **`PLAN.md`** — Phase **8.3** **Done (v0.5.3)**; dashboard; Sprint **E**.
- **`packages/database/README.md`** — Phase 8.3 blurb.

## [2026-03-29] `@multitenant/database` 0.5.2 — schema-per-tenant Postgres (Phase 8.4)

### Added

- **`schemaNameForTenant(tenantKey, options?)`** — PostgreSQL-safe unquoted schema name (normalize, optional `prefix`, UTF-8 byte cap default **63**).
- **`POSTGRES_MAX_IDENTIFIER_BYTES`** — `63`.
- **`requireSchemaNameForCurrentTenant(options?)`** — `schemaNameForTenant(requireTenantKey(), …)`.
- **Vitest:** `src/schema-name.test.ts` (**10** cases; **25** tests total in package).

### Documentation

- **`docs/INTERNAL/schema-per-tenant-postgres.md`** — `SET LOCAL search_path`, PgBouncer / prepared statements, migrations; cross-links from `shared-db-tenant-id.md`, `database-scope.md`, `INDEX.md`, `architecture.md`.
- **`PLAN.md`** — Phase **8.4** **Done (v0.5.2)**; dashboard; Sprint **E**.
- **`packages/database/README.md`**.

## [2026-03-29] `@multitenant/database` 0.5.1 — shared-DB `tenant_id` helpers (Phase 8.2)

### Added

- **`requireTenantKey()`** — returns scoped `tenantKey` or throws if ALS has no scope.
- **`assignTenantIdForWrite(row, column?)`** — merges tenant key into write payloads; throws if the row already carries a different tenant for that column.
- **`assertRowTenantColumn(row, column?)`** — after reads, asserts the row’s tenant column matches scope.
- **Vitest:** `src/tenant-id.test.ts` (**11** cases); package total **15** with existing ALS scope tests.

### Documentation

- **`docs/INTERNAL/shared-db-tenant-id.md`** — composite keys, indexes, threat model; linked from `database-scope.md`, `docs/INDEX.md`, `docs/INTERNAL/architecture.md`.
- **`PLAN.md`** — Phase **8.2** marked **Done (v0.5.1)**; dashboard ORM row; Sprint **E** progress.
- **`packages/database/README.md`**.

## [2026-03-29] Docs — PLAN audit (semver + sprint history)

### Documentation

- **`PLAN.md`** — **Last reviewed** snapshot; dashboard **CLI v0.5.2**; Sprint **A** 1.2/1.3 no longer “open”; Sprint **D** docs follow-through bullet (5.1–5.4, 6.1 react tests, 6.4); Phase **1.1** Nest row + guard pointer.

_No package `src/` changes — no npm publish._

## [2026-03-29] Docs — Next `middleware.ts` + shared registry (Phase 5.1)

### Documentation

- **`docs/FRAMEWORKS/next-app-router.md`** — copy-paste root **`middleware.ts`** using the same `tenantRegistry` as Route Handlers / Server Actions; optional `matcher`; pointer to single-file README pattern.
- **`PLAN.md`** — Phase **5.1** + last reviewed.

_No package `src/` changes — no npm publish._

## [2026-03-29] Docs — WHY-MULTITENANT Next flow (Phase 6.4)

### Documentation

- **`docs/WHY-MULTITENANT.md`** — **Typical Next.js App Router path** section: middleware → headers → `getTenantFromHeaders` mermaid; cross-link to `docs/FRAMEWORKS/next-app-router.md` in body and Next steps.
- **`docs/INDEX.md`** — Why Multitenant blurb mentions Next middleware diagram.
- **`PLAN.md`** — dashboard + Phase **6.4** row aligned with the above.

_No package `src/` changes — no npm publish._

## [2026-03-29] Docs — PLAN 1.2 + Nest TenantRequiredGuard (Phase 5.3)

### Documentation

- **`PLAN.md`** — Phase **1.2** marked **done** (no stray `resolveTenant` / `getTenant()` in `*.md` outside intentional PLAN notes); Phase **5.3** checklist updated.
- **`docs/FRAMEWORKS/nestjs.md`** — copy-paste **`TenantRequiredGuard`** (`TenantNotFoundError`), `@UseGuards` + controller example; exception-filter note.

_No package `src/` changes — no npm publish._

## [2026-03-29] Docs — react-ssr SSR/RSC-first (Phase 5.4)

### Documentation

- **`docs/FRAMEWORKS/react-ssr.md`** — framework-agnostic SSR/RSC + serializable `ResolvedTenant` vs `TenantRegistry`; classic SSR + hydration; Next.js App Router + Pages as subsections; INDEX / PLAN / cross-links.

_No package `src/` changes — no npm publish._

## [2026-03-29] `@multitenant/react` 0.5.1 — hook tests

### Added

- **Vitest + Testing Library** — `src/hooks.test.tsx` (`useTenant`, `useMarket`, `useTenantFlag`, `useTenantConfig`, `useExperiment`, `useTenantTheme`, provider guard).

### Documentation

- Root **README** — Phase 7.3: demo = docs + examples + `init` (no hosted site).
- `PLAN.md` (6.1, 7.3), `docs/INTERNAL/architecture.md`.

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
