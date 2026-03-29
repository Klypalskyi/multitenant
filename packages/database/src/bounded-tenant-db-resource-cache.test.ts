import { describe, expect, it, vi } from 'vitest';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import {
  BoundedTenantDbResourceCache,
  getOrCreateTenantDatabaseResource,
  makeTenantDatabaseCacheKey,
} from './bounded-tenant-db-resource-cache';

function resolved(tenantKey: string): ResolvedTenant {
  return {
    tenantKey,
    marketKey: 'us',
    host: 'acme.local',
    environment: 'local',
    theme: null,
    flags: {},
    experiments: {},
  };
}

const tenantsWithDb = (key: string, envVar: string): Record<string, TenantDefinition> => ({
  [key]: {
    market: 'us',
    domains: { local: { 'x.local': key } },
    database: { envVar },
  },
});

describe('makeTenantDatabaseCacheKey', () => {
  it('includes tenantKey and url so same URL different tenants do not share an entry', () => {
    const a = makeTenantDatabaseCacheKey('t1', 'postgres://a');
    const b = makeTenantDatabaseCacheKey('t2', 'postgres://a');
    expect(a).not.toBe(b);
  });

  it('same tenant and url yields same key', () => {
    expect(makeTenantDatabaseCacheKey('acme', 'postgres://x')).toBe(
      makeTenantDatabaseCacheKey('acme', 'postgres://x'),
    );
  });
});

describe('BoundedTenantDbResourceCache', () => {
  it('throws when maxPools < 1', () => {
    expect(() => new BoundedTenantDbResourceCache({ maxPools: 0 })).toThrow(/maxPools/);
  });

  it('creates once per key and reuses instance', () => {
    const cache = new BoundedTenantDbResourceCache<{ id: number }>({ maxPools: 8 });
    let created = 0;
    const a = cache.getOrCreate('k1', () => {
      created += 1;
      return { id: 1 };
    });
    const b = cache.getOrCreate('k1', () => {
      created += 1;
      return { id: 2 };
    });
    expect(a).toBe(b);
    expect(created).toBe(1);
  });

  it('evicts LRU when at maxPools before creating a new entry', () => {
    vi.useFakeTimers();
    const evicted: string[] = [];
    const cache = new BoundedTenantDbResourceCache<{ key: string }>({
      maxPools: 2,
      onEvict: (v) => {
        evicted.push(v.key);
      },
    });

    vi.setSystemTime(1000);
    cache.getOrCreate('ka', () => ({ key: 'a' }));
    vi.setSystemTime(2000);
    cache.getOrCreate('kb', () => ({ key: 'b' }));
    vi.setSystemTime(3000);
    // touch 'ka' so 'kb' is LRU (oldest lastUsed)
    cache.getOrCreate('ka', () => ({ key: 'a-new' }));

    vi.setSystemTime(4000);
    cache.getOrCreate('kc', () => ({ key: 'c' }));

    expect(evicted).toEqual(['b']);
    vi.useRealTimers();
    expect(cache.getOrCreate('ka', () => ({ key: 'oops' })).key).toBe('a');
    expect(cache.getOrCreate('kc', () => ({ key: 'oops2' })).key).toBe('c');
  });

  it('prunes idle entries before allocate when idleEvictMs set', () => {
    vi.useFakeTimers();
    const evicted: string[] = [];
    const cache = new BoundedTenantDbResourceCache<{ k: string }>({
      maxPools: 4,
      idleEvictMs: 60_000,
      onEvict: (v) => evicted.push(v.k),
    });

    cache.getOrCreate('idle', () => ({ k: 'idle' }));
    vi.advanceTimersByTime(61_000);
    cache.getOrCreate('fresh', () => ({ k: 'fresh' }));

    expect(evicted).toContain('idle');
    expect(cache.getOrCreate('fresh', () => ({ k: 'x' })).k).toBe('fresh');
    vi.useRealTimers();
  });

  it('destroy removes all and invokes onEvict', () => {
    const evicted: string[] = [];
    const cache = new BoundedTenantDbResourceCache<{ k: string }>({
      maxPools: 4,
      onEvict: (v) => evicted.push(v.k),
    });
    cache.getOrCreate('x', () => ({ k: 'x' }));
    cache.getOrCreate('y', () => ({ k: 'y' }));
    cache.destroy();
    expect(evicted.sort()).toEqual(['x', 'y']);
    let n = 0;
    cache.getOrCreate('x', () => {
      n += 1;
      return { k: 'new' };
    });
    expect(n).toBe(1);
  });
});

describe('getOrCreateTenantDatabaseResource', () => {
  it('resolves URL and caches by tenantKey+url', () => {
    const env = { DB_ACME: 'postgres://acme' };
    const tenants = tenantsWithDb('acme', 'DB_ACME');
    const cache = new BoundedTenantDbResourceCache<{ u: string }>({ maxPools: 4 });
    let creates = 0;

    const r1 = getOrCreateTenantDatabaseResource(
      cache,
      resolved('acme'),
      tenants,
      (url) => {
        creates += 1;
        return { u: url };
      },
      { env },
    );
    const r2 = getOrCreateTenantDatabaseResource(
      cache,
      resolved('acme'),
      tenants,
      () => {
        creates += 1;
        return { u: 'bad' };
      },
      { env },
    );

    expect(r1).toBe(r2);
    expect(r1.u).toBe('postgres://acme');
    expect(creates).toBe(1);
  });

  it('throws when tenant has no database config', () => {
    const tenants: Record<string, TenantDefinition> = {
      acme: { market: 'us', domains: { local: { 'x.local': 'acme' } } },
    };
    const cache = new BoundedTenantDbResourceCache<{ u: string }>({ maxPools: 4 });

    expect(() =>
      getOrCreateTenantDatabaseResource(cache, resolved('acme'), tenants, (u) => ({ u }), {
        env: {},
      }),
    ).toThrow(/no per-tenant database URL/);
  });

  it('throws when env var missing and required', () => {
    const tenants = tenantsWithDb('acme', 'DB_ACME');
    const cache = new BoundedTenantDbResourceCache<{ u: string }>({ maxPools: 4 });

    expect(() =>
      getOrCreateTenantDatabaseResource(cache, resolved('acme'), tenants, (u) => ({ u }), {
        env: {},
      }),
    ).toThrow(/Missing database URL/);
  });
});
