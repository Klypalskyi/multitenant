import type { EnvironmentName } from '@multitenant/core';
import { createTenantMiddleware } from '@multitenant/next-app';
import tenantsConfig from './tenants.config.json';
import { createTenantRegistry } from '@multitenant/core';

const registry = createTenantRegistry(tenantsConfig as any);
const env = (
  process.env.MULTITENANT_ENV ??
  process.env.TENANTIFY_ENV ??
  'local'
) as EnvironmentName;

export const middleware = createTenantMiddleware(registry, {
  environment: env,
});
