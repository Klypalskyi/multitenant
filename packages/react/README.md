# @multitenant/react

React bindings for `@multitenant/core`. Provides a `TenantProvider` and hooks for accessing the current tenant/market in React components.

## Install

```bash
npm install @multitenant/react @multitenant/core
```

## Usage

```tsx
import React from 'react';
import { TenantProvider, useTenant, useMarket } from '@multitenant/react';
import { createTenantRegistry, type TenantsConfig } from '@multitenant/core';

const config: TenantsConfig = /* your tenants.config.json loaded somehow */;
const registry = createTenantRegistry(config);

function AppInner() {
  const tenant = useTenant();
  const market = useMarket();

  return (
    <div>
      <p>Tenant: {tenant.tenantKey}</p>
      <p>Market: {market.key}</p>
    </div>
  );
}

export function App() {
  const dummyTenant = registry.resolveByHost('us.localhost', { environment: 'local' })!;

  return (
    <TenantProvider registry={registry} tenant={dummyTenant}>
      <AppInner />
    </TenantProvider>
  );
}
```

Available hooks:

- `useTenant()` – current `ResolvedTenant`
- `useMarket()` – `NormalizedMarket`
- `useTenantFlag(name)` – boolean flag
- `useTenantTheme()` – theme config (if configured)
- `useExperiment(key)` – experiment variant
- `useTenantConfig<T>()` – typed arbitrary config blob per tenant

SSR / App Router notes: [react-ssr.md](https://github.com/klypalskyi/multitenant/blob/master/docs/FRAMEWORKS/react-ssr.md).

---

## Open source

MIT licensed — [**github.com/klypalskyi/multitenant**](https://github.com/klypalskyi/multitenant) · [Issues](https://github.com/klypalskyi/multitenant/issues) · [npm](https://www.npmjs.com/package/@multitenant/react)

