import type { EnvironmentName, TenantsConfig } from '@multitenant/core';

import { createTenantMiddleware } from '@multitenant/next-app';
import { createTenantRegistry } from '@multitenant/core';
import tenantsConfig from '../../tenants.config.json';

const registry = createTenantRegistry(tenantsConfig as TenantsConfig);
const env = (
  process.env.MULTITENANT_ENV ??
  process.env.TENANTIFY_ENV ??
  'local'
) as EnvironmentName;

export const middleware = createTenantMiddleware(registry, {
  environment: env,
});
