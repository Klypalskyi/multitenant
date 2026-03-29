import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';

export interface ResolveTenantDatabaseUrlOptions {
  /** Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /**
   * When `true` (default): if `tenant.database.envVar` is set but the env value is missing/empty, throw.
   * When `false`: return `undefined` instead.
   */
  required?: boolean;
}

/**
 * Read per-tenant database URL from environment using **`tenants[tenantKey].database.envVar`**
 * in validated config (Phase 8.5). Pass **`registry.tenants`** (normalized map from `TenantRegistry`) or
 * raw `TenantsConfig.tenants` — shape includes optional `database`.
 *
 * Never pass raw secrets in JSON; only env var **names**.
 */
export function resolveTenantDatabaseUrl(
  resolved: ResolvedTenant,
  tenants: Record<string, TenantDefinition>,
  options?: ResolveTenantDatabaseUrlOptions,
): string | undefined {
  const env = options?.env ?? process.env;
  const row = tenants[resolved.tenantKey];
  const ref = row?.database;
  if (!ref?.envVar) {
    return undefined;
  }
  const raw = env[ref.envVar];
  const url = raw !== undefined && raw !== null ? String(raw).trim() : '';
  if (!url) {
    if (options?.required !== false) {
      throw new Error(
        `[multitenant/database] Missing database URL: environment variable "${ref.envVar}" is unset or empty for tenant "${resolved.tenantKey}"`,
      );
    }
    return undefined;
  }
  return url;
}
