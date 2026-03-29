# @multitenant/core

Core multi-tenant / multi-market engine used by all other `@multitenant/*` packages.

It provides:

- `TenantsConfig` type describing `tenants.config.json`
- `createTenantRegistry(config?, options?)` → `TenantRegistry`
- Resolution helpers: `resolveByHost`, `resolveByRequest`
- `getTenantConfig(registry, tenantKey)`, `isTenantFeatureEnabled(flags, name)` — server / shared flag checks
- Typed errors: `MultitenantError`, `InvalidTenantsConfigError`, `DomainResolutionError`, `TenantNotFoundError`, `isMultitenantError` — see [errors doc](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/errors.md)
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

// Manual mode: pass the loaded config
const registry = createTenantRegistry(config);

// Node-only convenience mode:
// const registry = createTenantRegistry();
// (auto-loads `<process.cwd()>/tenants.config.json`; in edge runtimes pass config explicitly)

const resolved = registry.resolveByHost('us.example.com', { environment: 'production' });
```

---

## Open source

MIT licensed — [**github.com/klypalskyi/multitenant**](https://github.com/klypalskyi/multitenant) · [Issues](https://github.com/klypalskyi/multitenant/issues) · [npm](https://www.npmjs.com/package/@multitenant/core)
