import { describe, expect, it } from 'vitest';
import { createTenantRegistry } from '@multitenant/core';
import { resolveTenantFromIncomingHeaders } from './resolve-tenant';

const sampleConfig = {
  version: 1 as const,
  markets: {
    us: { label: 'US', currency: 'USD', locale: 'en-US', timezone: 'America/New_York' },
  },
  tenants: {
    'us-main': {
      label: 'US',
      market: 'us',
      domains: {
        local: { 'us.localhost': 'us-main' },
      },
    },
  },
};

describe('resolveTenantFromIncomingHeaders', () => {
  const registry = createTenantRegistry(sampleConfig);

  it('uses Host when x-forwarded-host is wrong (stale localhost)', () => {
    const r = resolveTenantFromIncomingHeaders(
      (name) =>
        ({
          host: 'us.localhost:3100',
          'x-forwarded-host': 'localhost:3100',
        })[name],
      registry,
      'local',
    );
    expect(r?.tenant.tenantKey).toBe('us-main');
    expect(r?.forwardHostForUpstream).toBe('us.localhost:3100');
  });

  it('prefers Host first so correct tenant wins', () => {
    const r = resolveTenantFromIncomingHeaders(
      (name) => ({ host: 'us.localhost:3100' })[name],
      registry,
      'local',
    );
    expect(r?.tenant.tenantKey).toBe('us-main');
  });

  it('falls back to x-forwarded-host when Host does not map (e.g. loopback)', () => {
    const r = resolveTenantFromIncomingHeaders(
      (name) =>
        ({
          host: '127.0.0.1:3100',
          'x-forwarded-host': 'us.localhost:3100',
        })[name],
      registry,
      'local',
    );
    expect(r?.tenant.tenantKey).toBe('us-main');
    expect(r?.forwardHostForUpstream).toBe('us.localhost:3100');
  });

  it('returns null when neither header maps', () => {
    expect(
      resolveTenantFromIncomingHeaders((name) => ({ host: 'unknown.test:1' })[name], registry, 'local'),
    ).toBeNull();
  });
});
