# Tenant-bound sessions (identity + resolution)

Host-based resolution tells you **which tenant this request is for**. `@multitenant/identity` and core **`EncodedSession`** tie a logged-in user to a **current tenant** and optional roles. **Both** matter on sensitive routes: a session must not act on tenant **B** while the browser is on tenant **A**’s host.

## Model

- **`ResolvedTenant`** (from `resolveByHost` / `resolveByRequest` / adapters): config + market for the **incoming request**.
- **`EncodedSession`** (`@multitenant/core`): `identity`, **`currentTenantKey`**, `issuedAt`, `expiresAt`. Cookie helpers live in `@multitenant/identity`.

## Recommended check on sensitive routes

1. Resolve **`resolved`** from trusted Host / `x-forwarded-host` (middleware or equivalent).
2. Parse **`session`** from the `Cookie` header (`getSessionFromCookieHeader`, etc.).
3. Call **`assertAccess(session, { tenantKey: resolved.tenantKey })`** — or **`canAccessTenant`** if you prefer soft denial.

That ensures `session.currentTenantKey` and the user’s `tenantAccess` allow the **same** tenant the host maps to. If someone replays a cookie from another tenant while hitting a different host, access should fail unless your policy explicitly allows it (e.g. staff with global roles via `allowGlobalRoles` on `canAccessTenant`).

## Header trust

- **`assertAccess` does not read HTTP headers** — you supply `tenantKey` from your **trusted** resolution path (registry + proxy-controlled forwarded host). See [Why Multitenant — pitfalls](../WHY-MULTITENANT.md) and [session cookies](session-cookies.md).

## Errors

- **`assertAccess`** throws a generic `Error` with message `[multitenant] Access denied for tenant / roles / permissions` — map to **403** (or your API shape) in Route Handlers, Nest guards, Express middleware, etc. It is **not** a `MultitenantError` with a stable `code` today.

## See also

- Core: `Identity`, `TenantGuardOptions` — `packages/core/src/identity.ts`
- [Session cookies & cross-domain](session-cookies.md)
- [Errors](errors.md) — resolution vs config vs missing tenant
