# Multitenant — roadmap & backlog

**What this is:** Living backlog and execution guide for the `@multitenant/*` monorepo.  
**What it is not:** Release notes (see `docs/RELEASE.md`) or full API reference (see `docs/INDEX.md`, package READMEs).

**Last reviewed:** 2026-03-29 — **Phase 8.5:** `TenantDefinition.database.envVar` + `resolveTenantDatabaseUrl` — **`@multitenant/core` v0.5.1**, **`@multitenant/config` v0.4.2**, **`@multitenant/database` v0.5.4**; **8.3** v0.5.3.

---

## Status dashboard

| Capability | State | Notes |
|------------|--------|--------|
| Core: `createTenantRegistry`, types, `resolveByHost` / `resolveByRequest` | **Shipped** | `packages/core` |
| Config: Zod + `loadTenantsConfig`, overlap validation | **Shipped** | `packages/config` |
| CLI: `check`, `print`, `dev`, `init` (+ `tenantify` alias) | **Shipped** | **v0.5.2** — `init` scaffolds config + optional framework stubs; see `docs/CLI/init.md` |
| Dev proxy + config hot-reload (`chokidar` on `tenants.config.json`) | **Shipped** | `multitenant dev` |
| Adapters: React, Next App/Pages, Express, Nest | **Shipped** | |
| React: `useTenantConfig`, `useTenantFlag`, experiments | **Shipped** | `tenant.flags` map — not a separate `features` block |
| Identity: cookie encode/decode, `canAccessTenant`, `assertAccess` | **Shipped** | No `getSession`/`setSession` helpers |
| Examples: `examples/next-app-router`, `next-pages`, `express` | **Partial** | Reference snippets + `examples/README.md`; no per-example `package.json` yet (Phase 6.3) |
| Typed error classes (`TenantNotFoundError`, etc.) | **Shipped** | v0.4.0 — `MultitenantError` + `code`; see `docs/INTERNAL/errors.md` |
| `createTenantRegistry(_, { debug: true })` + custom `log` | **Shipped** | v0.4.0 |
| `npx multitenant init` | **Shipped** | `@multitenant/cli` **v0.5.2** (binary `.version` aligned) — `docs/CLI/init.md` |
| Meta-package `@multitenant/next` | **Shipped** | v0.5.0 — single install line; see package README |
| `export { middleware } from '@multitenant/next-app/auto'` | **Shipped** | v0.5.0 — `auto` (config object) + `auto-node` (project-root JSON load); Edge vs Node documented on subpath |
| Server helper `getTenantConfig()` (non-React) | **Shipped** | v0.5.0 in `@multitenant/core` — pair with registry + `ResolvedTenant.tenantKey` |
| `isFeatureEnabled()` / flags server-side | **Shipped** | v0.5.0 — `isTenantFeatureEnabled` in core (flags map) |
| Package unit tests + CI | **Shipped** | `npm test` (turbo): core, config, cli, database, identity, **next-app** integration tests; GitHub Actions `build` + `test` + **`npm run examples:smoke`** on push/PR |
| Website / landing in repo | **Not shipped** | Optional external |
| ORM / DB adapters (shared DB + per-tenant DB) | **Partial** | **`@multitenant/database` v0.5.4** — through **8.5** (env-backed per-tenant DSN resolution); **bounded pools** (8.6), ORM peers **8.7** still open |
| Orientation: why / pitfalls / diagram | **Partial** | `docs/WHY-MULTITENANT.md` — host→registry + **Next middleware→headers→`getTenantFromHeaders`** mermaid; `docs/INTERNAL/tenant-bound-sessions.md` |

**Naming note:** The public API uses `resolveByHost`, `resolveByRequest`, `getTenantFromHeaders`, and `requireTenant`. Do **not** document or implement `resolveTenant()` / `getTenant()` unless adding explicit aliases with a deprecation story.

---

## Principles & constraints

1. **Types:** Canonical types live in `@multitenant/core`; adapters wrap, they do not fork competing shapes.
2. **Resolution:** Hot path is sync and deterministic given config + environment key; async config loading must be opt-in and documented for Node vs Edge.
3. **Edge / Node:** Auto-loading `tenants.config.json` via `fs` is Node-only. Edge middleware must receive preloaded config or static import.
4. **Identity:** Optional; no crypto or session cookie required for tenant resolution.
5. **Breaking changes:** Semver for packages; document CLI behavior changes in `docs/RELEASE.md`.
6. **Data layer (optional):** Host resolution does **not** imply DB isolation — tenant-scoped queries need explicit patterns (see Phase 8). DB code is **Node-only** (no Edge DB).

