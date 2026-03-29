import { describe, expect, it, vi } from 'vitest';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import { BoundedTenantDbResourceCache } from '@multitenant/database';

const hoisted = vi.hoisted(() => {
  const constructed: Array<{ type?: string; url?: string; logging?: unknown }> = [];
  class MockDataSource {
    type?: string;
    url?: string;
    logging?: unknown;
    constructor(opts: { type: string; url: string; logging?: unknown }) {
      this.type = opts.type;
      this.url = opts.url;
      this.logging = opts.logging;
      constructed.push({ ...opts });
    }
    initialize = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn().mockResolvedValue(undefined);
  }
  return { constructed, MockDataSource };
});

vi.mock('typeorm', () => ({
  DataSource: hoisted.MockDataSource,
}));

import { DataSource } from 'typeorm';
import {
  createSharedPostgresDataSource,
  getOrCreateTenantPostgresDataSource,
} from './postgres-data-source';

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

describe('getOrCreateTenantPostgresDataSource', () => {
  it('reuses DataSource for same tenant + env URL', () => {
    hoisted.constructed.length = 0;
    const cache = new BoundedTenantDbResourceCache<DataSource>({ maxPools: 8 });
    const env = { DSN_ACME: 'postgres://acme/db' };

    const a = getOrCreateTenantPostgresDataSource(cache, resolved('acme'), tenants, { env });
    const b = getOrCreateTenantPostgresDataSource(cache, resolved('acme'), tenants, { env });

    expect(a).toBe(b);
    expect(hoisted.constructed).toHaveLength(1);
    expect(hoisted.constructed[0]).toMatchObject({
      type: 'postgres',
      url: 'postgres://acme/db',
    });
  });

  it('forwards dataSourceOptions', () => {
    hoisted.constructed.length = 0;
    const cache = new BoundedTenantDbResourceCache<DataSource>({ maxPools: 8 });
    getOrCreateTenantPostgresDataSource(cache, resolved('acme'), tenants, {
      env: { DSN_ACME: 'postgres://x' },
      dataSourceOptions: { logging: ['error'] },
    });

    expect(hoisted.constructed[0]).toMatchObject({
      type: 'postgres',
      url: 'postgres://x',
      logging: ['error'],
    });
  });
});

describe('createSharedPostgresDataSource', () => {
  it('constructs postgres DataSource with url', () => {
    hoisted.constructed.length = 0;
    const ds = createSharedPostgresDataSource('postgres://shared/app');
    expect(hoisted.constructed[0]).toMatchObject({
      type: 'postgres',
      url: 'postgres://shared/app',
    });
    expect(ds).toBeInstanceOf(hoisted.MockDataSource);
  });
});
