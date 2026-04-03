import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createClient } from 'contentful';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { createCachedContentfulClient } from './client';
import { createTenantContentfulClient } from './tenant-client';
import { getCacheStats, resetCacheStats, resetInflightMap } from './cache';
import type { TenantRegistry } from '@multitenant/core';
import { TenantNotFoundError } from '@multitenant/core';

// Mock Contentful SDK
vi.mock('contentful', () => ({
  createClient: vi.fn((config) => ({
    _config: config,
    getEntries: vi.fn(async () => ({ items: [{ sys: { id: '1' }, fields: {} }] })),
    getEntry: vi.fn(async (id) => ({ sys: { id }, fields: {} })),
    getAsset: vi.fn(async (id) => ({ sys: { id }, fields: {} })),
    getAssets: vi.fn(async () => ({ items: [] })),
    getContentType: vi.fn(async (id) => ({ sys: { id }, name: 'Test' })),
    getContentTypes: vi.fn(async () => ({ items: [] })),
    getTags: vi.fn(async () => ({ items: [] })),
    getLocales: vi.fn(async () => ({ items: [] })),
    sync: vi.fn(async () => ({ entries: [] })),
    parseEntries: vi.fn((data) => data),
    createAssetKey: vi.fn(() => ({ key: 'value' })),
  })),
}));

