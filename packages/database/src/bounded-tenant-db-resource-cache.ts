import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import { resolveTenantDatabaseUrl, type ResolveTenantDatabaseUrlOptions } from './resolve-tenant-db-url';

export interface BoundedTenantDbResourceCacheOptions<T> {
  /**
   * Hard cap on distinct cached resources (per composite key: tenant + URL).
   * Prevents unbounded growth when many tenants connect over the process lifetime.
   */
  maxPools: number;
  /**
   * When set, entries not used for longer than this (ms) may be evicted on a later `getOrCreate`
   * (best-effort idle eviction without a background timer).
   */
  idleEvictMs?: number;
  /** Invoked when an entry is evicted or when {@link BoundedTenantDbResourceCache.destroy} runs — close pools here. */
  onEvict?: (value: T) => void;
}

export interface TenantDbCacheEntry<T> {
  value: T;
  lastUsed: number;
}

/**
 * Stable cache key: **tenant** + **database URL** so the same URL for two tenants never shares a pool,
 * and URL rotation for one tenant yields a new key after config/env changes.
 */
export function makeTenantDatabaseCacheKey(tenantKey: string, databaseUrl: string): string {
  return `${tenantKey}\u0001${databaseUrl}`;
}

/**
 * LRU-bounded cache for per-tenant database clients/pools. Driver-agnostic — pass `pg.Pool`, Prisma
 * client, etc. Eviction callbacks should end connections (fire-and-forget `pool.end()` is acceptable
 * if you cannot block the request on async teardown).
 */
export class BoundedTenantDbResourceCache<T> {
  private readonly map = new Map<string, TenantDbCacheEntry<T>>();
  private readonly options: BoundedTenantDbResourceCacheOptions<T>;

  constructor(options: BoundedTenantDbResourceCacheOptions<T>) {
    if (!Number.isFinite(options.maxPools) || options.maxPools < 1) {
      throw new Error('[multitenant/database] BoundedTenantDbResourceCache: maxPools must be a finite integer >= 1');
    }
    this.options = options;
  }

  getOrCreate(cacheKey: string, factory: () => T): T {
    const now = Date.now();
    this.pruneIdle(now);

    const existing = this.map.get(cacheKey);
    if (existing) {
      existing.lastUsed = now;
      return existing.value;
    }

    while (this.map.size >= this.options.maxPools) {
      this.evictLru();
    }

    const value = factory();
    this.map.set(cacheKey, { value, lastUsed: now });
    return value;
  }

  /** Evict every entry (e.g. `SIGTERM`). */
  destroy(): void {
    for (const [key, entry] of this.map) {
      this.map.delete(key);
      this.options.onEvict?.(entry.value);
    }
  }

  /** Current number of cached resources (for metrics / tests). */
  get size(): number {
    return this.map.size;
  }

  private pruneIdle(now: number): void {
    const ttl = this.options.idleEvictMs;
    if (ttl === undefined || this.map.size === 0) return;
    for (const [key, entry] of [...this.map.entries()]) {
      if (now - entry.lastUsed > ttl) {
        this.map.delete(key);
        this.options.onEvict?.(entry.value);
      }
    }
  }

  private evictLru(): void {
    let oldestKey: string | undefined;
    let oldest = Infinity;
    for (const [key, entry] of this.map) {
      if (entry.lastUsed < oldest) {
        oldest = entry.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey !== undefined) {
      const entry = this.map.get(oldestKey);
      if (entry) {
        this.map.delete(oldestKey);
        this.options.onEvict?.(entry.value);
      }
    }
  }
}

/**
 * Resolve the tenant DSN (Phase 8.5) and return a cached pool/client for **`tenantKey` + URL**.
 */
export function getOrCreateTenantDatabaseResource<T>(
  cache: BoundedTenantDbResourceCache<T>,
  resolved: ResolvedTenant,
  tenants: Record<string, TenantDefinition>,
  factory: (databaseUrl: string) => T,
  options?: ResolveTenantDatabaseUrlOptions,
): T {
  const url = resolveTenantDatabaseUrl(resolved, tenants, options);
  if (!url) {
    throw new Error(
      `[multitenant/database] Tenant "${resolved.tenantKey}" has no per-tenant database URL (set database.envVar in config and resolveTenantDatabaseUrl options)`,
    );
  }
  const key = makeTenantDatabaseCacheKey(resolved.tenantKey, url);
  return cache.getOrCreate(key, () => factory(url));
}
