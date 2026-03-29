import type { EnvironmentName } from './config-types';
import { mergeTenantConfigLayers } from './config-merge';
import type { TenantRegistry } from './runtime-model';

function configLayersForTenant(
  registry: TenantRegistry,
  tenantKey: string,
  environment?: EnvironmentName,
): Array<Record<string, unknown> | undefined> {
  const tenant = registry.tenants[tenantKey];
  if (!tenant) return [];
  const market = registry.markets[tenant.marketKey];
  const envLayer =
    environment !== undefined ? tenant.configByEnvironment?.[environment] : undefined;
  return [market?.config, tenant.config, envLayer];
}

/**
 * Merged **`config`** for a tenant: **market `config`** → **tenant `config`** → optional **`configByEnvironment[environment]`** (Phase 3.3).
 *
 * When **`environment`** is omitted, only market + tenant layers are merged (no per-env overlay).
 */
export function getTenantConfig<T = Record<string, unknown>>(
  registry: TenantRegistry,
  tenantKey: string,
  environment?: EnvironmentName,
): T {
  const row = registry.tenants[tenantKey];
  if (!row) return {} as T;
  return mergeTenantConfigLayers(configLayersForTenant(registry, tenantKey, environment), {
    tenantKey,
  }) as T;
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
