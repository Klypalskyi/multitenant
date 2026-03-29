import { describe, expect, it } from 'vitest';
import type { TenantsConfig } from './config-types';
import { createTenantRegistry } from './runtime-model';
import { getTenantConfig, isTenantFeatureEnabled } from './tenant-config';

const cfg: TenantsConfig = {
  version: 1,
  markets: {
    us: { currency: 'USD', locale: 'en-US', timezone: 'America/New_York' },
  },
  tenants: {
    a: {
      market: 'us',
      domains: { local: { 'a.test': 'a' } },
      config: { theme: 'dark', quota: 10 },
      flags: { beta: true, foo: false },
    },
  },
};

describe('getTenantConfig', () => {
  it('returns tenant config blob matching registry row', () => {
    const r = createTenantRegistry(cfg);
    expect(getTenantConfig(r, 'a')).toEqual({ theme: 'dark', quota: 10 });
  });

  it('returns empty object for unknown tenant', () => {
    const r = createTenantRegistry(cfg);
    expect(getTenantConfig(r, 'nope')).toEqual({});
  });
});

describe('isTenantFeatureEnabled', () => {
  it('reads flags from normalized tenant', () => {
    const r = createTenantRegistry(cfg);
    expect(isTenantFeatureEnabled(r, 'a', 'beta')).toBe(true);
    expect(isTenantFeatureEnabled(r, 'a', 'foo')).toBe(false);
    expect(isTenantFeatureEnabled(r, 'a', 'missing')).toBe(false);
  });

  it('is false for unknown tenant', () => {
    const r = createTenantRegistry(cfg);
    expect(isTenantFeatureEnabled(r, 'nope', 'beta')).toBe(false);
  });
});
