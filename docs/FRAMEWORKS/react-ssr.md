# React — SSR & App Router

Package: `@multitenant/react`. Supplies **`TenantProvider`** (client) and hooks (`useTenant`, `useMarket`, `useTenantConfig`, …).

## App Router — RSC boundary

`TenantProvider` needs a **`TenantRegistry`** (object with methods + normalized maps) and a **`ResolvedTenant`** (plain data). You **cannot** pass `registry` from a Server Component into a Client Component — it is not a serializable prop.

**Pattern:** resolve tenant on the **server** (`headers()` + `getTenantFromHeaders` / `requireTenant`). Pass only **`tenant`** (and `environment` if needed) into a small **`'use client'`** shell that **imports the same `tenantRegistry` module** as the server uses (static `tenants.config.json` + `createTenantRegistry`).

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
  // Strict: requireTenant; or getTenantFromHeaders + fallback UI if passthrough middleware
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

Replace `@/` with your TS path alias. **`tenant`** crosses the server → client boundary as serialized props; **`tenantRegistry`** is instantiated only inside the client bundle via import (same module graph the server used for resolution).

## Hydration

The first client render must see the **same** `tenant` the server embedded. Do not re-resolve from `window.location` on the client for the initial tree unless it matches middleware + server headers exactly.

## Pages Router

In **`getServerSideProps`**, call `createTenantRegistry(config)` (or reuse a module singleton), resolve with `registry.resolveByRequest({ host: req.headers.host, headers: req.headers }, { environment })`, then pass `tenant` + `registry` into props and wrap the page with **`TenantProvider`** in `_app.tsx` or the page component. `registry` stays on the server bundle; for a **client-only** subtree you still need a client `TenantProvider` — pass serializable `tenant` and import `registry` inside `'use client'` if the hooks run in the browser.

## `TenantProvider`

- Children that call **`useTenant`** / **`useMarket`** / **`useTenantConfig`** must be under **`TenantProvider`**.
- **`useMarket`** / **`useTenantConfig`** read from **`registry.markets`** / **`registry.tenants`** — the registry you pass must be the same normalized data your server resolution used.

## See also

- [Next.js App Router checklist](next-app-router.md) — middleware headers, Route Handlers
- [Framework overview](overview.md)
- [Tenant-bound sessions](../INTERNAL/tenant-bound-sessions.md) — identity checks beside React context
