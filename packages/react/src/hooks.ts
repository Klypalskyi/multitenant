'use client';

import { getTenantConfig, type ThemeConfigRef } from '@multitenant/core';
import { useTenantContext } from './context';

export function useTenant() {
  return useTenantContext().tenant;
}

export function useMarket(): import('@multitenant/core').NormalizedMarket {
  const { registry, tenant } = useTenantContext();
  const market = registry.markets[tenant.marketKey];
  if (!market) {
    throw new Error(`[multitenant] Market "${tenant.marketKey}" not found`);
  }
  return market;
}

export function useTenantFlag(name: string): boolean {
  const { tenant } = useTenantContext();
  return Boolean(tenant.flags?.[name]);
}

export function useTenantTheme(): ThemeConfigRef | null {
  const { tenant } = useTenantContext();
  return tenant.theme ?? null;
}

export function useExperiment(key: string): string {
  const { tenant } = useTenantContext();
  const variant = tenant.experiments?.[key];
  if (variant === undefined) {
    throw new Error(
      `[multitenant] Experiment "${key}" not found for tenant`,
    );
  }
  return variant;
}

export function useTenantConfig<T = Record<string, unknown>>(): T {
  const { registry, tenant } = useTenantContext();
  return getTenantConfig<T>(registry, tenant.tenantKey, tenant.environment);
}
