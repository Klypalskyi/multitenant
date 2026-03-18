import tenantsConfig from '../tenants.config.json';
import { createTenantRegistry } from '@multitenant/core';

export const tenantRegistry = createTenantRegistry(tenantsConfig as any);
