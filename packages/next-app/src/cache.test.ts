import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTenantRegistry, TenantNotFoundError } from '@multitenant/core';
import type { TenantsConfig } from '@multitenant/config';
import {
  cachedFetch,
  createTenantCachedFetch,
  getCacheStats,
  resetCacheStats,
  type CacheLogEvent,
} from '.';

describe('cachedFetch', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
    resetCacheStats();
    vi.stubEnv('NEXT_PHASE', '');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function getTestCacheDir() {
    return mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
  }

  it('bypasses cache outside build phase and calls fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    } as any);

    const result = await cachedFetch('https://example.com/api', {
      locale: 'en-US',
      cacheDir: tempDir,
    });

    expect(result).toEqual({ data: 'test' });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('caches on first call during build phase', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: ['a', 'b'] }),
    } as any);

    const result = await cachedFetch('https://example.com/api?page=1', {
      locale: 'en-US',
      cacheDir: tempDir,
    });

    expect(result).toEqual({ items: ['a', 'b'] });
    expect(fetchSpy).toHaveBeenCalledOnce();

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    const localesDir = await fs.readdir(path.join(tempDir, 'locales'));
    expect(localesDir).toEqual(['en-US']);

    const cacheFile = await fs.readdir(path.join(tempDir, 'locales', 'en-US'));
    expect(cacheFile.length).toBe(1);
    expect(cacheFile[0]).toMatch(/^[a-f0-9]{64}\.json$/);

    const cached = JSON.parse(
      await fs.readFile(path.join(tempDir, 'locales', 'en-US', cacheFile[0]!), 'utf8'),
    );
    expect(cached).toHaveProperty('url', 'https://example.com/api?page=1');
    expect(cached).toHaveProperty('locale', 'en-US');
    expect(cached).toHaveProperty('cachedAt');
    expect(cached).toHaveProperty('data', { items: ['a', 'b'] });
  });

  it('reads from cache on subsequent calls', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');

    // First call: cache miss
    let fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ version: 1 }),
    } as any);

    const result1 = await cachedFetch('https://example.com/data', {
      locale: 'en-US',
      cacheDir: tempDir,
    });
    expect(result1).toEqual({ version: 1 });
    expect(fetchSpy).toHaveBeenCalledOnce();

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    // Second call: cache hit
    fetchSpy.mockClear();
    const result2 = await cachedFetch('https://example.com/data', {
      locale: 'en-US',
      cacheDir: tempDir,
    });

    expect(result2).toEqual({ version: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('tracks stats: increments misses on cache miss', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ x: 1 }),
    } as any);

    await cachedFetch('https://example.com/api1', {
      locale: 'en-US',
      cacheDir: tempDir,
    });

    const stats = getCacheStats();
    expect(stats).toHaveLength(1);
    expect(stats[0]!).toMatchObject({
      url: 'https://example.com/api1',
      locale: 'en-US',
      hits: 0,
      misses: 1,
    });
  });

  it('tracks stats: increments hits on cache hit', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ y: 2 }),
    } as any);

    await cachedFetch('https://example.com/api2', {
      locale: 'en-US',
      cacheDir: tempDir,
    });

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    await cachedFetch('https://example.com/api2', {
      locale: 'en-US',
      cacheDir: tempDir,
    });

    const stats = getCacheStats();
    expect(stats).toHaveLength(1);
    expect(stats[0]!).toMatchObject({
      url: 'https://example.com/api2',
      locale: 'en-US',
      hits: 1,
      misses: 1,
    });
  });

  it('accumulates stats across multiple locales', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);

    await cachedFetch('https://example.com/api', {
      locale: 'en-US',
      cacheDir: tempDir,
    });
    await cachedFetch('https://example.com/api', {
      locale: 'es-US',
      cacheDir: tempDir,
    });

    // Wait for async cache writes
    await new Promise((r) => setTimeout(r, 50));

    await cachedFetch('https://example.com/api', {
      locale: 'en-US',
      cacheDir: tempDir,
    });

    const stats = getCacheStats();
    expect(stats).toHaveLength(2);

    const enStats = stats.find((s) => s.locale === 'en-US');
    expect(enStats).toMatchObject({
      locale: 'en-US',
      hits: 1,
      misses: 1,
    });

    const esStats = stats.find((s) => s.locale === 'es-US');
    expect(esStats).toMatchObject({
      locale: 'es-US',
      hits: 0,
      misses: 1,
    });
  });

  it('emits debug logs on cache hit/miss', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);

    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    await cachedFetch('https://example.com/test', {
      locale: 'en-US',
      cacheDir: tempDir,
      debug: true,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[multitenant/cache] MISS'),
    );

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    consoleSpy.mockClear();

    await cachedFetch('https://example.com/test', {
      locale: 'en-US',
      cacheDir: tempDir,
      debug: true,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[multitenant/cache] HIT '),
    );
  });

  it('uses custom log function instead of console', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ z: 3 }),
    } as any);

    const logEvents: CacheLogEvent[] = [];
    const logFn = (event: CacheLogEvent) => logEvents.push(event);

    await cachedFetch('https://example.com/api', {
      locale: 'en-US',
      cacheDir: tempDir,
      log: logFn,
    });

    expect(logEvents).toHaveLength(1);
    expect(logEvents[0]!).toMatchObject({
      type: 'miss',
      url: 'https://example.com/api',
      locale: 'en-US',
      misses: 1,
    });
  });

  it('respects custom cache directory', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const customDir = path.join(tempDir, 'custom-cache');

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ custom: true }),
    } as any);

    await cachedFetch('https://example.com/api', {
      locale: 'de-DE',
      cacheDir: customDir,
    });

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    // Use sync fs to check since test is synchronous
    const { existsSync } = await import('node:fs');
    expect(existsSync(path.join(customDir, 'locales', 'de-DE'))).toBe(true);
  });

  it('passes through fetch options', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as any);

    await cachedFetch('https://example.com/api', {
      locale: 'en-US',
      cacheDir: tempDir,
      headers: { Authorization: 'Bearer token' },
      method: 'POST',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
        method: 'POST',
      }),
    );
  });
});

