# Next.js App Router — integration checklist

Use with `@multitenant/next-app` (or meta-package `@multitenant/next`). This doc is **Phase 5.1** guidance from `PLAN.md`: runtime boundaries and where tenant context is safe.

## Resolution vs data access

| Runtime | Tenant resolution | Database / Node APIs |
|---------|-------------------|----------------------|
| **Edge middleware** | Yes — `createTenantMiddleware`, `resolveByRequest` with **inline/static** config (no `fs`) | No — use Route Handlers / server with `nodejs` runtime |
| **Node server** | Yes — `getTenantFromHeaders` / `requireTenant`, or `auto-node` loading `tenants.config.json` | Yes — wrap work in `runWithTenantScope` from `@multitenant/database` if you use ALS |

## Middleware

- Default `onMissingTenant: 'passthrough'` so `next dev` on raw `localhost` does not throw; use `multitenant dev` + matching `domains.local` hosts for real tenant headers, or `onMissingTenant: 'throw'` in production-like setups.
- Prefer **`x-forwarded-host`** when behind a proxy; the middleware normalizes the left-most host.
- Injected request headers for downstream App Router code: `x-tenant-key`, `x-market-key`, `x-tenant-env`, optional `x-tenant-flags` (JSON).

## Server Components & Route Handlers

- Call `headers()` and pass the result into `getTenantFromHeaders(h, registry, { environment })` — **same** `registry` instance shape as middleware (usually one shared module).
- Use `requireTenant` when missing tenant must be a hard error (returns `TenantNotFoundError`).

## Server Actions

- Server Actions run on the **server**; they still receive the **incoming request** headers for that action. Resolve tenant the same way as Route Handlers (`headers()` + `getTenantFromHeaders`), not from client-only context.
- Do **not** assume Edge: set `export const runtime = 'nodejs'` only when you rely on Node-only APIs (`fs`, native DB drivers, `@multitenant/database` ALS tied to the same request).

## Testing

- Integration-style tests in this repo: `packages/next-app/src/middleware.integration.test.ts` (middleware + `NextRequest`, header propagation contract).

## See also

- [Framework overview](overview.md)
- [CLI: init](../CLI/init.md) — generated `middleware` stub
- [Internal: database scope](../INTERNAL/database-scope.md) — Node ALS for DB layers
