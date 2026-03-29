# Multitenant — roadmap & backlog

**What this is:** Living backlog and execution guide for the `@multitenant/*` monorepo.  
**What it is not:** Release notes (see `docs/RELEASE.md`) or full API reference (see `docs/INDEX.md`, package READMEs).

**Last reviewed:** 2026-03-29 (Sprint B: `@multitenant/cli` v0.5.0 `init`, v0.5.1 init tests; `@multitenant/next` / `next-app/auto` still open).

---

## Status dashboard

| Capability | State | Notes |
|------------|--------|--------|
| Core: `createTenantRegistry`, types, `resolveByHost` / `resolveByRequest` | **Shipped** | `packages/core` |
| Config: Zod + `loadTenantsConfig`, overlap validation | **Shipped** | `packages/config` |
| CLI: `check`, `print`, `dev`, `init` (+ `tenantify` alias) | **Shipped** | v0.5.0: `init` scaffolds config + optional framework stubs; see `docs/CLI/init.md` |
| Dev proxy + config hot-reload (`chokidar` on `tenants.config.json`) | **Shipped** | `multitenant dev` |
| Adapters: React, Next App/Pages, Express, Nest | **Shipped** | |
| React: `useTenantConfig`, `useTenantFlag`, experiments | **Shipped** | `tenant.flags` map — not a separate `features` block |
| Identity: cookie encode/decode, `canAccessTenant`, `assertAccess` | **Shipped** | No `getSession`/`setSession` helpers |
| Examples: `examples/next-app-router`, `next-pages`, `express` | **Shipped** | |
| Typed error classes (`TenantNotFoundError`, etc.) | **Shipped** | v0.4.0 — `MultitenantError` + `code`; see `docs/INTERNAL/errors.md` |
| `createTenantRegistry(_, { debug: true })` + custom `log` | **Shipped** | v0.4.0 |
| `npx multitenant init` | **Shipped** | `@multitenant/cli` v0.5.0 — `docs/CLI/init.md` |
| Meta-package `@multitenant/next` | **Not shipped** | Install per-package |
| `export { middleware } from '@multitenant/next-app/auto'` | **Not shipped** | |
| Server helper `getTenantConfig()` (non-React) | **Not shipped** | Hook exists only |
| `isFeatureEnabled()` | **Not shipped** | Use `useTenantFlag` / `resolved.flags` |
| Package unit tests (core + config + cli init) | **Shipped** | `npm test` / `vitest`; `@multitenant/cli` has `test:coverage`; wire CI separately |
| Website / landing in repo | **Not shipped** | Optional external |
| ORM / DB adapters (shared DB + per-tenant DB) | **Not shipped** | Phase 8 — `@multitenant/database` + thin ORM peers |

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
| 1.1 | **Error taxonomy** | **Done (v0.4.0)** — extend to remaining adapters (Express/Nest/Pages) where plain `Error` remains |
| 1.2 | **Align docs & PLAN with real API** — no fictional method names | README, PLAN, and init templates (when added) only reference `resolveByHost`, `resolveByRequest`, `getTenantFromHeaders`, `requireTenant` unless aliases are added |
| 1.3 | **Duplication audit** — types across packages | Grep for duplicate tenant/config interfaces; consolidate or document why duplicated |
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
| 2.2 | **Optional `@multitenant/next`** | Thin package: re-exports compatible versions of `next-app`, `react`, `config` (and pins); documented single install line |
| 2.3 | **Zero-config Next entry** | e.g. `@multitenant/next-app/auto` exporting middleware that loads default config path in Node middleware only; Edge limitations documented |
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
| 3.1 | **Server + client parity for config** | Export `getTenantConfig(registry, tenantKey)` or equivalent for RSC/route handlers; behavior matches `useTenantConfig` |
| 3.2 | **Feature surface** | Either document `flags` as canonical OR add `features` + migration; if `isFeatureEnabled(name)` is added, it must work in server and client with documented SSR story |
| 3.3 | **Environment merge (if still needed)** | Explicit merge order (market → tenant → env override); tests; `multitenant check` validates conflicts |
| 3.4 | **Async config (optional)** | Factory pattern documented: `createTenantRegistry` stays sync; async loading at app bootstrap only |

---

## Phase 4 — Identity (P1)

**Goal:** Optional, secure tenant-bound sessions.

### Shipped

- `encodeSessionToCookie` / `decodeSessionFromCookie`, guards.

### Remaining work

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 4.1 | **Session helpers** | Thin `getSession`/`setSession` (or documented recipe) built on existing cookie primitives |
| 4.2 | **Tenant-bound sessions** | Session payload includes tenant id; `assertAccess` used on sensitive routes; docs for threat model (header trust) |
| 4.3 | **Cross-domain** | Document patterns: shared vs isolated cookies (Domain, SameSite table); code only where generic |

---

## Phase 5 — Framework polish (P1)

