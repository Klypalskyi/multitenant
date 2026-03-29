import { describe, expect, it, vi } from 'vitest';
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { createMultitenantNestMiddleware } from './index';

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
          local: { 'app.example.test': 'us-main' },
        },
      },
    },
    ...overrides,
  };
}

function mockReq(headers: Record<string, string | string[]>): { headers: typeof headers; tenant?: unknown } {
  return { headers };
}

describe('createMultitenantNestMiddleware', () => {
  const registry = createTenantRegistry(baseConfig());

  it('prefers x-forwarded-host over host', () => {
    const mw = createMultitenantNestMiddleware(registry, 'local');
    const req = mockReq({
      host: 'wrong.example.test',
      'x-forwarded-host': 'app.example.test',
    });
    const next = vi.fn();
    mw(req as any, {} as any, next);
    expect(req.tenant?.tenantKey).toBe('us-main');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('attaches ResolvedTenant when host matches', () => {
    const mw = createMultitenantNestMiddleware(registry, 'local');
    const req = mockReq({ host: 'app.example.test' });
    const next = vi.fn();
    mw(req as any, {} as any, next);
    expect(req.tenant?.tenantKey).toBe('us-main');
    expect(next).toHaveBeenCalledWith();
  });

  it('sets tenant null when host does not match', () => {
    const mw = createMultitenantNestMiddleware(registry, 'local');
    const req = mockReq({ host: 'missing.example.test' });
    const next = vi.fn();
    mw(req as any, {} as any, next);
    expect(req.tenant).toBeNull();
    expect(next).toHaveBeenCalledWith();
  });

  it('uses first forwarded host when header is an array', () => {
    const mw = createMultitenantNestMiddleware(registry, 'local');
    const req = mockReq({ host: 'ignored.test', 'x-forwarded-host': ['app.example.test', 'other.test'] });
    const next = vi.fn();
    mw(req as any, {} as any, next);
    expect(req.tenant?.tenantKey).toBe('us-main');
  });
});
