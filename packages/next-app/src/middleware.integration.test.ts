import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import type { TenantsConfig } from '@multitenant/core';
import { TenantNotFoundError, createTenantRegistry } from '@multitenant/core';
import { createTenantMiddleware, getTenantFromHeaders, requireTenant } from './index';

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

describe('createTenantMiddleware (integration)', () => {
  const registry = createTenantRegistry(baseConfig());

  it('throws TenantNotFoundError when onMissingTenant is throw', () => {
    const mw = createTenantMiddleware(registry, {
      environment: 'local',
      onMissingTenant: 'throw',
    });
    const req = new NextRequest(new URL('http://nope.example.test/'), {
      headers: { host: 'nope.example.test' },
    });
    expect(() => mw(req)).toThrow(TenantNotFoundError);
  });

  it('returns NextResponse.next when tenant missing and onMissingTenant is passthrough', () => {
    const mw = createTenantMiddleware(registry, {
      environment: 'local',
      onMissingTenant: 'passthrough',
    });
    const req = new NextRequest(new URL('http://unknown.example.test/'), {
      headers: { host: 'unknown.example.test' },
    });
    const res = mw(req);
    expect(res.status).toBe(200);
  });

  it('rewrites request so downstream headers include tenant markers when host matches', () => {
    const mw = createTenantMiddleware(registry, { environment: 'local' });
    const req = new NextRequest(new URL('http://us.example.test/dashboard'), {
      headers: { host: 'us.example.test' },
    });
    const res = mw(req);
    expect(res.status).toBe(200);
    // Next forwards overridden request headers via the internal middleware header prefix
    const tenantViaMiddleware = res.headers.get('x-middleware-request-x-tenant-key');
    expect(tenantViaMiddleware).toBe('us-main');
  });
});

describe('getTenantFromHeaders / requireTenant', () => {
  const registry = createTenantRegistry(baseConfig());

  it('getTenantFromHeaders returns tenant when host matches', () => {
    const h = new Headers({
      host: 'us.example.test',
    });
    const t = getTenantFromHeaders(h, registry, { environment: 'local' });
    expect(t?.tenantKey).toBe('us-main');
  });

  it('requireTenant throws TenantNotFoundError when headers do not resolve', () => {
    const h = new Headers({ host: 'missing.example.test' });
    expect(() => requireTenant(h, registry, { environment: 'local' })).toThrow(
      TenantNotFoundError,
    );
  });
});
