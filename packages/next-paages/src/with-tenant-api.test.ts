import { describe, expect, it, vi } from 'vitest';
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { withTenantApi } from './index';

const minimalMarket = {
  currency: 'USD',
  locale: 'en-US',
  timezone: 'America/New_York',
};

function baseConfig(): TenantsConfig {
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
  };
}

function mockRes() {
  const json = vi.fn();
  const status = vi.fn((_code: number) => ({ json }));
  return { status, json };
}

describe('withTenantApi', () => {
  const registry = createTenantRegistry(baseConfig());

  it('responds 404 with MULTITENANT_TENANT_NOT_FOUND when tenant missing', async () => {
    const handler = vi.fn();
    const wrapped = withTenantApi(handler, { registry, environment: 'local' });
    const req = { headers: { host: 'unknown.example.test' } } as Parameters<
      typeof wrapped
    >[0];
    const { status, json } = mockRes();
    const res = { status, json } as Parameters<typeof wrapped>[1];

    await wrapped(req, res);

    expect(handler).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'MULTITENANT_TENANT_NOT_FOUND',
        error: expect.stringContaining('[multitenant]'),
      }),
    );
  });

  it('runs handler with req.tenant when host matches', async () => {
    const handler = vi.fn();
    const wrapped = withTenantApi(handler, { registry, environment: 'local' });
    const req = { headers: { host: 'app.example.test' } } as Parameters<
      typeof wrapped
    >[0];
    const { status, json } = mockRes();
    const res = { status, json } as Parameters<typeof wrapped>[1];

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(req.tenant?.tenantKey).toBe('us-main');
    expect(status).not.toHaveBeenCalled();
  });
});
