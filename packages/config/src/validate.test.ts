import { describe, expect, it } from 'vitest';
import { InvalidTenantsConfigError } from '@multitenant/core';
import { validateTenantsConfig } from './index';

describe('validateTenantsConfig', () => {
  it('throws InvalidTenantsConfigError for invalid schema', () => {
    expect(() => validateTenantsConfig({})).toThrow(InvalidTenantsConfigError);
  });

  it('accepts tenants.database.envVar when valid', () => {
    const raw = {
      version: 1,
      markets: {
        us: { currency: 'USD', locale: 'en-US', timezone: 'UTC' },
      },
      tenants: {
        a: {
          market: 'us',
          domains: { local: { 'a.test': 'a' } },
          database: { envVar: 'DATABASE_URL_TENANT_A' },
        },
      },
    };
    expect(() => validateTenantsConfig(raw)).not.toThrow();
    const cfg = validateTenantsConfig(raw);
    expect(cfg.tenants.a.database?.envVar).toBe('DATABASE_URL_TENANT_A');
  });

  it('throws for invalid database.envVar name', () => {
    const raw = {
      version: 1,
      markets: {
        us: { currency: 'USD', locale: 'en-US', timezone: 'UTC' },
      },
      tenants: {
        a: {
          market: 'us',
          domains: { local: { 'a.test': 'a' } },
          database: { envVar: 'postgres://secret' },
        },
      },
    };
    expect(() => validateTenantsConfig(raw)).toThrow(InvalidTenantsConfigError);
  });

  it('throws when market/tenant config merge has object vs scalar conflict', () => {
    const raw = {
      version: 1,
      markets: {
        us: {
          currency: 'USD',
          locale: 'en-US',
          timezone: 'UTC',
          config: { a: { b: 1 } },
        },
      },
      tenants: {
        x: {
          market: 'us',
          domains: { local: { 'x.test': 'x' } },
          config: { a: 2 },
        },
      },
    };
    expect(() => validateTenantsConfig(raw)).toThrow(InvalidTenantsConfigError);
  });

  it('throws when configByEnvironment overlay conflicts with nested object', () => {
    const raw = {
      version: 1,
      markets: {
        us: { currency: 'USD', locale: 'en-US', timezone: 'UTC' },
      },
      tenants: {
        x: {
          market: 'us',
          domains: { local: { 'x.test': 'x' } },
          config: { features: { a: 1 } },
          configByEnvironment: {
            local: { features: 'all' },
          },
        },
      },
    };
    expect(() => validateTenantsConfig(raw)).toThrow(InvalidTenantsConfigError);
  });

  it('accepts valid market → tenant → configByEnvironment merge', () => {
    const raw = {
      version: 1,
      markets: {
        us: {
          currency: 'USD',
          locale: 'en-US',
          timezone: 'UTC',
          config: { base: 1, deep: { x: 0 } },
        },
      },
      tenants: {
        x: {
          market: 'us',
          domains: { local: { 'x.test': 'x' } },
          config: { y: 2, deep: { y: 1 } },
          configByEnvironment: {
            local: { z: 3, deep: { x: 1 } },
          },
        },
      },
    };
    expect(() => validateTenantsConfig(raw)).not.toThrow();
  });

  it('throws InvalidTenantsConfigError for overlapping domains', () => {
    const raw = {
      version: 1,
      markets: {
        us: { currency: 'USD', locale: 'en-US', timezone: 'UTC' },
      },
      tenants: {
        a: { market: 'us', domains: { local: { 'dup.test': 'a' } } },
        b: { market: 'us', domains: { local: { 'dup.test': 'b' } } },
      },
    };
    expect(() => validateTenantsConfig(raw)).toThrow(InvalidTenantsConfigError);
  });
});
