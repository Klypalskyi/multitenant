import type { ContentfulClientApi } from 'contentful';
import type { ContentfulCacheOptions } from './types';
import { cachedSdkCall } from './cache';

/**
 * SDK methods that should be cached (read-only, deterministic).
 */
const CACHED_METHODS = [
  'getEntries',
  'getEntry',
  'getAsset',
  'getAssets',
  'getContentType',
  'getContentTypes',
  'getTags',
  'getLocales',
] as const;

type CachedMethod = (typeof CACHED_METHODS)[number];

/**
 * Wraps a raw Contentful SDK client with transparent caching.
 *
 * Returns a Proxy object that satisfies the same `ContentfulClientApi` interface
 * — it is a drop-in replacement for the raw SDK client.
 *
 * Cached methods (deterministic reads):
 *   - getEntries, getEntry, getAsset, getAssets
 *   - getContentType, getContentTypes, getTags, getLocales
 *
 * Pass-through methods (not cached):
 *   - createAssetKey (pure computation, no API call)
 *   - sync (stateful delta sync, not idempotent)
 *   - parseEntries (pure computation)
 *   - getSpace (rarely used, adds complexity)
 *   - Any other methods added in future SDK versions
 *
 * @param sdkClient - A Contentful SDK client created via `createClient(config)`
 * @param options - Cache configuration (spaceId, locale, cacheDir, etc.)
 * @returns A Proxy object with the same ContentfulClientApi interface
 *
 * @example
 * ```ts
 * import { createClient } from 'contentful';
 * import { createCachedContentfulClient } from '@multitenant/contentful';
 *
 * const rawClient = createClient({ space: 'abc123', accessToken: 'xyz...' });
 * const client = createCachedContentfulClient(rawClient, {
 *   spaceId: 'abc123',
 *   locale: 'en-US',
 *   debug: true,
 * });
 *
 * // First call: fetches from Contentful API
 * const entries = await client.getEntries({ content_type: 'page' });
 *
 * // Second call with same params: cache hit (if within build phase or same process)
 * const entriesAgain = await client.getEntries({ content_type: 'page' });
 * ```
 */
export function createCachedContentfulClient(
  sdkClient: ContentfulClientApi<undefined>,
  options: ContentfulCacheOptions,
): ContentfulClientApi<undefined> {
  const { spaceId, ...restOptions } = options;
  const resolvedSpaceId = spaceId ?? 'unknown';

  return new Proxy(sdkClient, {
    get(target, prop: string) {
      if (!CACHED_METHODS.includes(prop as CachedMethod)) {
        // Pass-through: createAssetKey, sync, parseEntries, getSpace, etc.
        return (target as any)[prop];
      }

      // Return a wrapped function that goes through cachedSdkCall
      return (...args: unknown[]) => {
        const originalMethod = (target as any)[prop] as (
          ...a: unknown[]
        ) => Promise<unknown>;
        return cachedSdkCall(
          prop,
          args,
          resolvedSpaceId,
          { ...restOptions, spaceId: resolvedSpaceId, locale: options.locale },
          () => originalMethod.apply(target, args),
        );
      };
    },
  });
}
