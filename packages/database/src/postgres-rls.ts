/**
 * Helpers for **Postgres row-level security** with a per-transaction tenant discriminator
 * stored in a **custom runtime parameter** (`SET LOCAL` + `current_setting(..., true)` in policies).
 *
 * This module does **not** connect to Postgres — it only validates names and builds SQL **strings**
 * for your driver/query layer.
 */

/** Default GUC for policies: `current_setting('app.tenant_id', true)`. */
export const POSTGRES_RLS_TENANT_GUC_DEFAULT = 'app.tenant_id';

/** Safe subset for custom `SET LOCAL name TO ...` names (unquoted identifiers + dots). */
const CUSTOM_GUC_NAME_RE = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/i;

export function assertSafePostgresCustomGucName(name: string): void {
  if (!name || !CUSTOM_GUC_NAME_RE.test(name)) {
    throw new Error(
      `[multitenant/database] Invalid Postgres custom GUC name "${name}" — use segments like app.tenant_id (letters, digits, underscore, dots only)`,
    );
  }
}

/** Escape a value for a **single-quoted** Postgres string literal. */
export function escapePostgresStringLiteral(value: string): string {
  if (value.includes('\0')) {
    throw new Error('[multitenant/database] Postgres string literal cannot contain null bytes');
  }
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Build `SET LOCAL <guc> TO '<tenantKey>'` for use at the **start of each transaction**
 * that runs tenant-scoped queries (pair with RLS policies reading `current_setting(..., true)`).
 */
export function buildSetLocalTenantGucSql(gucName: string, tenantKey: string): string {
  assertSafePostgresCustomGucName(gucName);
  if (tenantKey === undefined || tenantKey === null || String(tenantKey).trim() === '') {
    throw new Error('[multitenant/database] buildSetLocalTenantGucSql: tenantKey must be non-empty');
  }
  const key = String(tenantKey);
  return `SET LOCAL ${gucName} TO ${escapePostgresStringLiteral(key)}`;
}
