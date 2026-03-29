import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { TenantsConfig } from '@multitenant/core';
import { TenantNotFoundError, createTenantRegistry } from '@multitenant/core';
import { multitenantExpress } from './index';

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

function mockReq(headers: Record<string, string>): Request {
  return { headers } as Request;
}

describe('multitenantExpress', () => {
  const registry = createTenantRegistry(baseConfig());

  it('attaches ResolvedTenant when host matches (passthrough default)', () => {
    const mw = multitenantExpress({ registry, environment: 'local' });
    const req = mockReq({ host: 'app.example.test' });
    const next = vi.fn() as NextFunction;
    mw(req, {} as Response, next);
    expect(req.tenant?.tenantKey).toBe('us-main');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('sets tenant null and calls next() when host does not match (default)', () => {
    const mw = multitenantExpress({ registry, environment: 'local' });
    const req = mockReq({ host: 'missing.example.test' });
    const next = vi.fn() as NextFunction;
    mw(req, {} as Response, next);
    expect(req.tenant).toBeNull();
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(TenantNotFoundError) when onMissingTenant is throw', () => {
    const mw = multitenantExpress({
      registry,
      environment: 'local',
      onMissingTenant: 'throw',
    });
    const req = mockReq({ host: 'missing.example.test' });
    const next = vi.fn() as NextFunction;
    mw(req, {} as Response, next);
    expect(req.tenant).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(TenantNotFoundError);
  });
});
