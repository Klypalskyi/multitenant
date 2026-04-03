/**
 * Cache statistics entry — tracks hits/misses for a specific method+locale combo.
 */
export interface CacheEntryStats {
  /** Logical cache key: `{method}::{spaceId}::{sha256(args)}` */
  url: string;
  locale: string;
  hits: number;
  misses: number;
}

/**
 * Event emitted on cache hit or miss — structured log format.
 */
export interface CacheLogEvent {
  type: 'hit' | 'miss';
  /** Same as CacheEntryStats.url — kept as `url` for interface parity with cachedFetch */
  url: string;
  locale: string;
  hits: number;
  misses: number;
}

/**
 * Configuration options for createCachedContentfulClient.
 */
export interface ContentfulCacheOptions {
  /**
   * Contentful space ID.
   * Baked into the cache key to ensure calls to different spaces don't collide.
   */
  spaceId: string;

  /**
   * BCP-47 locale string (e.g. 'en-US', 'fr-CA').
   * Used as the filesystem directory segment and inflight map key prefix.
   * Required at call time; if unspecified, requests fail.
   */
  locale: string;

  /**
   * Root directory for build-phase cache files.
   * Default: '.next/.build-cache' (same as @multitenant/next-app cachedFetch for CLI parity).
   */
  cacheDir?: string;

  /**
   * Returns true when the process is in a build phase and filesystem
   * persistence should be used.
   *
   * Default: () => process.env.NEXT_PHASE === 'phase-production-build'
   *
   * Provide a custom function for Gatsby (`process.env.GATSBY_BUILD_STAGE`),
   * Remix, or any other build tool. Allows framework-agnostic operation.
   */
  isBuildPhase?: () => boolean;

  /**
   * Log cache events to console.debug with [multitenant/contentful] prefix.
   * Ignored when `log` is provided.
   */
  debug?: boolean;

  /**
   * Custom structured log sink. When set, `debug` is ignored.
   */
  log?: (event: CacheLogEvent) => void;
}

/**
 * Options for createTenantContentfulClient — same as ContentfulCacheOptions
 * but without `locale` and `spaceId` (resolved from the registry and SDK config).
 */
export type TenantContentfulCacheOptions = Omit<ContentfulCacheOptions, 'locale' | 'spaceId'>;

/**
 * Configuration for the raw Contentful SDK client passed to createTenantContentfulClient.
 */
export interface ContentfulSdkConfig {
  /** Contentful space ID */
  spaceId: string;

  /** Contentful API access token (usually environment variable) */
  accessToken: string;

  /**
   * Contentful environment ID.
   * Default: 'master'
   */
  environment?: string;

  /**
   * When true, uses the Preview API endpoint.
   * Default: false (uses delivery endpoint)
   */
  preview?: boolean;
}
