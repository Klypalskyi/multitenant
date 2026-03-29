# @multitenant/dev-proxy

Low-level HTTP dev proxy for multi-tenant apps. Used by `@multitenant/cli` but can be consumed directly.

Given a `TenantRegistry`, it:

- Listens on a local port
- Resolves tenant by `Host` header
- Forwards requests to your app’s dev server
- Injects tenant/market headers (e.g. `x-tenant-key`, `x-market-key`)

## Install

```bash
npm install @multitenant/dev-proxy
```

## Usage

```ts
import { startDevProxy } from '@multitenant/dev-proxy';
import { createTenantRegistry } from '@multitenant/core';
import type { TenantsConfig } from '@multitenant/core';

const config: TenantsConfig = /* load from tenants.config.json */;
const registry = createTenantRegistry(config);

async function main() {
  const proxy = await startDevProxy({
    registry,
    environment: 'local',
    host: '0.0.0.0',
    port: 3100,
    targetHost: 'localhost',
    targetPort: 3000,
  });

  console.log(`Dev proxy on http://0.0.0.0:${proxy.port}`);
}

main();
```

---

## Open source

MIT licensed — [**github.com/klypalskyi/multitenant**](https://github.com/klypalskyi/multitenant) · [Issues](https://github.com/klypalskyi/multitenant/issues) · [npm](https://www.npmjs.com/package/@multitenant/dev-proxy)