describe('createTenantCachedFetch', () => {
  let tempDir: string;
  let registry: ReturnType<typeof createTenantRegistry>;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
    resetCacheStats();
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');

    const config: TenantsConfig = {
      version: 1,
      defaultEnvironment: 'local',
      markets: {
        us: {
          label: 'US',
          locale: 'en-US',
          currency: 'USD',
          timezone: 'America/New_York',
        },
      },
      tenants: {
        'us-main': {
          market: 'us',
          domains: {
            local: { 'localhost': 'us-main' },
          },
        },
      },
    };

    registry = createTenantRegistry(config);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('extracts locale from tenant market and creates cached fetch', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'tenant-scoped' }),
    } as any);

    const fetch = createTenantCachedFetch(registry, 'us-main', {
      cacheDir: tempDir,
    });

    const result = await fetch<{ data: string }>('https://example.com/api');
    expect(result).toEqual({ data: 'tenant-scoped' });

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    const cacheFile = await fs.readdir(path.join(tempDir, 'locales', 'en-US'));
    expect(cacheFile).toHaveLength(1);
  });

  it('reuses cache across multiple fetches', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    } as any);

    const fetch = createTenantCachedFetch(registry, 'us-main', {
      cacheDir: tempDir,
    });

    await fetch('https://example.com/api');

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    await fetch('https://example.com/api');

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('throws TenantNotFoundError for unknown tenant', () => {
    expect(() => createTenantCachedFetch(registry, 'unknown-tenant')).toThrow(
      TenantNotFoundError,
    );
  });

  it('passes through debug option to cachedFetch', async () => {
    const logEvents: CacheLogEvent[] = [];

    const fetch = createTenantCachedFetch(registry, 'us-main', {
      cacheDir: tempDir,
      log: (event) => logEvents.push(event),
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as any);

    await fetch('https://example.com/api');

    expect(logEvents).toHaveLength(1);
    expect(logEvents[0]!.locale).toBe('en-US');
  });

  it('supports locale override per-call', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ locale: 'es-US' }),
    } as any);

    const fetch = createTenantCachedFetch(registry, 'us-main', {
      cacheDir: tempDir,
    });

    // Call with default locale (en-US)
    const result1 = await fetch('https://example.com/pages');
    expect(result1).toEqual({ locale: 'es-US' });

    // Wait for async cache write
    await new Promise((r) => setTimeout(r, 50));

    // Call with override locale (es-US)
    fetchSpy.mockClear();
    const result2 = await fetch<{ locale: string }>('https://example.com/pages', {
      locale: 'es-US',
    });
    expect(result2).toEqual({ locale: 'es-US' });

    // Both calls should be different (different locale = different cache key)
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('preserves generic type parameter on return', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'test' }),
    } as any);

    interface PageData {
      id: number;
      name: string;
    }

    const fetch = createTenantCachedFetch(registry, 'us-main', {
      cacheDir: tempDir,
    });

    const result = await fetch<PageData>('https://example.com/api');

    // TypeScript would catch type errors here; this is a runtime check
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
  });
});

describe('resetCacheStats', () => {
  it('clears all stats', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);

    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));

    try {
      resetCacheStats(); // Clear any stats from previous tests
      await cachedFetch('https://example.com/1', { locale: 'en-US', cacheDir: tempDir });
      await cachedFetch('https://example.com/2', { locale: 'es-US', cacheDir: tempDir });

      expect(getCacheStats()).toHaveLength(2);

      resetCacheStats();

      expect(getCacheStats()).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
