'use strict';

const path = require('node:path');
const express = require('express');
const { loadTenantsConfig } = require('@multitenant/config');
const { createTenantRegistry } = require('@multitenant/core');
const { multitenantExpress } = require('@multitenant/express');

/** Monorepo root (contains tenants.config.json). */
const repoRoot = path.join(__dirname, '..', '..');

async function createApp() {
  const app = express();
  const config = await loadTenantsConfig({ cwd: repoRoot });
  const registry = createTenantRegistry(config);

  app.use(multitenantExpress({ registry, environment: 'local' }));

  app.get('/', (req, res) => {
    if (!req.tenant) return res.status(404).send('no tenant');
    res.type('text/plain').send(`Tenant ${req.tenant.tenantKey}, market ${req.tenant.marketKey}`);
  });

  return app;
}

module.exports = { createApp, repoRoot };
