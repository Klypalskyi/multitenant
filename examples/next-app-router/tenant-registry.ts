import { createTenantRegistry } from '@tenantify/core';
import tenantsConfig from '../../tenants.config.json';

export const tenantRegistry = createTenantRegistry(tenantsConfig as any);
