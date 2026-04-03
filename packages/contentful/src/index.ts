// ─── Types ────────────────────────────────────────────────────────────────
export type {
  ContentfulCacheOptions,
  TenantContentfulCacheOptions,
  ContentfulSdkConfig,
  CacheEntryStats,
  CacheLogEvent,
} from './types';

// ─── Client factories ──────────────────────────────────────────────────────
export { createCachedContentfulClient } from './client';
export { createTenantContentfulClient } from './tenant-client';

// ─── Cache stats and utilities (mirrors @multitenant/next-app surface) ────
export { getCacheStats, resetCacheStats, DEFAULT_CACHE_DIR } from './cache';
