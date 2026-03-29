import type { TenantRegistry } from './runtime-model';

/**
 * Server-side parity with {@link useTenantConfig} in `@multitenant/react`:
 * returns the tenant’s arbitrary `config` blob from the registry.
 */
export function getTenantConfig<T = Record<string, unknown>>(
  registry: TenantRegistry,
  tenantKey: string,
): T {
  const row = registry.tenants[tenantKey];
  return (row?.config ?? {}) as T;
}

/**
 * Server-side parity with `useTenantFlag`: reads normalized `flags` from tenant definition.
 */
export function isTenantFeatureEnabled(
  registry: TenantRegistry,
  tenantKey: string,
  flagName: string,
): boolean {
  const row = registry.tenants[tenantKey];
  return Boolean(row?.flags?.[flagName]);
}
