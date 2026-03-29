# Database tenant scope (`@multitenant/database`)

**Node-only.** Optional helpers built on `AsyncLocalStorage` so server code (Express, Nest request handlers, Next.js route handlers in the **Node** runtime) can read a **tenant scope** set at the HTTP boundary without threading `tenantKey` through every call.

This package does **not** include drivers or SQL. **Phase 8.6** adds a **driver-agnostic bounded pool cache** (LRU + optional idle eviction) — see [Bounded per-tenant DB pools](bounded-tenant-db-pools.md). It complements `createTenantRegistry` / `ResolvedTenant`: you still resolve the tenant from the request; then wrap downstream work in `runWithTenantScope` / `runWithTenantScopeAsync`.

## API (summary)

- `runWithTenantScope(scope, fn)` / `runWithTenantScopeAsync` — execute synchronous / async work inside the scope. **`scope`** is `{ tenantKey, resolved?: ResolvedTenant }` — pass **`resolved`** from `registry.resolveByRequest` when downstream code needs market, flags, or `resolveTenantDatabaseUrl`.
- `getTenantScope()` — read current **`TenantScopeState`** or `undefined` if outside a scope.
- `requireTenantScope()` — returns scope or throws if missing (strict mode for DB code paths).
- `getResolvedTenantFromScope()` — `scope?.resolved` or `undefined`.
- `requireResolvedTenantFromScope()` — **`ResolvedTenant`** or throws if scope missing or **`resolved`** omitted.
- **Shared DB (Phase 8.2):** `requireTenantKey`, `assignTenantIdForWrite`, `assertRowTenantColumn` — see [Shared DB `tenant_id`](shared-db-tenant-id.md).
- **Schema-per-tenant Postgres (Phase 8.4):** `schemaNameForTenant`, `requireSchemaNameForCurrentTenant` — see [Schema-per-tenant Postgres](schema-per-tenant-postgres.md).
- **Postgres RLS + `SET LOCAL` (Phase 8.3):** `buildSetLocalTenantGucSql`, `buildSetLocalTenantGucSqlFromScope`, literals/GUC validation — see [Postgres RLS tenant GUC](postgres-rls-tenant.md).
- **Per-tenant DSN env (Phase 8.5):** `resolveTenantDatabaseUrl` — see [Per-tenant database URL](per-tenant-database-url.md).
- **Bounded pool cache (Phase 8.6):** `BoundedTenantDbResourceCache`, `getOrCreateTenantDatabaseResource`, `makeTenantDatabaseCacheKey` — see [Bounded per-tenant DB pools](bounded-tenant-db-pools.md).

See package `README` and `packages/database/src/index.ts` for exact types and behavior.

## Integration notes

- **Edge** — do not use; there is no stable ALS story on all Edge runtimes. Resolve tenant in middleware; pass explicit context into server-only modules.
- **Workers / jobs** — no ambient scope; call repositories with an explicit `tenantKey` or wrap the job body in `runWithTenantScope`.
- **Security** — scope must be set only after **trusted** resolution (registry + host / internal headers) or after `assertAccess` on identity.
- **`resolved` in scope** — optional for **`tenant_id`** / RLS helpers that only need **`tenantKey`**; recommended when calling **`resolveTenantDatabaseUrl`** or reading tenant flags inside repositories without re-resolution.
