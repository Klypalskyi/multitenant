# @multitenant/config

Node-only helpers for loading and validating `tenants.config.json` used by `@multitenant/core`.

It provides:

- `loadTenantsConfig({ cwd? })` → `Promise<TenantsConfig>`
- `validateTenantsConfig(raw)` → `TenantsConfig`
- `resolveConfigPath(cwd?)` → `string | null`

## Install

```bash
npm install @multitenant/config
```

## Usage

```ts
import { loadTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';

async function bootstrap() {
  const config = await loadTenantsConfig({ cwd: process.cwd() });
  const registry = createTenantRegistry(config);
  // use registry in your app/server
}
```

