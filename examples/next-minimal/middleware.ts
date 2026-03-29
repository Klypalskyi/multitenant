import type { EnvironmentName, TenantsConfig } from '@multitenant/core';
import { createTenantMiddlewareFromConfig } from '@multitenant/next-app/auto';
import tenantsConfig from '../../tenants.config.json';

const env = (
  process.env.MULTITENANT_ENV ?? process.env.TENANTIFY_ENV ?? 'local'
) as EnvironmentName;

export const middleware = createTenantMiddlewareFromConfig(tenantsConfig as TenantsConfig, {
  environment: env,
});
