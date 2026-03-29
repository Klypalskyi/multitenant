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

import { createNodePgDrizzle, getOrCreateTenantNodePgPool, getTenantNodePgDrizzle } from './node-pg';

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

describe('createNodePgDrizzle', () => {
  it('returns Drizzle over a shared pool', () => {
    const pool = new hoisted.MockPool({ connectionString: 'postgres://shared' });
    const schema = { users: {} as unknown };
    const db = createNodePgDrizzle(pool as never, schema);
    expect(db).toBeDefined();
  });

  it('allows schema-less drizzle', () => {
    const pool = new hoisted.MockPool({ connectionString: 'postgres://shared' });
    const db = createNodePgDrizzle(pool as never);
    expect(db).toBeDefined();
  });
});

describe('getTenantNodePgDrizzle', () => {
  it('combines pool cache + schema-bound drizzle', () => {
    hoisted.poolUrls.length = 0;
    const cache = new BoundedTenantDbResourceCache({ maxPools: 4 });
    const env = { DSN_ACME: 'postgres://acme' };
    const schema = { items: {} as unknown };

    const db = getTenantNodePgDrizzle(cache, resolved('acme'), tenants, schema, { env });
    const again = getTenantNodePgDrizzle(cache, resolved('acme'), tenants, schema, { env });

    expect(hoisted.poolUrls).toHaveLength(1);
    expect(db).not.toBe(again);
  });
});
