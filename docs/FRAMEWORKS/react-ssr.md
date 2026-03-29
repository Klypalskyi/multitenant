# React — SSR & App Router

Package: `@multitenant/react`. Supplies **`TenantProvider`** and hooks (`useTenant`, `useMarket`, `useTenantConfig`, …).

## App Router

1. Resolve tenant in **`middleware`** (`@multitenant/next-app`) so request headers carry `x-tenant-key`, etc.
2. In the **root layout** (server component), read `headers()` and `getTenantFromHeaders` / `requireTenant`, then pass the serializable bits into a client `TenantProvider` **or** render children that only use hooks below a client boundary that receives initial values.

Keep a **single source of truth**: either headers from middleware + `getTenantFromHeaders` on the server match what `TenantProvider` exposes on the client, or you risk hydration mismatches.

## `TenantProvider`

- Provide `resolved` (or the props your app uses) from server-derived data where possible so the first client paint matches the server.
- Do not call hooks that depend on tenant **above** `TenantProvider` in the same tree without providing context.

## See also

- [Next.js App Router checklist](next-app-router.md)
- [Framework overview](overview.md)
