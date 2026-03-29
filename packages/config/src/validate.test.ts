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