**Goal:** First-class typings and runtime coverage.

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 5.1 | Next.js: Edge middleware, Server Actions | Checklist in docs; sample reads tenant in Server Action; note middleware runtime |
| 5.2 | Express | `req.tenant` typed (augment or generic) |
| 5.3 | Nest | Decorator + DI story documented |
| 5.4 | React | SSR/hydration: `TenantProvider` usage documented for App Router |

---

## Phase 6 — Quality (P0)

**Goal:** Production confidence.

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 6.1 | **Unit tests** | **Partial (v0.4.0):** core + config; add CI + expand adapters when feasible |
| 6.2 | **Integration tests** | At least one adapter path (e.g. Next middleware + resolution) in CI |
| 6.3 | **Examples** | Each `examples/*` documents `install && dev/build` commands; optional CI smoke |
| 6.4 | **Documentation** | “Why multitenant”, “When not to use”, “Common pitfalls”, one architecture diagram (host → registry → tenant) in `docs/` |

---

## Phase 7 — Positioning (P0)

**Goal:** Understandable in 10 seconds.

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| 7.1 | **README hero** | Headline + 30-second quickstart (copy-paste blocks tested) |
| 7.2 | **Brand** | Keep `@multitenant/*` scope; consistent naming in all public docs |
| 7.3 | **Website / demo** | Optional; if absent, README states “docs + examples” as the demo |

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
| 8.1 | **Tenant DB context (async-safe)** | Phase 1 stable types | API yields current `ResolvedTenant` / `tenantKey` for the in-flight request; **no** global mutable singleton; unit tests for nested async + missing context (deny or throw in strict mode). |
| 8.2 | **Shared DB — `tenant_id` + scoping helpers** | 8.1 | Helpers or thin package: enforce `WHERE tenant_id = …` from context; default scope for repository-style code; docs for composite keys + indexes. |
| 8.3 | **Shared DB — Postgres RLS recipe** | 8.1; Phase 4 **recommended** for identity-bound RLS | Docs + minimal helpers: `SET LOCAL` / session vars per transaction; pool + pooler caveats; optional **dockerized** integration test in CI. |
| 8.4 | **Shared DB — schema-per-tenant (same cluster)** | 8.1 | Docs: `search_path` / schema name from config convention; warnings for pooling + prepared statements; optional helper `schemaNameForTenant(tenantKey)`. |
| 8.5 | **Per-tenant DB — connection resolution** | 8.1 | Extend **validated** tenant config (optional `database` / DSN key refs): resolve URL from `ResolvedTenant` + env; **no secrets in git** — indirection via env/secret manager. |
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
5. **`multitenant check`** rejects invalid DB-related tenant config when schema fields are added (8.5).

---

## Execution — suggested sprints

Exit criteria are mandatory; task lists are indicative.

### Sprint A — Contract & core quality ✅ (v0.4.0)

- Error taxonomy (Phase 1.1) + debug/logger (Phase 1.4) shipped.
- Test harness: Vitest + `turbo run test` (Phase 6.1 partial — core + config only).
- Phase 1.2 / 1.3 still open (docs sweep; adapter error consistency).

**Exit:** `npm run build` + `npm test` green locally; typed errors documented.

### Sprint B — DX (in progress)

- `multitenant init` (Phase 2.1) — **done** (CLI v0.5.0; docs updated).
- Optional `@multitenant/next` (Phase 2.2) and/or `next-app/auto` (Phase 2.3) — **open**.

**Exit:** New user can run `init` and `check` succeeds; README updated — **met** for init path; meta-package / auto middleware still outstanding.

### Sprint C — Value + identity

- `getTenantConfig` server helper + flag story (Phase 3).
- Session helpers / docs (Phase 4).

**Exit:** Documented server/client parity for config.

### Sprint D — Polish & positioning

- Framework checklist (Phase 5).
- Docs depth + README hero (Phase 6.4 + 7).
- Example smoke in CI if feasible.

### Sprint E — Database / ORM (optional; Phase 8)

- Ship **8.1** (`@multitenant/database` scope + ALS/hybrid) before any ORM-specific package.
- Then **8.2** + **8.5**–**8.6** (shared scoping + per-tenant resolution + bounded pools).
- Pick **one** ORM for **8.7**; **8.3**/**8.4**/**8.8** as docs + recipes in same milestone or follow-up.

**Exit:** DoD items 1–4 satisfied for one vertical slice (e.g. Drizzle + Postgres shared + one per-tenant URL mock).

---

## Success criteria (measurable)

1. **Build:** `npm run build` at repo root exits 0.
2. **Init path (Sprint B partial):** `npx multitenant init` → `npx multitenant check` exits 0; add framework deps and run `npm run dev` on the app port (e.g. 3000), then `multitenant dev --target http://localhost:3000 --port 3100` to hit tenant hosts on **3100** (proxy) while the app listens on **3000**. Defaults from `init` use `main.localhost` in `domains.local` — adjust to match your hosts.
3. **Tests:** `npm test` runs core + config + **cli (`init`)** unit tests (add CI workflow when ready).
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
