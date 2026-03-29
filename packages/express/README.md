# @multitenant/express

Express integration for `@multitenant/core`. Adds a `tenant` property to each request based on the Host header.

## Install

```bash
npm install @multitenant/express @multitenant/core
```

Peer dependency:

- `express >= 4`

## Usage

```ts
import express from 'express';
import { loadTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';
import { multitenantExpress } from '@multitenant/express';

async function main() {
  const app = express();
  const config = await loadTenantsConfig({ cwd: process.cwd() });
  const registry = createTenantRegistry(config);

  app.use(
    multitenantExpress({
      registry,
      environment: 'local',
      // optional: onMissingTenant: 'throw' → next(TenantNotFoundError); add error middleware
    }),
  );

  app.get('/', (req, res) => {
    if (!req.tenant) return res.status(404).send('no tenant');
    res.send(`Tenant ${req.tenant.tenantKey}, market ${req.tenant.marketKey}`);
  });

  app.listen(3000);
}

main();
```

