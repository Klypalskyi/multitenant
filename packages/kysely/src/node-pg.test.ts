import { describe, expect, it, vi } from 'vitest';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import { BoundedTenantDbResourceCache } from '@multitenant/database';

const hoisted = vi.hoisted(() => {
  const poolUrls: string[] = [];
  class MockPool {
    readonly connectionString: string;
    constructor(opts: { connectionString: string }) {
      this.connectionString = opts.connectionString;
      poolUrls.push(opts.connectionString);
    }
  }
  return { poolUrls, MockPool };
});

vi.mock('pg', () => ({
  Pool: hoisted.MockPool,
}));

import { createNodePgKysely, getOrCreateTenantNodePgPool, getTenantNodePgKysely } from './node-pg';

function resolved(tenantKey: string): ResolvedTenant {
  return {
    tenantKey,
    marketKey: 'us',
    host: 't.local',
    environment: 'local',
    theme: null,
    flags: {},
    experiments: {},
  };
}

const tenants: Record<string, TenantDefinition> = {
  acme: {
    market: 'us',
    domains: { local: { 't.local': 'acme' } },
    database: { envVar: 'DSN_ACME' },
  },
};

describe('getOrCreateTenantNodePgPool', () => {
  it('creates pool from resolved DSN and reuses for same tenant/env', () => {
    hoisted.poolUrls.length = 0;
    const cache = new BoundedTenantDbResourceCache({
      maxPools: 8,
    });

    const env = { DSN_ACME: 'postgres://acme/db' };
    const a = getOrCreateTenantNodePgPool(cache, resolved('acme'), tenants, { env });
    const b = getOrCreateTenantNodePgPool(cache, resolved('acme'), tenants, { env });

    expect(a).toBe(b);
    expect(hoisted.poolUrls).toEqual(['postgres://acme/db']);
    expect(a).toMatchObject({ connectionString: 'postgres://acme/db' });
  });
});

describe('createNodePgKysely', () => {
  it('returns Kysely over a shared pool', () => {
    const pool = new hoisted.MockPool({ connectionString: 'postgres://shared' });
    const db = createNodePgKysely<{ t: Record<string, never> }>(pool as never);
    expect(db).toBeDefined();
  });
});

describe('getTenantNodePgKysely', () => {
  it('combines pool cache + Kysely (new instance per call)', () => {
    hoisted.poolUrls.length = 0;
    const cache = new BoundedTenantDbResourceCache({ maxPools: 4 });
    const env = { DSN_ACME: 'postgres://acme' };

    const db = getTenantNodePgKysely<{ x: Record<string, never> }>(cache, resolved('acme'), tenants, {
      env,
    });
    const again = getTenantNodePgKysely<{ x: Record<string, never> }>(cache, resolved('acme'), tenants, {
      env,
    });

    expect(hoisted.poolUrls).toHaveLength(1);
    expect(db).not.toBe(again);
  });
});
