# Session cookies and cross-domain patterns

`@multitenant/identity` encrypts a session payload (`encodeSessionToCookie` / `decodeSessionFromCookie`) and ships thin helpers `getSessionFromCookieHeader` / `buildSessionSetCookieHeader` for raw header wiring. **Attribute policy** (Domain, Path, SameSite, Secure) is where most production mistakes happen; this doc complements the API with a decision table.

## Threat model (short)

- **Tenant resolution** uses Host / `x-forwarded-host`. Only trust forwarded headers from **your** edge or reverse proxy; do not accept arbitrary client-supplied host override.
- **Session cookies** tie a browser to a tenant **after** login. Use `assertAccess` / `canAccessTenant` when the session’s tenant id must match the **resolved** tenant from the request (see core identity guards).

## SameSite and Secure

| Value | Typical use | Notes |
|-------|-------------|--------|
| `Lax` (default in `buildSessionSetCookieHeader`) | Most sites; CSRF-resistant for cross-site POSTs | OAuth/callback flows often need careful redirect URLs |
| `Strict` | High lock-in; no cookie on cross-site navigations | Can break expected flows from email/marketing links |
| `None` | Cross-site embedding **and** third-party context | **Requires** `Secure` (HTTPS) |

`buildSessionSetCookieHeader` maps `CookieConfig.sameSite` to the `SameSite=` attribute. Use **`Secure: true`** in production.

## Host-only vs `Domain`

| Pattern | Cookie scope | When |
|---------|--------------|------|
| **Omit `Domain`** (host-only) | Sent only to the exact host that set it (e.g. `a.example.com`) | Per-subdomain tenants; simplest isolation |
| `Domain=example.com` | All subdomains of `example.com` | Shared login across `*.example.com` (watch scope: any subdomain can read the cookie) |

Browsers do **not** set `Domain` for host-only cookies. Today’s helper builds `Path`, `HttpOnly`, `SameSite`, optional `Secure` / `Max-Age`; if you need `Domain=`, append it to the returned `Set-Cookie` string or set it via your framework’s cookie API.

## `__Host-` prefix

[Prefix rules](https://datatracker.ietf.org/doc/html/rfc6265bis): name starts with `__Host-` ⇒ must include **`Secure`**, **`Path=/`**, and **no** `Domain` attribute. Use when you want the browser to enforce “tied to this host only, root path.” Rename via `CookieConfig.cookieName` only if you satisfy those rules.

## Multi-tenant subdomains

- **One cookie per host:** host-only session on `tenant-a.example.com` is invisible to `tenant-b.example.com` — good isolation; users sign in per tenant host if needed.
- **One cookie for all subdomains:** set `Domain=.example.com` (+ `Secure`, thoughtful `SameSite`) and ensure **`assertAccess`** rejects sessions whose tenant does not match resolution for the current host.

## See also

- [Tenant-bound sessions](tenant-bound-sessions.md) — align `EncodedSession` with host-resolved tenant (`assertAccess`)
- [`docs/FRAMEWORKS/next-app-router.md`](../FRAMEWORKS/next-app-router.md) — where headers (and thus cookies on the request) are visible in Route Handlers and Server Actions
- Package **`@multitenant/identity`** README — `CookieConfig`, session helpers
