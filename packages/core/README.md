# @multitenant/core

Core multi-tenant / multi-market engine used by all other `@multitenant/*` packages.

It provides:

- `TenantsConfig` type describing `tenants.config.json`
- `createTenantRegistry(config)` → `TenantRegistry`
- Resolution helpers: `resolveByHost`, `resolveByRequest`
- Identity types: `Identity`, `EncodedSession`
- Access guards: `canAccessTenant`, `assertAccess`

## Install

```bash
npm install @multitenant/core
```

## Basic usage

```ts
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';

const config: TenantsConfig = {
  version: 1,
  markets: { /* ... */ },
  tenants: { /* ... */ },
};

const registry = createTenantRegistry(config);

const resolved = registry.resolveByHost('us.example.com', { environment: 'production' });
```

