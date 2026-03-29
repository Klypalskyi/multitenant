import { AsyncLocalStorage } from 'node:async_hooks';
import type { ResolvedTenant } from '@multitenant/core';
import { schemaNameForTenant } from './schema-name';

export { POSTGRES_MAX_IDENTIFIER_BYTES, schemaNameForTenant } from './schema-name';

export interface TenantScopeState {
  tenantKey: string;
  resolved?: ResolvedTenant;
}

const storage = new AsyncLocalStorage<TenantScopeState>();

/**
 * Run `fn` with tenant scope stored for the current async execution.
 * Use at the HTTP boundary (after tenant resolution) — see Phase 8 PLAN.
 */
export function runWithTenantScope<T>(scope: TenantScopeState, fn: () => T): T {
  return storage.run(scope, fn);
}

export async function runWithTenantScopeAsync<T>(
  scope: TenantScopeState,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(scope, fn);
}

/** Current scope, if any (inside `runWithTenantScope`). */
export function getTenantScope(): TenantScopeState | undefined {
  return storage.getStore();
}

export function requireTenantScope(): TenantScopeState {
  const s = storage.getStore();
  if (!s) {
    throw new Error(
      '[multitenant/database] No tenant scope in AsyncLocalStorage (call runWithTenantScope at HTTP boundary)',
    );
  }
  return s;
}

/** Convenience for repository code: current `tenantKey` or throw if no ALS scope. */
export function requireTenantKey(): string {
  return requireTenantScope().tenantKey;
}

/** `schemaNameForTenant(requireTenantKey(), options)` — for `SET search_path` / qualified names inside ALS scope. */
export function requireSchemaNameForCurrentTenant(
  options?: Parameters<typeof schemaNameForTenant>[1],
): string {
  return schemaNameForTenant(requireTenantKey(), options);
}

/**
 * Build an INSERT/UPDATE payload with the scoped tenant key on `columnName` (default `tenant_id`).
 * Throws if the row already sets that column to a different tenant (catch merge / ORM bugs early).
 */
export function assignTenantIdForWrite(
  row: Record<string, unknown>,
  columnName = 'tenant_id',
): Record<string, unknown> {
  if (!columnName) {
    throw new Error('[multitenant/database] assignTenantIdForWrite: columnName must be non-empty');
  }
  const key = requireTenantKey();
  const existing = row[columnName];
  if (existing !== undefined && existing !== null && String(existing) !== key) {
    throw new Error(
      `[multitenant/database] Row ${columnName} (${String(existing)}) conflicts with current tenant scope (${key})`,
    );
  }
  return { ...row, [columnName]: key };
}

/**
 * After a SELECT, assert the row’s tenant column matches ALS scope — defense in depth before returning data.
 */
export function assertRowTenantColumn(row: Record<string, unknown>, columnName = 'tenant_id'): void {
  if (!columnName) {
    throw new Error('[multitenant/database] assertRowTenantColumn: columnName must be non-empty');
  }
  const key = requireTenantKey();
  const v = row[columnName];
  if (v === undefined || v === null) {
    throw new Error(
      `[multitenant/database] Row missing required column ${columnName} (needed for tenant isolation check)`,
    );
  }
  if (String(v) !== key) {
    throw new Error(
      `[multitenant/database] Row ${columnName} (${String(v)}) does not match current tenant scope (${key})`,
    );
  }
}
