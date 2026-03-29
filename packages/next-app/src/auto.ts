import type { EnvironmentName, TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import type { CreateTenantMiddlewareOptions } from './index';
import { createTenantMiddleware } from './index';

/**
 * Build App Router middleware from an in-memory `TenantsConfig`.
 * **Edge-safe** when `tenantsConfig` comes from a static import of JSON
 * (bundled at build time). Same pattern as `multitenant init`’s `middleware.ts` stub.
 */
export function createTenantMiddlewareFromConfig(
  tenantsConfig: TenantsConfig,
  options?: CreateTenantMiddlewareOptions,
): ReturnType<typeof createTenantMiddleware> {
  const registry = createTenantRegistry(tenantsConfig);
  return createTenantMiddleware(registry, options);
}

export type { EnvironmentName, TenantsConfig, CreateTenantMiddlewareOptions };
