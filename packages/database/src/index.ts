import { AsyncLocalStorage } from 'node:async_hooks';
import type { ResolvedTenant } from '@multitenant/core';

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
