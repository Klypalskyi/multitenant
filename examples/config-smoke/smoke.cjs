'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createTenantRegistry } = require('@multitenant/core');
const { validateTenantsConfig } = require('@multitenant/config');

const rootConfig = path.join(__dirname, '..', '..', 'tenants.config.json');
const raw = JSON.parse(fs.readFileSync(rootConfig, 'utf8'));
const config = validateTenantsConfig(raw);
const registry = createTenantRegistry(config);

const resolved = registry.resolveByHost('us.localhost', { environment: 'local' });
if (!resolved || resolved.tenantKey !== 'us-main') {
  console.error('[config-smoke] expected us.localhost -> us-main, got:', resolved);
  process.exit(1);
}

const miss = registry.resolveByHost('definitely-not-a-tenant.invalid', { environment: 'local' });
if (miss !== null) {
  console.error('[config-smoke] expected unknown host -> null, got:', miss);
  process.exit(1);
}

console.log('[config-smoke] ok — us.localhost →', resolved.tenantKey);
