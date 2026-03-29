import { describe, expect, it, vi } from 'vitest';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import { BoundedTenantDbResourceCache } from '@multitenant/database';

const hoisted = vi.hoisted(() => {
  const constructed: Array<{ datasourceUrl?: string }> = [];
  class MockPrismaClient {
    constructor(opts: { datasourceUrl?: string }) {
      constructed.push(opts);
    }
    $disconnect = vi.fn().mockResolvedValue(undefined);
  }
  return { constructed, MockPrismaClient };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: hoisted.MockPrismaClient,
}));

import { PrismaClient } from '@prisma/client';
import { createSharedPrismaClient, getOrCreateTenantPrismaClient } from './client';

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

describe('getOrCreateTenantPrismaClient', () => {
  it('reuses client for same tenant + env URL', () => {
    hoisted.constructed.length = 0;
    const cache = new BoundedTenantDbResourceCache<InstanceType<typeof PrismaClient>>({
      maxPools: 8,
    });
    const env = { DSN_ACME: 'postgresql://acme/db' };

    const a = getOrCreateTenantPrismaClient(cache, resolved('acme'), tenants, { env });
    const b = getOrCreateTenantPrismaClient(cache, resolved('acme'), tenants, { env });

    expect(a).toBe(b);
    expect(hoisted.constructed).toHaveLength(1);
    expect(hoisted.constructed[0].datasourceUrl).toBe('postgresql://acme/db');
  });

  it('forwards prismaOptions', () => {
    hoisted.constructed.length = 0;
    const cache = new BoundedTenantDbResourceCache<InstanceType<typeof PrismaClient>>({
      maxPools: 8,
    });
    getOrCreateTenantPrismaClient(cache, resolved('acme'), tenants, {
      env: { DSN_ACME: 'postgresql://x' },
      prismaOptions: { log: ['warn'] },
    });

    expect(hoisted.constructed[0]).toMatchObject({
      datasourceUrl: 'postgresql://x',
      log: ['warn'],
    });
  });
});

describe('createSharedPrismaClient', () => {
  it('constructs with datasourceUrl', () => {
    hoisted.constructed.length = 0;
    const c = createSharedPrismaClient('postgresql://shared/app');
    expect(hoisted.constructed[0].datasourceUrl).toBe('postgresql://shared/app');
    expect(c).toBeInstanceOf(hoisted.MockPrismaClient);
  });
});
