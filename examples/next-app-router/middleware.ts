import type { EnvironmentName } from '@tenantify/core';
import { createTenantMiddleware } from '@tenantify/next-app';
import tenantsConfig from './tenants.config.json';
import { createTenantRegistry } from '@tenantify/core';

const registry = createTenantRegistry(tenantsConfig as any);
const env = (process.env.TENANTIFY_ENV ?? 'local') as EnvironmentName;

export const middleware = createTenantMiddleware(registry, {
  environment: env,
});
