import { afterEach, describe, expect, it, vi } from 'vitest';
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
        flags: { beta: true, darkMode: false },
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
    expect(res.headers.get('x-middleware-request-x-market-key')).toBe('us');
    expect(res.headers.get('x-middleware-request-x-tenant-env')).toBe('local');
    const flags = res.headers.get('x-middleware-request-x-tenant-flags');
    expect(flags).toBeTruthy();
    expect(JSON.parse(flags!)).toEqual({ beta: true, darkMode: false });
  });

  it('prefers x-forwarded-host (first entry) over Host for resolution', () => {
    const mw = createTenantMiddleware(registry, { environment: 'local' });
    const req = new NextRequest(new URL('http://127.0.0.1/'), {
      headers: {
        host: '127.0.0.1',
        'x-forwarded-host': 'us.example.test, other.invalid',
      },
    });
    const res = mw(req);
    expect(res.headers.get('x-middleware-request-x-tenant-key')).toBe('us-main');
  });

  it('onMissingTenant warn logs once per host then passes through', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mw = createTenantMiddleware(registry, {
      environment: 'local',
      onMissingTenant: 'warn',
    });
    const mk = () =>
      new NextRequest(new URL('http://unknown.example.test/'), {
        headers: { host: 'unknown.example.test' },
      });
    expect(mw(mk()).status).toBe(200);
    expect(mw(mk()).status).toBe(200);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('unknown.example.test');
    warn.mockRestore();
  });

  it('honors custom header option names on the rewritten request', () => {
    const mw = createTenantMiddleware(registry, {
      environment: 'local',
      headers: {
        tenantKey: 'x-org-tenant',
        marketKey: 'x-org-market',
        flags: 'x-org-flags',
        environment: 'x-org-env',
      },
    });
    const req = new NextRequest(new URL('http://us.example.test/'), {
      headers: { host: 'us.example.test' },
    });
    const res = mw(req);
    expect(res.headers.get('x-middleware-request-x-org-tenant')).toBe('us-main');
    expect(res.headers.get('x-middleware-request-x-org-market')).toBe('us');
    expect(res.headers.get('x-middleware-request-x-org-env')).toBe('local');
    expect(JSON.parse(res.headers.get('x-middleware-request-x-org-flags')!)).toEqual({
      beta: true,
      darkMode: false,
    });
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

  it('getTenantFromHeaders prefers x-forwarded-host over host', () => {
    const h = new Headers({
      host: 'internal.local',
      'x-forwarded-host': 'us.example.test',
    });
    const t = getTenantFromHeaders(h, registry, { environment: 'local' });
    expect(t?.tenantKey).toBe('us-main');
  });

  it('requireTenant returns ResolvedTenant when host matches', () => {
    const h = new Headers({ host: 'us.example.test' });
    const t = requireTenant(h, registry, { environment: 'local' });
    expect(t.tenantKey).toBe('us-main');
    expect(t.flags).toEqual({ beta: true, darkMode: false });
  });

  it('requireTenant throws TenantNotFoundError when headers do not resolve', () => {
    const h = new Headers({ host: 'missing.example.test' });
    expect(() => requireTenant(h, registry, { environment: 'local' })).toThrow(
      TenantNotFoundError,
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