---

## Phase 0 — Current foundation

**Goal:** Baseline product (registry + config + adapters + CLI).  
**Status:** Done — see status dashboard.

**DoD:** `npm run build` (turbo) passes for all workspaces.

---

## Phase 1 — Core consolidation (P0)

**Goal:** Stability, predictable errors, one mental model for resolution.

### Shipped (partial)

- Shared types in `@multitenant/core`; adapters import from core.
- **v0.4.0:** Error taxonomy in core; config throws `InvalidTenantsConfigError`; Next `requireTenant` / strict middleware throw `TenantNotFoundError`; registry `debug` + `log`; docs in `docs/INTERNAL/errors.md`.

### Remaining work

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 1.1 | **Error taxonomy** | **Partial:** Express `onMissingTenant: 'throw'` → `next(TenantNotFoundError)`; Next Pages `withTenantApi` → 404 JSON with `MULTITENANT_TENANT_NOT_FOUND` (**next-pages v0.4.2**); GSSP still `notFound`; Nest middleware still **`null` tenant** when unresolved — strict routes use app guard (**`TenantRequiredGuard`** in `docs/FRAMEWORKS/nestjs.md`). |
| 1.2 | **Align docs & PLAN with real API** — no fictional method names | **Done:** `*.md` grep — no stray `resolveTenant` / `getTenant()` except intentional notes in `PLAN.md` / Appendix B. |
| 1.3 | **Duplication audit** — types across packages | **Done (audit):** `ResolvedTenant` / `TenantsConfig` interfaces only in `@multitenant/core` (`packages/*/src` grep). |
| 1.4 | **Debug / observability on registry** | **Done (v0.4.0)** — optional structured OTel hook still future (Appendix A) |

**Out of scope for this phase:** Renaming `resolveByHost` to a different public name without a major version and deprecation path.

**Dependencies:** 1.1 before relying on errors in tests; 1.4 should use same logging interface as future OTel hook (see product ideas).

---

## Phase 2 — Developer experience (P0)

**Goal:** Five-minute setup; minimal copy-paste.

### Shipped (partial)

- `useTenantConfig` in `@multitenant/react`.
- `multitenant dev` with hot reload of config.

### Remaining work

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 2.1 | **`multitenant init`** | **Shipped (v0.5.0)** — flags + TTY prompt; minimal `tenants.config.json`; stubs for `next-app` (`middleware.ts`), `next-pages` (`lib/tenant-registry.ts`), `express` (`multitenant.server.example.ts`); `validateTenantsConfig` before write; overwrite requires confirmation or `--force` |
| 2.2 | **Optional `@multitenant/next`** | **Shipped (v0.5.0)** — meta-package; single install line; see `packages/next/README.md` |
| 2.3 | **Zero-config Next entry** | **Shipped (v0.5.0)** — `@multitenant/next-app/auto` + `auto-node`; Node vs Edge split documented on subpaths |
| 2.4 | **Dev proxy UX** | Already: auto-detect config path, hot reload. Stretch: TTY summary (tenants, listen port, upstream) — not a full web dashboard unless scoped |

**Dependencies:** 2.1 should reference stable API names (Phase 1.2). 2.3 depends on clear Node vs Edge split.

---

## Phase 3 — Value layer (P1)

**Goal:** Tenant-scoped product behavior beyond host resolution.

### Shipped (partial)

- `flags` on tenant + `useTenantFlag`.
- Per-environment domain maps (`local`, `development`, `staging`, `production`).

### Remaining work

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 3.1 | **Server + client parity for config** | **Shipped (v0.5.0)** — `getTenantConfig` in `@multitenant/core` |
| 3.2 | **Feature surface** | **Partial (v0.5.0)** — `isTenantFeatureEnabled` (flags map); separate `features` block + migration still optional |
| 3.3 | **Environment merge (if still needed)** | Explicit merge order (market → tenant → env override); tests; `multitenant check` validates conflicts |
| 3.4 | **Async config (optional)** | **Partial:** `docs/GETTING-STARTED.md` — load/validate async at bootstrap; pass sync config into `createTenantRegistry`; refresh policy out of scope |

---

## Phase 4 — Identity (P1)

**Goal:** Optional, secure tenant-bound sessions.

### Shipped

