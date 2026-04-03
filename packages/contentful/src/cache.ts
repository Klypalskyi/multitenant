import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CacheEntryStats, CacheLogEvent, ContentfulCacheOptions } from './types';

// ─── Constants ────────────────────────────────────────────────────────────

export const DEFAULT_CACHE_DIR = '.next/.build-cache';
const NEXT_BUILD_PHASE = 'phase-production-build';

// ─── Module-level state ──────────────────────────────────────────────────

/**
 * Inflight deduplication map.
 *
 * Key format: `{locale}::{method}::{spaceId}::{sha256(sortedStringify(args))}`
 * Value: the in-flight Promise (NOT the resolved value).
 *
 * Storing the Promise is the critical correctness fix over naive approaches
 * (which store resolved values and thus lose the race condition guard).
 * Concurrent callers that arrive before the first response await the same Promise.
 *
 * Module-level scope means it is shared across all createCachedContentfulClient
 * calls within the same Node.js process (e.g., one build worker). This is
 * intentional and beneficial — deduplication applies globally.
 */
const inflightMap = new Map<string, Promise<unknown>>();

/**
 * Stats accumulator — same shape as cachedFetch's statsMap.
 * Key format: `{locale}::{method}::{spaceId}::{sha256(sortedStringify(args))}`
 * Value: { url, locale, hits, misses }
 */
const statsMap = new Map<string, CacheEntryStats>();

// ─── Helpers ─────────────────────────────────────────────────────────────

function defaultIsBuildPhase(): boolean {
  return process.env.NEXT_PHASE === NEXT_BUILD_PHASE;
}

/**
 * Recursively sorts object keys so that semantically identical queries
 * (e.g., `{ locale: 'en-US', content_type: 'page' }` in any order)
 * always produce the same stringified representation.
 */
function sortedStringify(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as object).sort()) {
    sorted[key] = (value as Record<string, unknown>)[key];
  }
  return JSON.stringify(sorted);
}

/**
 * Builds a deterministic cache key from SDK call metadata.
 *
 * Format: `{method}::{spaceId}::{sha256(sortedStringify(args))}`
 *
 * The args are sorted before hashing so that calls with equivalent parameters
 * in different order produce the same key.
 *
 * @example
 * buildCacheKey('getEntries', [{ content_type: 'page', locale: 'en-US' }], 'abc123')
 * // → 'getEntries::abc123::a3f4b2c9...(64-char hex)'
 */
export function buildCacheKey(method: string, args: unknown[], spaceId: string): string {
  const argsHash = crypto
    .createHash('sha256')
    .update(sortedStringify(args))
    .digest('hex');
  return `${method}::${spaceId}::${argsHash}`;
}

/**
 * Filesystem path for a cached SDK call result.
 *
 * Path format: `{cacheDir}/locales/{locale}/{sha256(cacheKey)}.json`
 *
 * The cache key is hashed again at the filesystem layer to produce a
 * URL-safe, filesystem-safe filename — matching cachedFetch convention.
 */
function getCacheFilePath(locale: string, cacheKey: string, cacheDir: string): string {
  const fileHash = crypto.createHash('sha256').update(cacheKey).digest('hex');
  return path.join(cacheDir, 'locales', locale, `${fileHash}.json`);
}

/**
 * Serialized cache file format.
 */
interface CacheFileData<T = unknown> {
  cacheKey: string;
  locale: string;
  cachedAt: string;
  data: T;
}

/**
 * Attempts to read and parse a cache file.
 * Returns the cached data on success, or null if file doesn't exist or parse fails.
 */
async function tryReadFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as CacheFileData<T>;
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Emits a cache event (hit or miss) via configured channels.
 */
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
      `[multitenant/contentful] ${label} ${event.locale} ${event.url} (hits: ${event.hits}, misses: ${event.misses})`,
    );
  }
}

// ─── Public stats API ─────────────────────────────────────────────────────

/**
 * Returns all accumulated cache statistics (hit/miss counts per key per locale).
 */
export function getCacheStats(): CacheEntryStats[] {
  return Array.from(statsMap.values());
}

