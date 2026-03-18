import express from 'express';
import { loadTenantsConfig } from '@tenantify/config';
import { createTenantRegistry } from '@tenantify/core';
import { tenantifyExpress } from '@tenantify/express';

async function main() {
  const app = express();
  const config = await loadTenantsConfig({ cwd: process.cwd() });
  const registry = createTenantRegistry(config);

  app.use(tenantifyExpress({ registry, environment: 'local' }));

  app.get('/', (req, res) => {
    if (!req.tenant) return res.status(404).send('no tenant');
    res.send(`Tenant ${req.tenant.tenantKey}, market ${req.tenant.marketKey}`);
  });

  app.listen(3000, () => {
    console.log('Express example listening on http://localhost:3000');
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
