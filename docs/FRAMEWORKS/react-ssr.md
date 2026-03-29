# React — SSR, server components & `TenantProvider`

Package: `@multitenant/react`. Supplies **`TenantProvider`** (runs in the **client React tree**) and hooks (`useTenant`, `useMarket`, `useTenantConfig`, …).

This page is about **any** server-first React setup: classic SSR (`renderToString` / stream), **React Server Components** (RSC), or “server routes that render HTML + hydrate a client bundle.” It is **not** Next-specific until the examples at the end.

## Mental model

| Where | Role |
|--------|------|
| **Server** (RSC, SSR request handler, Remix `loader`, etc.) | Resolve `ResolvedTenant` from **host + headers** with `createTenantRegistry` + `resolveByRequest` / your adapter. Output HTML or RSC payload. |
| **Client** (browser, `'use client'` tree, hydrated root) | `TenantProvider` + hooks; needs **`TenantRegistry`** + **`ResolvedTenant`**. |

`TenantProvider` is implemented as a **client** module: it uses React context and hooks. It does not run inside a pure RSC-only file without a client boundary below it.

## Serializable props vs `TenantRegistry`

- **`ResolvedTenant`** is a **plain object** (serializable) — safe to pass from a server component to a client component, embed in SSR JSON, or send as loader data.
- **`TenantRegistry`** holds a normalized **merged view** of config (maps, resolution behavior) and is **not** a serializable prop for RSC/Flight or classic `renderToString` hydration — don’t try to pass the registry instance across that boundary.

**Pattern (works for RSC boundaries in general):**

1. On the server: resolve **`tenant: ResolvedTenant`** once per request.
2. Pass **`tenant`** (and `environment` if you want it explicit) **into** a client subtree.
3. Inside that client subtree: **import** a shared module that does `createTenantRegistry(staticConfig)` (same config the server used) and render `<TenantProvider registry={…} tenant={tenant}>`.

The client bundle rebuilds the registry from the **same static config** the server used; the **`tenant`** you pass must **match** what the server computed so hooks and hydration stay consistent.

## Classic SSR (no RSC)

Examples: a custom Express/Vite SSR handler, `renderToPipeableStream`, early Remix patterns, etc.

1. On the request, resolve `tenant` on the server with the same host/headers rules as production.
2. Pass `tenant` into your client entry as `window.__TENANT__`, a `<script type="application/json">`, or your framework’s `initialData`.
3. On the client bootstrap, **`import` the registry** from a shared module (static JSON + `createTenantRegistry`) and mount `<TenantProvider registry={registry} tenant={initialTenant}>`.

Do not rely on **`window.location`** alone for the **first** paint unless it matches exactly what the server used (same proxy, same host header).

## Hydration (any SSR + client hooks)

The first client render must see the **same** `tenant` the server embedded. Re-resolving from the URL on the client is fine **only** if it cannot diverge from server resolution for that request.

## Next.js — App Router (concrete example)

Next documents this heavily because **`'use client'`** makes the boundary explicit. Resolution in the root layout is just one way to get server-side `headers()` + `requireTenant` / `getTenantFromHeaders`; the **RSC rule** above is the same: pass **`tenant`** into a client shell, **import** `tenantRegistry` inside that shell.

### `lib/tenant-registry.ts` (shared; Edge-safe if you only static-import JSON)

```ts
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import tenantsConfig from '../tenants.config.json';

export const tenantRegistry = createTenantRegistry(tenantsConfig as TenantsConfig);

export function multitenantEnv() {
  return (process.env.MULTITENANT_ENV ?? process.env.TENANTIFY_ENV ?? 'local') as import('@multitenant/core').EnvironmentName;
}
```

### `app/providers.tsx` (client boundary)

```tsx
'use client';

import type { ResolvedTenant } from '@multitenant/core';
import type { ReactNode } from 'react';
import { TenantProvider } from '@multitenant/react';
import { multitenantEnv, tenantRegistry } from '@/lib/tenant-registry';

export function MultitenantClientProviders({
  tenant,
  children,
}: {
  tenant: ResolvedTenant;
  children: ReactNode;
}) {
  return (
    <TenantProvider registry={tenantRegistry} tenant={tenant} environment={multitenantEnv()}>
      {children}
    </TenantProvider>
  );
}
```

### `app/layout.tsx` (server)

```tsx
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { requireTenant } from '@multitenant/next-app';
import { multitenantEnv, tenantRegistry } from '@/lib/tenant-registry';
import { MultitenantClientProviders } from './providers';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const tenant = requireTenant(h, tenantRegistry, { environment: multitenantEnv() });

  return (
    <html lang="en">
      <body>
        <MultitenantClientProviders tenant={tenant}>{children}</MultitenantClientProviders>
      </body>
    </html>
  );
}
```

Replace `@/` with your TS path alias. For middleware-injected headers and Edge vs Node details, see [Next.js App Router checklist](next-app-router.md).

## Next.js — Pages Router

In **`getServerSideProps`**, resolve with `registry.resolveByRequest({ host: req.headers.host, headers: req.headers }, { environment })`, pass serializable **`tenant`** into props, and wrap the **client** tree with **`TenantProvider`**. Import **`registry`** inside the client bundle (e.g. `'use client'` shell) rather than passing the registry instance from `getServerSideProps` into client-only code.

## `TenantProvider` recap

- Children that call **`useTenant`** / **`useMarket`** / **`useTenantConfig`** must be under **`TenantProvider`**.
- **`useMarket`** / **`useTenantConfig`** read **`registry.markets`** / **`registry.tenants`** — use the **same** config-derived registry your server resolution used.

## See also

- [Next.js App Router checklist](next-app-router.md) — middleware, headers, Server Actions
- [Framework overview](overview.md)
- [Tenant-bound sessions](../INTERNAL/tenant-bound-sessions.md) — identity beside React context