- `encodeSessionToCookie` / `decodeSessionFromCookie`, guards.

### Remaining work

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 4.1 | **Session helpers** | **Partial (v0.5.0)** — `getSessionFromCookieHeader`, `buildSessionSetCookieHeader` in `@multitenant/identity`; full get/set wrappers optional |
| 4.2 | **Tenant-bound sessions** | **Partial:** `docs/INTERNAL/tenant-bound-sessions.md` — `currentTenantKey`, `assertAccess(session, { tenantKey: resolved.tenantKey })`, header trust, 403 mapping note |
| 4.3 | **Cross-domain** | **Partial:** `docs/INTERNAL/session-cookies.md` — SameSite, host-only vs `Domain`, `__Host-`, multi-subdomain notes; `buildSessionSetCookieHeader` still omits `Domain` (app may append) |

---

## Phase 5 — Framework polish (P1)

**Goal:** First-class typings and runtime coverage.

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 5.1 | Next.js: Edge middleware, Server Actions | **Partial:** `docs/FRAMEWORKS/next-app-router.md` — Edge vs Node, middleware headers, Server Actions, **copy-paste** `middleware.ts` (shared registry) + route handler + server action + `lib/tenant-registry` |
| 5.2 | Express | **Shipped (doc + API):** global `req.tenant` augment; `docs/FRAMEWORKS/express.md`; optional `onMissingTenant` (**v0.4.2**) |
| 5.3 | Nest | **Partial:** `docs/FRAMEWORKS/nestjs.md` — module, `@Tenant()`, null tenant; **DI recipe**; **copy-paste `TenantRequiredGuard`** (`TenantNotFoundError`) + `@UseGuards`; optional global exception filter still app-owned |
| 5.4 | React | **Partial:** `docs/FRAMEWORKS/react-ssr.md` — RSC/SSR boundary (serializable `ResolvedTenant` vs registry); classic SSR; **Next** App Router + Pages examples |

---

## Phase 6 — Quality (P0)

**Goal:** Production confidence.

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 6.1 | **Unit tests** | **Partial:** core + config + cli + database + identity + next-app + **next-pages** + **express** + **nest** + **react**; CI runs `npm test` |
| 6.2 | **Integration tests** | **Partial:** `@multitenant/next-app` middleware + `NextRequest` / header contract (`src/middleware.integration.test.ts`) in CI |
| 6.3 | **Examples** | **Partial:** `examples/README.md`; **`examples/config-smoke`** — workspace + CI step `npm run examples:smoke` (root config + resolution); full Next/Express runnable examples still open |
| 6.4 | **Documentation** | **Partial:** `docs/WHY-MULTITENANT.md` — why / when not / pitfalls; **two** mermaid diagrams (core resolution + Next header path); links to getting started, errors, sessions, `docs/FRAMEWORKS/next-app-router.md` |

---

## Phase 7 — Positioning (P0)

**Goal:** Understandable in 10 seconds.

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 7.1 | **README hero** | **Shipped (partial):** 30-second start + copy-paste Next `middleware.ts` + open-source links |
| 7.2 | **Brand** | Keep `@multitenant/*` scope; consistent naming in all public docs |
| 7.3 | **Website / demo** | **Partial:** root `README.md` — no hosted demo; points at docs + `examples/` + `multitenant init` |

---

## Phase 8 — ORM / database adapters (P1)

**Goal:** Optional **adapter-pattern** packages so apps can persist data under **config-driven tenants** in two topologies: **(A) one shared database** with strict tenant isolation (`tenant_id`, Postgres RLS, or schema-per-tenant on one cluster), and **(B) per-tenant databases** (distinct URL or physical DB per tenant). **`@multitenant/core` stays free of ORMs, drivers, and pooling.**

**Explicit out of scope**

- No Prisma/Drizzle/query-builder code inside `packages/core` — only **optional value types / interfaces** if needed (`TenantScope`, `TenantDbResolver`, opaque connection specs).
- No generic “generate schema for every tenant’s DB” or **automatic migration orchestration** across **N** production databases (document ops patterns + optional hooks / CLI recipes only).
- No vendor UI for RLS; ship **Node recipes**, docs, and tests.
- No **Edge** database access — resolution may run on Edge; **queries** only in **Node** server contexts (Next Route Handlers, Node runtime, Express, Nest).

### Architecture (packages)

