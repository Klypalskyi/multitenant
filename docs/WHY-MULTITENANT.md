# Why Multitenant — and when not to use it

## What this stack optimizes for

- **Host-based (or header-assisted) tenant resolution** from a **single config file** shared across services.
- **Markets** shared across tenants (locale, currency, timezone) without duplicating boilerplate.
- **Typed errors** and small **framework adapters** so you don’t fork `ResolvedTenant` per app.

## Host → registry → tenant

```mermaid
flowchart LR
  subgraph inbound [Inbound request]
    H[Host / X-Forwarded-Host]
  end
  subgraph core [Core]
    C[tenants.config.json]
    R[createTenantRegistry]
    T[ResolvedTenant]
  end
  H --> R
  C --> R
  R --> T
```

Resolution is **not** authentication: knowing the tenant from the hostname does **not** prove who the user is. Use `@multitenant/identity` (or your IdP) for authorization on sensitive data.

## Typical Next.js App Router path

Middleware resolves the tenant on the **Edge** and forwards stable headers; server code re-hydrates a `ResolvedTenant` via `getTenantFromHeaders` (same registry module as middleware). Details and copy-paste samples: [Next.js App Router](FRAMEWORKS/next-app-router.md).

```mermaid
flowchart TD
  REQ[HTTP request]
  MW[Edge middleware]
  H[x-tenant-key / market headers]
  SRV[Server: RSC / Route Handler / Server Action]
  GTH[getTenantFromHeaders]
  RES[ResolvedTenant]

  REQ --> MW
  MW --> H
  H --> SRV
  SRV --> GTH
  GTH --> RES
```

## When not to use

- **Tenant is purely from JWT / session**, never from host — you may still use `TenantsConfig` for markets, but forced routing from `Host` is the wrong mental model.
- **Thousands of dynamic tenants** with no stable domain map — you’ll end up fighting DNS and config size; consider a DB-backed resolver (out of scope for this repo’s core).
- **Edge DB / heavy Node work in middleware** — keep middleware thin; DB access belongs in Node runtimes (see [database scope](INTERNAL/database-scope.md)).

## Common pitfalls

1. **`next dev` on `localhost`** without matching `domains.local` — middleware may passthrough with no tenant; use `multitenant dev` and hosts from your config or set `onMissingTenant: 'throw'` only when you control Host.
2. **Trusting `X-Tenant-Id` from the client** — resolve from **registry + trusted proxy headers**, then validate session if needed.
3. **Duplicating `ResolvedTenant` types** — import from `@multitenant/core`; canonical types live there only (`PLAN.md` Phase 1.3 audit).
4. **Skipping session ↔ host alignment** — if you use identity cookies, the session’s tenant must **match** the tenant resolved from the host on mutating routes; see [Tenant-bound sessions](INTERNAL/tenant-bound-sessions.md).

## Next steps

- [Getting started](GETTING-STARTED.md)
- [Next.js App Router](FRAMEWORKS/next-app-router.md) — middleware, headers, Route Handlers, Server Actions
- [Errors](INTERNAL/errors.md)
- [Tenant-bound sessions](INTERNAL/tenant-bound-sessions.md) — `assertAccess` + resolved tenant

</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
Read
