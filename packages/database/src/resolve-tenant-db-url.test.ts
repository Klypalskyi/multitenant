import { describe, expect, it } from 'vitest';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import { resolveTenantDatabaseUrl } from './resolve-tenant-db-url';

function resolved(tenantKey: string): ResolvedTenant {
  return {
    tenantKey,
    marketKey: 'm',
    host: 't.example',
    environment: 'local',
    theme: null,
    flags: {},
    experiments: {},
  };
}

describe('resolveTenantDatabaseUrl', () => {
  const tenants: Record<string, TenantDefinition> = {
    a: {
      market: 'us',
      domains: {},
      database: { envVar: 'DSN_TENANT_A' },
    },
  };

  it('returns undefined when tenant has no database ref', () => {
    const t: Record<string, TenantDefinition> = {
      b: { market: 'us', domains: {} },
    };
    expect(resolveTenantDatabaseUrl(resolved('b'), t, { env: { X: 'y' } })).toBeUndefined();
  });

  it('reads URL from named env var', () => {
    expect(
      resolveTenantDatabaseUrl(resolved('a'), tenants, {
        env: { DSN_TENANT_A: ' postgres://x/y ' },
      }),
    ).toBe('postgres://x/y');
  });

  it('throws when ref set but env missing (default required)', () => {
    expect(() => resolveTenantDatabaseUrl(resolved('a'), tenants, { env: {} })).toThrow(
      /DSN_TENANT_A/,
    );
  });

  it('returns undefined when required false and env missing', () => {
    expect(
      resolveTenantDatabaseUrl(resolved('a'), tenants, { env: {}, required: false }),
    ).toBeUndefined();
  });
});