| Package | Role |
|---------|------|
| `@multitenant/database` | **Contracts + small runtime helpers** — optional ALS-style `runWithTenantScope` / `getTenantScope()` for Node; recipes for RLS vs `WHERE tenant_id` vs `search_path`; **no** ORM imports. Peers: `@multitenant/core`. |
| `@multitenant/prisma`, `@multitenant/drizzle`, `@multitenant/kysely`, `@multitenant/typeorm` (incremental) | **Thin** peers: map `ResolvedTenant` → client/pool; shared-DB scoping (e.g. Prisma `$extends`, Drizzle helpers); per-tenant URL pooling. **Do not** reimplement the tenant registry. |
| `@multitenant/core` | **Minimal:** stable types such as `TenantScope` (`tenantKey`), `TenantDbMode` (`'shared' \| 'per_tenant'`), interfaces like `TenantDbResolver` returning opaque **connection spec** (URL ref, optional `schemaName`, pool hints) — **no** pool implementation, **no** SQL. |

**Async context (default: hybrid):** ALS / `runWithTenantScope` at the **HTTP boundary** (Express/Nest/Next Node) for ergonomics; **explicit `tenantKey`** (or scoped client) on any API used from **jobs, CLI, or workers** — no mutable global “current tenant” without ALS.

**Integration:** Nest (REQUEST-scoped + ALS), Express (after `multitenantExpress`, wrap `next()` in `runWithTenantScope`), Next App Router (**server-only** — document that middleware is Edge-capable but DB is not).

### Work items

| ID | Task | Dependencies | Acceptance criteria |
|----|------|--------------|---------------------|
| 8.1 | **Tenant DB context (async-safe)** | Phase 1 stable types | **Partial (v0.5.0):** `@multitenant/database` — ALS `runWithTenantScope*` + `getTenantScope` / `requireTenantScope`; nested async + strict missing-scope tests. Full `ResolvedTenant` in scope optional follow-up. |
| 8.2 | **Shared DB — `tenant_id` + scoping helpers** | 8.1 | **Done (v0.5.1):** `requireTenantKey`, `assignTenantIdForWrite`, `assertRowTenantColumn`; `docs/INTERNAL/shared-db-tenant-id.md` (composite keys, indexes, threat model). *Query building stays app/ORM; helpers enforce row/column invariants + ALS scope.* |
| 8.3 | **Shared DB — Postgres RLS recipe** | 8.1; Phase 4 **recommended** for identity-bound RLS | **Done (v0.5.3):** `buildSetLocalTenantGucSql`, `buildSetLocalTenantGucSqlFromScope`, `escapePostgresStringLiteral`, `assertSafePostgresCustomGucName`, `POSTGRES_RLS_TENANT_GUC_DEFAULT`; `docs/INTERNAL/postgres-rls-tenant.md` (policies, `SET LOCAL`, PgBouncer, `FORCE RLS`). *Dockerized PG e2e in CI remains optional / not in repo.* |
| 8.4 | **Shared DB — schema-per-tenant (same cluster)** | 8.1 | **Done (v0.5.2):** `schemaNameForTenant`, `POSTGRES_MAX_IDENTIFIER_BYTES`, `requireSchemaNameForCurrentTenant`; `docs/INTERNAL/schema-per-tenant-postgres.md` (`SET LOCAL search_path`, pooling, prepared statements, migrations note). |
| 8.5 | **Per-tenant DB — connection resolution** | 8.1 | **Done:** **`TenantDatabaseConfig`** on **`TenantDefinition`** (`database.envVar` only); **`@multitenant/config`** Zod + `multitenant check`; **`resolveTenantDatabaseUrl`** in **`@multitenant/database`**; `docs/INTERNAL/per-tenant-database-url.md`, config reference. *Bounded pool manager = 8.6.* |
| 8.6 | **Per-tenant DB — pool / client manager** | 8.5 | Bounded pools (per-URL or per-tenant with **max** tenants / max connections, LRU idle eviction); **no** unbounded `Map` of pools; docs: long-lived Node vs serverless. |
| 8.7 | **ORM reference adapter (one first)** | 8.2, 8.5–8.6 | One of Drizzle **or** Prisma end-to-end: shared-DB + per-tenant URL examples; second ORM = follow-up minor. |
| 8.8 | **Migrations story** | 8.2, 8.5 | Docs: single migration set (shared DB) vs **N** DBs (batch scripts, template DB, or provisioner); idempotency + ordering; optional `multitenant` subcommand **or** documented npm scripts — not a full hosted orchestrator. |

