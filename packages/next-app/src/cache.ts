import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TenantRegistry } from '@multitenant/core';
import { TenantNotFoundError } from '@multitenant/core';

const DEFAULT_CACHE_DIR = '.next/.build-cache';
const NEXT_BUILD_PHASE = 'phase-production-build';

// Cache URL -> SHA256 hash to avoid recomputation
const urlHashCache = new Map<string, string>();

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === NEXT_BUILD_PHASE;
}

function getCacheFilePath(locale: string, url: string, cacheDir: string): string {
  // Check cache first
  let hash = urlHashCache.get(url);
  if (!hash) {
    hash = crypto.createHash('sha256').update(url).digest('hex');
    urlHashCache.set(url, hash);
  }
  return path.join(cacheDir, 'locales', locale, `${hash}.json`);
}

export interface CacheEntryStats {
  url: string;
  locale: string;
  hits: number;
  misses: number;
}

export interface CacheLogEvent {
  type: 'hit' | 'miss';
  url: string;
  locale: string;
  hits: number;
  misses: number;
}

interface CacheFileData<T = unknown> {
  url: string;
  locale: string;
  cachedAt: string;
  data: T;
}

// Module-level stats: accumulates hit/miss counts across all calls during build
// Key: `${locale}::${url}`
const statsMap = new Map<string, CacheEntryStats>();

export function getCacheStats(): CacheEntryStats[] {
  return Array.from(statsMap.values());
}

export function resetCacheStats(): void {
  statsMap.clear();
}

export interface CachedFetchOptions extends RequestInit {
  locale: string;
  cacheDir?: string;
  debug?: boolean;
  log?: (event: CacheLogEvent) => void;
}

export interface TenantCachedFetchOptions {
  cacheDir?: string;
  debug?: boolean;
  log?: (event: CacheLogEvent) => void;
}

function emitEvent(
  event: CacheLogEvent,
  debug?: boolean,
  log?: (e: CacheLogEvent) => void,
): void {
  if (log) {
    log(event);
    return;
  }
  if (debug) {
    const label = event.type === 'hit' ? 'HIT ' : 'MISS';
    console.debug(
      `[multitenant/cache] ${label} ${event.locale} ${event.url} (hits: ${event.hits}, misses: ${event.misses})`,
    );
  }
}

/**
 * Cached fetch utility for Next.js build-time requests.
 *
 * During `next build` (when `NEXT_PHASE === 'phase-production-build'`):
 * - Checks filesystem cache at `.next/.build-cache/locales/{locale}/{sha256(url)}.json`
 * - On cache hit: returns cached data (no fetch)
 * - On cache miss: fetches from URL, stores to filesystem, returns data
 * - Tracks hit/miss counts in memory; optionally logs via `debug` or custom `log` function
 *
 * Outside build: passes through to native `fetch` with no caching.
 *
 * @example
 * ```ts
 * const data = await cachedFetch<PageData>(
 *   'https://cdn.contentful.com/...',
 *   { locale: 'en-US', debug: true }
 * );
 * ```
 */
export async function cachedFetch<T = unknown>(
  url: string,
  options: CachedFetchOptions,
): Promise<T> {
  const { locale, cacheDir = DEFAULT_CACHE_DIR, debug, log, ...fetchInit } = options;

  if (!isBuildPhase()) {
    const res = await fetch(url, fetchInit);
    if (!res.ok) {
      throw new Error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
    }
    return res.json() as T;
  }

  // Ensure stats entry exists
  const statsKey = `${locale}::${url}`;
  if (!statsMap.has(statsKey)) {
    statsMap.set(statsKey, { url, locale, hits: 0, misses: 0 });
  }
  const stats = statsMap.get(statsKey)!;

  const filePath = getCacheFilePath(locale, url, cacheDir);

  // Cache hit: read from filesystem
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const cached = JSON.parse(raw) as CacheFileData<T>;
    stats.hits++;
    emitEvent({ type: 'hit', ...stats }, debug, log);
    return cached.data;
  } catch (err) {
    // Cache miss or read error -- fall through to fetch
  }

  // Cache miss: fetch, store, return
  stats.misses++;
  const res = await fetch(url, fetchInit);
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as T;

  // Persist to cache asynchronously (don't await to avoid blocking the build)
  fs.mkdir(path.dirname(filePath), { recursive: true })
    .then(() =>
      fs.writeFile(
        filePath,
        JSON.stringify({
          url,
          locale,
          cachedAt: new Date().toISOString(),
          data,
        } as CacheFileData<T>),
      ),
    )
    .catch((err) => {
      if (debug) {
        console.debug(
          `[multitenant/cache] Failed to write cache for ${locale} ${url}: ${(err as Error).message}`,
        );
      }
    });

  emitEvent({ type: 'miss', ...stats }, debug, log);
  return data;
}

/**
 * Creates a cached fetch function bound to a tenant and locale.
 *
 * Extracts the locale from the tenant's market and returns a `cachedFetch` function
 * pre-configured with that locale. The returned function supports overriding the locale
 * per-call for multi-locale scenarios.
 *
 * Throws `TenantNotFoundError` if the tenant key does not exist in the registry.
 *
 * Companion to `getTenantConfig()` — provides cached fetch for tenant-scoped API calls.
 *
 * @example
 * ```ts
 * // Use tenant's primary locale
 * const fetch = createTenantCachedFetch(registry, 'us-main', { debug: true });
 * const data = await fetch<PageData>('https://cdn.contentful.com/...');
 *
 * // Override locale for this specific call
 * const esData = await fetch<PageData>('https://cdn.contentful.com/...', { locale: 'es-US' });
 * ```
 */
export function createTenantCachedFetch<T = unknown>(
  registry: TenantRegistry,
  tenantKey: string,
  options?: TenantCachedFetchOptions,
): <U = T>(
  url: string,
  fetchInit?: RequestInit & { locale?: string },
) => Promise<U> {
  const tenant = registry.tenants[tenantKey];
  if (!tenant) {
    throw new TenantNotFoundError(`Tenant "${tenantKey}" not found in registry`);
  }

  const defaultLocale = registry.markets[tenant.market]?.locale;
  if (!defaultLocale) {
    throw new TenantNotFoundError(
      `Market "${tenant.market}" for tenant "${tenantKey}" has no locale`,
    );
  }

  return async <U = T>(url: string, fetchInit?: RequestInit & { locale?: string }) => {
    const { locale: overrideLocale, ...restFetchInit } = fetchInit ?? {};
    const resolvedLocale = overrideLocale ?? defaultLocale;

    return cachedFetch<U>(url, {
      ...restFetchInit,
      locale: resolvedLocale,
      cacheDir: options?.cacheDir,
      debug: options?.debug,
      log: options?.log,
    });
  };
}

// Export constant for external use (e.g., CLI)
export { DEFAULT_CACHE_DIR };
