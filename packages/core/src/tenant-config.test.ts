import { describe, expect, it } from 'vitest';
import type { TenantsConfig } from './config-types';
import { createTenantRegistry } from './runtime-model';
import { getTenantConfig, isTenantFeatureEnabled } from './tenant-config';

const cfg: TenantsConfig = {
  version: 1,
  markets: {
    us: {
      currency: 'USD',
      locale: 'en-US',
      timezone: 'America/New_York',
      config: { tier: 'standard', nested: { x: 1 } },
    },
  },
  tenants: {
    a: {
      market: 'us',
      domains: { local: { 'a.test': 'a' } },
      config: { theme: 'dark', quota: 10, nested: { y: 2 } },
      configByEnvironment: {
        local: { quota: 99, flags: { debug: true } },
      },
      flags: { beta: true, foo: false },
    },
  },
};

describe('getTenantConfig', () => {
  it('merges market → tenant (no env layer when environment omitted)', () => {
    const r = createTenantRegistry(cfg);
    expect(getTenantConfig(r, 'a')).toEqual({
      tier: 'standard',
      theme: 'dark',
      quota: 10,
      nested: { x: 1, y: 2 },
    });
  });

  it('merges market → tenant → configByEnvironment when environment passed', () => {
    const r = createTenantRegistry(cfg);
    expect(getTenantConfig(r, 'a', 'local')).toEqual({
      tier: 'standard',
      theme: 'dark',
      quota: 99,
      nested: { x: 1, y: 2 },
      flags: { debug: true },
    });
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
