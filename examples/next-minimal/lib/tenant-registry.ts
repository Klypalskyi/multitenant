import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import tenantsConfig from '../../../tenants.config.json';

/** Node server components / route handlers only — not imported by Client Components (core pulls `node:fs`). */
export const tenantRegistry = createTenantRegistry(tenantsConfig as TenantsConfig);
