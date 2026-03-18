import tenantsConfig from '../tenants.config.json';
import { createTenantRegistry } from '@tenantify/core';

export const tenantRegistry = createTenantRegistry(tenantsConfig as any);