### Security (non-negotiables)

- **Tenant key** from **registry + trusted resolution path** (or `assertAccess` after identity) — never trust raw client-supplied `X-Tenant-Id` alone.
- **Secrets:** connection strings via env / secrets manager; **redact** passwords in logs; structured logs include `tenantKey` when safe.
- **RLS:** defense in depth with app-layer authz — document “host resolution ≠ user authorization.”
- **Pools:** pool/cache keys must include **tenant identity** when URLs can rotate or collide.

### Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Pool explosion (per-tenant) | Hard caps, LRU eviction, PgBouncer, document “RLS + shared pool” as default recommendation for many tenants. |
| Migrations across N DBs | Treat as **app ops**; document blast radius; optional hooks only. |
| RLS + connection poolers | Document `SET LOCAL` / transaction boundaries; tests reflecting real Postgres behavior. |
| Wrong-tenant write (async bug) | Integration tests; throw if scope missing in strict mode. |

### Ordering vs other phases

- **Depends on Phase 1** (errors/types) for predictable failure modes.
- **Can parallel Phase 3** if 8.1 aligns with `getTenantConfig` / server tenant context (avoid duplicate context systems).
- **Phase 4** not required for `tenant_id` from host alone; **recommended** before marketing RLS as “session-bound security.”

### Definition of Done (phase)

1. Two **documented topologies** (shared DB + per-tenant URL), each with **threat model** (what host resolution does *not* guarantee).
2. **8.1** shipped with tests; no reliance on global mutable tenant for correctness.
3. Per-tenant pooling has **documented** caps and deterministic behavior under load.
4. **One** ORM reference package works end-to-end in a minimal example or test harness.
5. **`multitenant check`** rejects invalid DB-related tenant config when schema fields are added (**8.5 ✅** for `database.envVar` shape).

---

## Execution — suggested sprints

Exit criteria are mandatory; task lists are indicative.

### Sprint A — Contract & core quality ✅ (v0.4.0)

- Error taxonomy (Phase 1.1) + debug/logger (Phase 1.4) shipped.
- Test harness: Vitest + `turbo run test` (Phase 6.1 partial — core + config only).
- **Follow-up (done later):** Phase **1.2** doc API grep + **1.3** type duplication audit — see Phase 1 table (**Done**).

**Exit:** `npm run build` + `npm test` green locally; typed errors documented. *(1.2 / 1.3 closed in 2026-03 — Phase 1 table.)*

### Sprint B — DX ✅

- `multitenant init` (Phase 2.1); `@multitenant/next` (2.2); `next-app/auto` + `auto-node` (2.3) — **shipped** (v0.5.x).

**Exit:** Init + check + meta/auto paths documented — **met**.

### Sprint C — Value + identity ✅ (core deliverables)

- `getTenantConfig` / `isTenantFeatureEnabled` (Phase 3); identity cookie header helpers (Phase 4.1 partial) — **shipped**.

**Exit:** Server/client parity for config and flags — **met** for the shipped slice.

### Sprint D — Polish & positioning ✅ (exit met for listed items)

- **Done:** GitHub Actions CI (Node 22); framework docs; `WHY-MULTITENANT.md`; README 30-second start + **copy-paste `middleware.ts`**; per-package READMEs + `package.json` `repository` / `license` / `homepage`; `next-app` + **express** + **next-pages** (`withTenantApi`) tests in `npm test`.
- **Done (Pages):** `withTenantApi` 404 JSON includes `code: MULTITENANT_TENANT_NOT_FOUND` (`@multitenant/next-pages` **v0.4.2**).
- **Done:** `examples/config-smoke` + CI `npm run examples:smoke`; Nest DI recipe in `docs/FRAMEWORKS/nestjs.md`.
- **Done (docs follow-through, 2026-03):** `react-ssr.md` SSR/RSC-first + Next subsections (5.4); Nest **`TenantRequiredGuard`** copy-paste (5.3); `WHY-MULTITENANT.md` second mermaid + App Router link (6.4); `next-app-router.md` root **`middleware.ts`** shared with `lib/tenant-registry` (5.1); `@multitenant/react` **v0.5.1** hook tests (6.1).
- **Open:** runnable Next/Express example workspaces; optional global coverage thresholds.

### Sprint E — Database / ORM (optional; Phase 8)

