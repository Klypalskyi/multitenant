# Database tenant scope (`@multitenant/database`)

**Node-only.** Optional helpers built on `AsyncLocalStorage` so server code (Express, Nest request handlers, Next.js route handlers in the **Node** runtime) can read a **tenant scope** set at the HTTP boundary without threading `tenantKey` through every call.

This package does **not** include drivers, pooling, or SQL. It complements `createTenantRegistry` / `ResolvedTenant`: you still resolve the tenant from the request; then wrap downstream work in `runWithTenantScope` / `runWithTenantScopeAsync`.

## API (summary)

- `runWithTenantScope(tenantKey, fn)` / `runWithTenantScopeAsync` — execute synchronous / async work inside the scope.
- `getTenantScope()` — read `tenantKey` or `undefined` if outside a scope.
- `requireTenantScope()` — returns scope or throws if missing (strict mode for DB code paths).

See package `README` and `packages/database/src/index.ts` for exact types and behavior.

## Integration notes

- **Edge** — do not use; there is no stable ALS story on all Edge runtimes. Resolve tenant in middleware; pass explicit context into server-only modules.
- **Workers / jobs** — no ambient scope; call repositories with an explicit `tenantKey` or wrap the job body in `runWithTenantScope`.
- **Security** — scope must be set only after **trusted** resolution (registry + host / internal headers) or after `assertAccess` on identity.
