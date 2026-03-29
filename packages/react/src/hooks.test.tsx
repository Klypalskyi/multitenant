import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { TenantProvider, useTenantContext } from './context';
import {
  useExperiment,
  useMarket,
  useTenant,
  useTenantConfig,
  useTenantFlag,
  useTenantTheme,
} from './hooks';

function baseConfig(): TenantsConfig {
  return {
    version: 1,
    defaultEnvironment: 'local',
    markets: {
      us: { currency: 'USD', locale: 'en-US', timezone: 'America/New_York' },
    },
    experiments: {
      hero: { description: 'Hero', defaultVariant: 'control', variants: ['control', 'variant_a'] },
    },
    tenants: {
      'us-main': {
        market: 'us',
        domains: { local: { 'app.test': 'us-main' } },
        flags: { beta: true },
        config: { apiUrl: 'https://api.example' },
        experiments: {
          hero: { forcedVariant: 'variant_a' },
        },
      },
    },
  };
}

function makeFixture() {
  const registry = createTenantRegistry(baseConfig());
  const tenant = registry.resolveByHost('app.test', { environment: 'local' });
  if (!tenant) throw new Error('fixture: expected resolution');
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TenantProvider registry={registry} tenant={tenant} environment="local">
        {children}
      </TenantProvider>
    );
  }
  return { registry, tenant, Wrapper };
}

describe('hooks', () => {
  it('useTenant returns resolved tenant', () => {
    const { tenant, Wrapper } = makeFixture();
    const { result } = renderHook(() => useTenant(), { wrapper: Wrapper });
    expect(result.current).toBe(tenant);
    expect(result.current.tenantKey).toBe('us-main');
  });

  it('useMarket returns market from registry', () => {
    const { Wrapper } = makeFixture();
    const { result } = renderHook(() => useMarket(), { wrapper: Wrapper });
    expect(result.current.currency).toBe('USD');
    expect(result.current.key).toBe('us');
  });

  it('useTenantFlag reads tenant flags', () => {
    const { Wrapper } = makeFixture();
    const { result } = renderHook(() => useTenantFlag('beta'), { wrapper: Wrapper });
    expect(result.current).toBe(true);
  });

  it('useTenantFlag is false when flag missing', () => {
    const { Wrapper } = makeFixture();
    const { result } = renderHook(() => useTenantFlag('nope'), { wrapper: Wrapper });
    expect(result.current).toBe(false);
  });

  it('useTenantConfig returns tenant config object', () => {
    const { Wrapper } = makeFixture();
    const { result } = renderHook(() => useTenantConfig<{ apiUrl: string }>(), { wrapper: Wrapper });
    expect(result.current.apiUrl).toBe('https://api.example');
  });

  it('useExperiment returns forced variant when set', () => {
    const { Wrapper } = makeFixture();
    const { result } = renderHook(() => useExperiment('hero'), { wrapper: Wrapper });
    expect(result.current).toBe('variant_a');
  });

  it('useTenantTheme returns null when tenant has no theme', () => {
    const { Wrapper } = makeFixture();
    const { result } = renderHook(() => useTenantTheme(), { wrapper: Wrapper });
    expect(result.current).toBeNull();
  });

  it('useTenantContext throws outside TenantProvider', () => {
    expect(() => renderHook(() => useTenantContext())).toThrow(
      '[multitenant] useTenant() must be used within TenantProvider',
    );
  });

  it('useExperiment throws when experiment missing on tenant', () => {
    const cfg = baseConfig();
    delete cfg.experiments;
    const registry = createTenantRegistry(cfg);
    const tenant = registry.resolveByHost('app.test', { environment: 'local' });
    if (!tenant) throw new Error('fixture');
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <TenantProvider registry={registry} tenant={tenant}>
          {children}
        </TenantProvider>
      );
    }
    expect(() => renderHook(() => useExperiment('hero'), { wrapper: Wrapper })).toThrow(
      'Experiment "hero" not found',
    );
  });
});