- Ship **8.1** (`@multitenant/database` scope + ALS/hybrid) before any ORM-specific package. **✅ Shipped (v0.5.0).**
- **8.2** shared-DB `tenant_id` helpers — **✅ Shipped (`@multitenant/database` v0.5.1).**
- **8.3** Postgres RLS + `SET LOCAL` helpers — **✅ Shipped (`@multitenant/database` v0.5.3).**
- **8.4** schema-per-tenant Postgres — **✅ Shipped (`@multitenant/database` v0.5.2).**
- **8.5** per-tenant DSN via env — **✅ Shipped (core 0.5.1, config 0.4.2, database 0.5.4).**
- Next: **8.6** bounded pools, **8.7** ORM reference, **8.8** migrations doc.
- Pick **one** ORM for **8.7**; **8.8** migrations doc as follow-up milestone.

**Exit:** DoD items 1–4 satisfied for one vertical slice (e.g. Drizzle + Postgres shared + one per-tenant URL mock).

---

## Success criteria (measurable)

1. **Build:** `npm run build` at repo root exits 0.
2. **Init path (Sprint B partial):** `npx multitenant init` → `npx multitenant check` exits 0; add framework deps and run `npm run dev` on the app port (e.g. 3000), then `multitenant dev --target http://localhost:3000 --port 3100` to hit tenant hosts on **3100** (proxy) while the app listens on **3000**. Defaults from `init` use `main.localhost` in `domains.local` — adjust to match your hosts.
3. **Tests:** `npm test` runs workspace tests including **next-app** middleware integration tests; **CI** runs `npm ci` → `build` → `test` on push/PR (`.github/workflows/ci.yml`).
4. **Errors:** `instanceof` / `e.code` distinguish config vs resolution vs missing tenant for core, config, and Next strict paths.

---

## Appendix A — Product ideas (not committed scope)

Promote items into phases above when prioritized.

1. **Config linter presets** — Named profiles (`ecommerce`, `b2b-saas`) with extra checks: orphan markets, risky wildcards, unused domains.
2. **`multitenant diff` / `plan`** — Dry-run: config PR shows which hosts change tenant assignment (review aid).
3. **Preview deployments** — Convention + docs mapping Vercel/Cloudflare preview URLs to tenants without huge domain tables.
4. **Structured observability** — Optional hook on resolution (tenant id, rule matched, duration) pluggable into OpenTelemetry; complements `debug` logging.
5. **Recipe packages** — e.g. `@multitenant/recipe-shopify-next`: opinionated wiring (storefront token, API version) still driven by `tenants.config.json`.
6. **Enterprise IdP bridge** — Documented mapping from identity-provider tenant claim → registry tenant + explicit header trust / spoofing considerations.
7. **Editor tooling** — VS Code extension or JSON Schema: validate `tenants.config.json`, go-to-definition for tenant/market keys.
8. **Compliance-oriented session matrix** — Single doc: isolated vs shared cookies across subdomains with SameSite / Domain / `__Host-` guidance.
9. **DB connection observability** — Metrics for pool size per tenant/URL, wait time, and eviction — complements Phase 8.

---

## Appendix B — Decisions log (brief)

| Topic | Decision |
|-------|----------|
| Edge vs Node fs | No `fs` in Edge; pass config explicitly or use Node-only middleware entry. |
| Public resolver API | `resolveByHost` / `resolveByRequest` — not `resolveTenant` unless aliased in a major release. |
| Flags vs `features` in schema | Today: `tenant.flags`. Any rename requires schema version + migration doc. |
| Meta-packages | Must be thin re-exports; no second implementation of core. |
| Error codes | `MULTITENANT_*` stable strings on `MultitenantError`; see `docs/INTERNAL/errors.md`. |
| DB / ORM | **Adapter packages:** `@multitenant/database` (contracts + ALS / scope helpers); thin peers `@multitenant/prisma` \| `drizzle` \| `kysely` \| `typeorm`. **Core** adds at most **types + `TenantDbResolver`-like interfaces** — no drivers/pools. **Shared DB:** document `WHERE tenant_id` vs RLS vs schema-per-tenant. **Per-tenant DB:** resolve URL from `ResolvedTenant` + validated config; **bounded** pools keyed by tenant/URL. **Context:** hybrid ALS at HTTP boundary + explicit `tenantKey` for jobs/CLI. **Migrations:** one pipeline for shared DB; N DBs = app ops / documented batching — not a hidden multitenant migrate-all product. **Next:** DB only in **Node** runtimes, not Edge. |

---

*End — single source for backlog; update this file when scope or shipped state changes.*
