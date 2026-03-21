import { describe, expect, it, vi } from 'vitest';
import type { EnvironmentName, TenantsConfig } from './config-types';
import { DomainResolutionError, InvalidTenantsConfigError, TenantNotFoundError } from './errors';
import { createTenantRegistry } from './runtime-model';

const minimalMarket = {
  currency: 'USD',
  locale: 'en-US',
  timezone: 'America/New_York',
};

function baseConfig(overrides?: Partial<TenantsConfig>): TenantsConfig {
  return {
    version: 1,
    defaultEnvironment: 'local',
    markets: { us: minimalMarket },
    tenants: {
      'us-main': {
        market: 'us',
        domains: {
          local: { 'us.example.test': 'us-main' },
        },
      },
    },
    ...overrides,
  };
}

describe('createTenantRegistry', () => {
  it('resolves host via domain map', () => {
    const r = createTenantRegistry(baseConfig());
    const t = r.resolveByHost('us.example.test');
    expect(t).not.toBeNull();
    expect(t?.tenantKey).toBe('us-main');
    expect(t?.marketKey).toBe('us');
  });

  it('returns null when host does not match', () => {
    const r = createTenantRegistry(baseConfig());
    expect(r.resolveByHost('unknown.example')).toBeNull();
  });

  it('throws DomainResolutionError when domain map is ambiguous', () => {
    const cfg = baseConfig({
      tenants: {
        a: { market: 'us', domains: { local: { 'dup.test': 'a' } } },
        b: { market: 'us', domains: { local: { 'dup.test': 'b' } } },
      },
    });
    const r = createTenantRegistry(cfg);
    expect(() => r.resolveByHost('dup.test')).toThrow(DomainResolutionError);
  });

  it('throws DomainResolutionError for unknown environment', () => {
    const r = createTenantRegistry(baseConfig());
    expect(() =>
      r.resolveByHost('us.example.test', {
        environment: 'bogus' as EnvironmentName,
      }),
    ).toThrow(DomainResolutionError);
  });

  it('throws TenantNotFoundError when domain target points at missing tenant row', () => {
    const cfg = baseConfig({
      tenants: {
        'us-main': {
          market: 'us',
          domains: { local: { 'orphan.test': 'missing-tenant-key' } },
        },
      },
    });
    const r = createTenantRegistry(cfg);
    expect(() => r.resolveByHost('orphan.test')).toThrow(TenantNotFoundError);
  });

  it('throws DomainResolutionError when tenant references unknown market', () => {
    const cfg: TenantsConfig = {
      version: 1,
      markets: { us: minimalMarket },
      tenants: {
        bad: {
          market: 'nope',
          domains: { local: { 'bad.test': 'bad' } },
        },
      },
    };
    const r = createTenantRegistry(cfg);
    expect(() => r.resolveByHost('bad.test')).toThrow(DomainResolutionError);
  });

  it('invokes log when debug is true', () => {
    const log = vi.fn();
    const r = createTenantRegistry(baseConfig(), { debug: true, log });
    r.resolveByHost('us.example.test');
    expect(log).toHaveBeenCalled();
    const first = log.mock.calls[0]?.[0] as string;
    expect(first).toContain('resolve');
  });

  it('uses custom log without requiring debug', () => {
    const log = vi.fn();
    const r = createTenantRegistry(baseConfig(), { log });
    r.resolveByHost('us.example.test');
    expect(log).toHaveBeenCalled();
  });
});

describe('createTenantRegistry auto-load', () => {
  it('throws InvalidTenantsConfigError when config file missing (implicit load)', () => {
    expect(() =>
      createTenantRegistry(undefined, {
        cwd: '/nonexistent/path/that/does/not/exist/ever',
        configPath: '/nonexistent/path/that/does/not/exist/ever/tenants.config.json',
      }),
    ).toThrow(InvalidTenantsConfigError);
  });
});