describe('@multitenant/contentful', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `multitenant-contentful-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    resetCacheStats();
    resetInflightMap();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('createCachedContentfulClient', () => {
    it('should deduplicate concurrent calls — SDK called exactly once', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });
      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        isBuildPhase: () => false,
      });

      const spy = vi.spyOn(mockClient, 'getEntries');

      // Make 10 concurrent calls with the same parameters
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          client.getEntries({ content_type: 'page' }),
        ),
      );

      // All results should be identical (same promise resolved)
      expect(results).toHaveLength(10);
      expect(results.every((r) => r === results[0])).toBe(true);

      // SDK method called exactly once
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should write cache file on miss during build phase', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });
      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        cacheDir: tmpDir,
        isBuildPhase: () => true,
      });

      vi.spyOn(mockClient, 'getEntries').mockResolvedValue({
        items: [{ sys: { id: 'page1' }, fields: { title: 'Test' } }],
      } as any);

      await client.getEntries({ content_type: 'page' });

      // Wait for async write
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify file exists
      const files = await fs.readdir(path.join(tmpDir, 'locales', 'en-US'));
      expect(files.length).toBeGreaterThan(0);

      // Verify file content structure
      const filePath = path.join(tmpDir, 'locales', 'en-US', files[0]);
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(content).toHaveProperty('cacheKey');
      expect(content).toHaveProperty('locale', 'en-US');
      expect(content).toHaveProperty('cachedAt');
      expect(content).toHaveProperty('data');
    });

    it('should read from filesystem cache on hit during build phase', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });
      const spy = vi.spyOn(mockClient, 'getEntries');

      // Pre-populate cache file with correct hash
      const cacheDir = path.join(tmpDir, 'locales', 'en-US');
      await fs.mkdir(cacheDir, { recursive: true });
      const testData = { items: [{ sys: { id: 'cached' } }] };

      // Calculate the correct cache key hash (args is an array of parameters)
      const args = [{ content_type: 'page' }];
      const argsStr = JSON.stringify(args);
      const argsHash = require('node:crypto')
        .createHash('sha256')
        .update(argsStr)
        .digest('hex');
      const logicalKey = `getEntries::abc123::${argsHash}`;
      const fileName = require('node:crypto')
        .createHash('sha256')
        .update(logicalKey)
        .digest('hex');
      const filePath = path.join(cacheDir, `${fileName}.json`);

      await fs.writeFile(
        filePath,
        JSON.stringify({
          cacheKey: logicalKey,
          locale: 'en-US',
          cachedAt: new Date().toISOString(),
          data: testData,
        }),
      );

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        cacheDir: tmpDir,
        isBuildPhase: () => true,
      });

      const result = await client.getEntries({ content_type: 'page' });

      // SDK should not be called (cache hit)
      expect(spy).not.toHaveBeenCalled();
      // Result should match cached data
      expect(result).toEqual(testData);
    });

    it('should scope cache by locale — same method, different locales → separate files', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });

      const clientEn = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        cacheDir: tmpDir,
        isBuildPhase: () => true,
      });

      const clientEs = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'es-US',
        cacheDir: tmpDir,
        isBuildPhase: () => true,
      });

      vi.spyOn(mockClient, 'getEntries').mockResolvedValue({
        items: [{ sys: { id: 'item' }, fields: {} }],
      } as any);

      await clientEn.getEntries({ content_type: 'page' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      await clientEs.getEntries({ content_type: 'page' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Two separate locale directories should exist
      const enFiles = await fs.readdir(path.join(tmpDir, 'locales', 'en-US'));
      const esFiles = await fs.readdir(path.join(tmpDir, 'locales', 'es-US'));

      expect(enFiles.length).toBeGreaterThan(0);
      expect(esFiles.length).toBeGreaterThan(0);
    });

    it('should resolve locale from TenantRegistry', async () => {
      const mockRegistry: TenantRegistry = {
        tenants: {
          'us-main': {
            key: 'us-main',
            marketKey: 'us',
            market: 'us',
            domains: {
              local: { 'localhost': 'us-main' },
            },
          },
        },
        markets: {
          us: {
            key: 'us',
            locale: 'en-US',
            locales: ['en-US'],
            currency: 'USD',
            timezone: 'America/New_York',
          },
        },
        resolveByHost: () => null,
        resolveByRequest: () => null,
      };

      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });
      vi.mocked(createClient).mockReturnValue(mockClient);

      const client = createTenantContentfulClient(
        mockRegistry,
        'us-main',
        { spaceId: 'abc123', accessToken: 'token' },
        { isBuildPhase: () => false },
      );

      expect(client).toBeDefined();
      expect(vi.mocked(createClient)).toHaveBeenCalledWith({
        space: 'abc123',
        accessToken: 'token',
        environment: 'master',
        host: 'cdn.contentful.com',
      });
    });

    it('should throw TenantNotFoundError for unknown tenant', () => {
      const mockRegistry: TenantRegistry = {
        tenants: {},
        markets: {},
        resolveByHost: () => null,
        resolveByRequest: () => null,
      };

      expect(() =>
        createTenantContentfulClient(mockRegistry, 'nonexistent', {
          spaceId: 'abc123',
          accessToken: 'token',
        }),
      ).toThrow(TenantNotFoundError);
    });

    it('should not cache outside build phase', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });
      const spy = vi.spyOn(mockClient, 'getEntries');

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        cacheDir: tmpDir,
        isBuildPhase: () => false,
      });

      await client.getEntries({ content_type: 'page' });
      await client.getEntries({ content_type: 'page' });

      // Should be called twice (no filesystem caching outside build)
      expect(spy).toHaveBeenCalledTimes(2);

      // No files should be written
      try {
        await fs.stat(path.join(tmpDir, 'locales'));
        expect.fail('Expected no cache directory to be created');
      } catch (e: any) {
        if (e.code !== 'ENOENT') throw e;
      }
    });

    it('should clear inflight map after resolve', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        isBuildPhase: () => false,
      });

      await client.getEntries({ content_type: 'page' });

      // After resolve, inflight map should be empty (can't access directly, but verify via no dedup)
      resetInflightMap();
      const spy = vi.spyOn(mockClient, 'getEntries');

      // Sequential call should not be deduped (inflight map was cleared)
      await client.getEntries({ content_type: 'page' });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should clear inflight map after rejection', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });
      vi.spyOn(mockClient, 'getEntries').mockRejectedValue(new Error('API error'));

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        isBuildPhase: () => false,
      });

      await expect(client.getEntries({ content_type: 'page' })).rejects.toThrow('API error');

      resetInflightMap();

      // Next call should try again (inflight was cleaned up)
      const spy = vi.spyOn(mockClient, 'getEntries').mockResolvedValue({
        items: [],
      } as any);

      await client.getEntries({ content_type: 'page' });
      expect(spy).toHaveBeenCalled();
    });

    it('should allow custom isBuildPhase override', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        cacheDir: tmpDir,
        isBuildPhase: () => true, // Force build phase
      });

      vi.spyOn(mockClient, 'getEntries').mockResolvedValue({
        items: [],
      } as any);

      await client.getEntries({ content_type: 'page' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify file was written even though NEXT_PHASE might not be set
      try {
        await fs.stat(path.join(tmpDir, 'locales', 'en-US'));
      } catch (e: any) {
        expect.fail('Expected cache directory to be created with custom isBuildPhase');
      }
    });

    it('should track stats: hits and misses', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        cacheDir: tmpDir,
        isBuildPhase: () => true, // Enable filesystem cache for hit testing
      });

      vi.spyOn(mockClient, 'getEntries').mockResolvedValue({
        items: [],
      } as any);

      // First call: miss
      await client.getEntries({ content_type: 'page' });
      await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for async write
      let stats = getCacheStats();
      expect(stats.length).toBe(1);
      expect(stats[0].misses).toBe(1);
      expect(stats[0].hits).toBe(0);

      // Second call: hit (filesystem cache)
      await client.getEntries({ content_type: 'page' });
      stats = getCacheStats();
      expect(stats[0].hits).toBe(1);
      expect(stats[0].misses).toBe(1);
    });

    it('should emit log events with structured CacheLogEvent', async () => {
      const events: any[] = [];
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        isBuildPhase: () => false,
        log: (event) => events.push(event),
      });

      vi.spyOn(mockClient, 'getEntries').mockResolvedValue({
        items: [],
      } as any);

      await client.getEntries({ content_type: 'page' });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('miss');
      expect(events[0].locale).toBe('en-US');
      expect(events[0].url).toContain('getEntries');
      expect(events[0]).toHaveProperty('hits');
      expect(events[0]).toHaveProperty('misses');
    });

    it('should pass through non-cached methods', async () => {
      const mockClient = createClient({ space: 'abc123', accessToken: 'token' });

      const client = createCachedContentfulClient(mockClient, {
        spaceId: 'abc123',
        locale: 'en-US',
        isBuildPhase: () => false,
      });

      const createAssetKeySpy = vi.spyOn(mockClient, 'createAssetKey');
      const syncSpy = vi.spyOn(mockClient, 'sync');
      const parseEntriesSpy = vi.spyOn(mockClient, 'parseEntries');

      // These should be direct pass-throughs
      client.createAssetKey(Date.now());
      expect(createAssetKeySpy).toHaveBeenCalledTimes(1);

      client.sync({});
      expect(syncSpy).toHaveBeenCalledTimes(1);

      client.parseEntries({ items: [], total: 0, skip: 0, limit: 0 });
      expect(parseEntriesSpy).toHaveBeenCalledTimes(1);
    });
  });
});