/**
 * Clears all accumulated cache statistics.
 * Useful for testing or resetting metrics.
 */
export function resetCacheStats(): void {
  statsMap.clear();
}

/**
 * Clears the inflight promise map.
 * Useful for testing to reset state between test cases.
 * @internal
 */
export function resetInflightMap(): void {
  inflightMap.clear();
}

// ─── Core caching function ───────────────────────────────────────────────

/**
 * Central caching function called by every wrapped SDK method.
 *
 * Implements a three-layer cache strategy:
 *
 * 1. **Inflight dedup** (always active)
 *    Concurrent callers within the same process for the same cache key
 *    await the same Promise. This prevents duplicate SDK calls during builds
 *    and concurrent requests at runtime.
 *
 * 2. **Filesystem cache** (build phase only)
 *    Persists results to disk so warm builds reuse cached data.
 *    Survives process restarts.
 *
 * 3. **Real SDK call**
 *    Registered in inflightMap before awaiting so concurrent arrivals
 *    share the same in-flight Promise. On resolve, async-writes to filesystem
 *    (never blocks the return value). On reject, cleans up inflight entry
 *    so future retries start fresh.
 *
 * @param method - SDK method name (e.g., 'getEntries')
 * @param args - Arguments passed to the SDK method
 * @param spaceId - Contentful space ID
 * @param options - Cache configuration
 * @param factory - Async function that executes the real SDK call
 * @returns The result from the factory, either cached or freshly fetched
 */
export async function cachedSdkCall<T>(
  method: string,
  args: unknown[],
  spaceId: string,
  options: ContentfulCacheOptions,
  factory: () => Promise<T>,
): Promise<T> {
  const cacheKey = buildCacheKey(method, args, spaceId);
  const inflightKey = `${options.locale}::${cacheKey}`;
  const statsKey = inflightKey;

  // ── Ensure stats entry exists ──────────────────────────────────────────
  if (!statsMap.has(statsKey)) {
    statsMap.set(statsKey, { url: cacheKey, locale: options.locale, hits: 0, misses: 0 });
  }
  const stats = statsMap.get(statsKey)!;

  // ── Layer 1: Inflight dedup (always active) ────────────────────────────
  // This guard is always active (not just build phase) because concurrent
  // callers during SSR, testing, or any request handling should also deduplicate.
  const inFlight = inflightMap.get(inflightKey);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const isBuildPhase = options.isBuildPhase?.() ?? defaultIsBuildPhase();
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const filePath = getCacheFilePath(options.locale, cacheKey, cacheDir);

  // ── Layer 2: Filesystem cache hit (build phase only) ────────────────────
  if (isBuildPhase) {
    const cached = await tryReadFile<T>(filePath);
    if (cached !== null) {
      stats.hits++;
      emitEvent({ type: 'hit', ...stats }, options.debug, options.log);
      return cached;
    }
  }

  // ── Layer 3: Real call ─────────────────────────────────────────────────
  // Register the promise BEFORE awaiting so any concurrent callers that
  // arrive after this line share the same promise.
  const promise = factory()
    .then(async (data) => {
      inflightMap.delete(inflightKey);

      if (isBuildPhase) {
        // Async write — never blocks the result return.
        // Errors are caught and logged, never thrown.
        fs.mkdir(path.dirname(filePath), { recursive: true })
          .then(() =>
            fs.writeFile(
              filePath,
              JSON.stringify({
                cacheKey,
                locale: options.locale,
                cachedAt: new Date().toISOString(),
                data,
              } as CacheFileData<T>),
            ),
          )
          .catch((err) => {
            if (options.debug) {
              console.debug(
                `[multitenant/contentful] Failed to write cache for ${options.locale} ${cacheKey}: ${(err as Error).message}`,
              );
            }
          });
      }

      stats.misses++;
      emitEvent({ type: 'miss', ...stats }, options.debug, options.log);
      return data;
    })
    .catch((err) => {
      inflightMap.delete(inflightKey);
      throw err;
    });

  inflightMap.set(inflightKey, promise);
  return promise;
}
