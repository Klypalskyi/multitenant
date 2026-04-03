# @multitenant/contentful — SDK-Level Build-Time Cache

A Contentful SDK wrapper providing transparent caching at the SDK method level. Unlike fetch-level caching (which cannot intercept the Contentful SDK's internal HTTP layer), this package caches SDK calls directly — preventing duplicate requests, providing filesystem persistence between builds, and integrating seamlessly with `TenantRegistry`.

## Problem

When building multi-locale Next.js sites with Contentful:

- **Duplicate API calls** — 10 concurrent `generateStaticParams` calls all fire identical requests
- **Cold starts** — every new `npm run build` refetches all content from scratch
- **Race conditions** — naive in-memory caches fail under concurrent load
- **Scope confusion** — `React.cache()` is request-scoped, not build-scoped

The Contentful SDK uses internal HTTP logic, so `cachedFetch` (which wraps `fetch()`) cannot intercept SDK calls. This package wraps at the SDK method level instead.

## Solution Architecture

Three-layer cache strategy:

### Layer 1: Inflight Dedup (Always Active)
Within a Node.js process, concurrent callers for the same SDK method + parameters share a single in-flight Promise.

```typescript
// Caller A makes a request
const entries = await client.getEntries({ content_type: 'page', locale: 'en-US' });

// Caller B (concurrent) gets the same Promise
const entriesSame = await client.getEntries({ content_type: 'page', locale: 'en-US' });
// ↓ Same object, one API call total
```

### Layer 2: Filesystem Cache (Build Phase Only)
During `next build`, results are persisted to `.next/.build-cache/locales/{locale}/{hash}.json`, surviving process restarts.

```
.next/.build-cache/locales/
  en-US/
    a3f4b2c9....json  # { cacheKey, locale, cachedAt, data }
  es-US/
    d7e2f1a8....json
```

### Layer 3: Real SDK Call
On cache miss, the real Contentful API call is made, registered in the inflight map, and async-written to disk (non-blocking).

---

## Installation

```bash
npm install @multitenant/contentful
```

Requires:
- `@multitenant/core` (provides `TenantRegistry`, `TenantNotFoundError`)
- `contentful` >= 10.0.0 (peer dependency)

---

## API Reference

### `createCachedContentfulClient(sdkClient, options)`

Wraps an existing Contentful SDK client with transparent caching.

```typescript
import { createClient } from 'contentful';
import { createCachedContentfulClient } from '@multitenant/contentful';

const rawClient = createClient({ space: 'abc123', accessToken: process.env.CTF_TOKEN });

const client = createCachedContentfulClient(rawClient, {
  spaceId: 'abc123',
  locale: 'en-US',
  debug: true,
});

// First call: fetches from API
const entries = await client.getEntries({ content_type: 'page' });

// Subsequent calls with same params: cache hit
const entriesAgain = await client.getEntries({ content_type: 'page' });
```

**Options:**
- `spaceId: string` — Contentful space ID (required)
- `locale: string` — BCP-47 locale (required, used as cache directory segment)
- `cacheDir?: string` — Default: `.next/.build-cache`
- `isBuildPhase?: () => boolean` — Default: `() => process.env.NEXT_PHASE === 'phase-production-build'`
- `debug?: boolean` — Log hits/misses to console.debug
- `log?: (event) => void` — Custom structured log sink

**Returns:** The same `ContentfulClientApi` interface — drop-in replacement for the raw client.

---

### `createTenantContentfulClient(registry, tenantKey, sdkConfig, options?)`

Convenience factory that auto-resolves locale from `TenantRegistry`.

```typescript
import { createTenantRegistry } from '@multitenant/core';
import { createTenantContentfulClient } from '@multitenant/contentful';

const registry = createTenantRegistry();

const client = createTenantContentfulClient(
  registry,
  'us-main',
  {
    spaceId: process.env.CONTENTFUL_SPACE_ID!,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
  },
  { debug: true }
);

// Locale is auto-resolved to registry.markets['us'].locale
const entries = await client.getEntries({ content_type: 'page' });
```

**Parameters:**
- `registry: TenantRegistry`
- `tenantKey: string` — Looks up tenant in registry; throws `TenantNotFoundError` if not found
- `sdkConfig` — See `ContentfulSdkConfig` below
- `options?` — Cache options (without `locale`/`spaceId`, which are resolved automatically)

**Throws:** `TenantNotFoundError` if tenant or market not found.

---

### `ContentfulSdkConfig`

```typescript
interface ContentfulSdkConfig {
  spaceId: string;
  accessToken: string;
  environment?: string;    // Default: 'master'
  preview?: boolean;       // Default: false (uses preview.contentful.com if true)
}
```

---

### Stats & Observability

#### `getCacheStats(): CacheEntryStats[]`

Returns accumulated hit/miss counts per cache key per locale.

```typescript
import { getCacheStats } from '@multitenant/contentful';

const stats = getCacheStats();
// [
//   { url: 'getEntries::abc123::a3f4...', locale: 'en-US', hits: 5, misses: 1 },
//   { url: 'getEntry::abc123::d7e2...', locale: 'en-US', hits: 0, misses: 3 },
// ]
```

#### `resetCacheStats(): void`

Clears all statistics. Useful for testing.

#### Debug Logging

Pass `debug: true` for automatic logging:

```
[multitenant/contentful] MISS en-US getEntries::abc123::a3f4... (hits: 0, misses: 1)
[multitenant/contentful] HIT  en-US getEntries::abc123::a3f4... (hits: 1, misses: 1)
```

Or provide a custom `log` function for structured logging:

```typescript
const client = createCachedContentfulClient(rawClient, {
  spaceId: 'abc123',
  locale: 'en-US',
  log: (event) => {
    console.log({
      type: event.type,
      method: event.url.split('::')[0],
      hits: event.hits,
      misses: event.misses,
    });
  },
});
```

---

## Framework-Agnostic Build Phase Detection

The default build-phase detection uses Next.js's `NEXT_PHASE` environment variable. For other frameworks, pass a custom `isBuildPhase` function:

**Gatsby:**
```typescript
const client = createCachedContentfulClient(rawClient, {
  spaceId: 'abc123',
  locale: 'en-US',
  isBuildPhase: () => process.env.GATSBY_BUILD_STAGE === 'build-html',
});
```

**Remix:**
```typescript
const client = createCachedContentfulClient(rawClient, {
  spaceId: 'abc123',
  locale: 'en-US',
  isBuildPhase: () => process.env.NODE_ENV === 'production' && process.argv.includes('build'),
});
```

---

## Cached Methods

These methods are wrapped and cached:
- `getEntries(query?)`
- `getEntry(id, query?)`
- `getAsset(id, query?)`
- `getAssets(query?)`
- `getContentType(id)`
- `getContentTypes(query?)`
- `getTags(query?)`
- `getLocales()`

**Pass-through (not cached):**
- `sync()` — stateful operation, not idempotent
- `createAssetKey()` — pure computation
- `parseEntries()` — pure computation
- `getSpace()` — rarely used

---

## Cache Key Format

```
Logical key:  {method}::{spaceId}::{sha256(sortedStringify(args))}
Filesystem:   .next/.build-cache/locales/{locale}/{sha256(logicalKey)}.json
```

Arguments are sorted before hashing so that `{ content_type: 'page', locale: 'en-US' }` and `{ locale: 'en-US', content_type: 'page' }` produce the same cache key.

---

## CLI Cache Management

The `@multitenant/cli` `cache` command works with this package's cache files:

```bash
# View cache stats
multitenant cache --stats
# Output:
# Cache stats (.next/.build-cache):
#   en-US: 42 entries, last cached 2025-01-01T10:00:00Z
#   es-US: 38 entries, last cached 2025-01-01T09:55:00Z
#   Total: 80 entries

# Clear one locale
multitenant cache --locale en-US

# Clear multiple
multitenant cache --locale en-US --locale es-US

# Clear all
multitenant cache --locale all

# Custom cache dir
multitenant cache --locale all --cache-dir .cache/contentful
```

---

## Migration Example: Sunrider Website

**Before (broken pattern):**

```typescript
// libs/datasource/src/lib/contentful/client.ts
export class ContentfulWrapper implements SimplifiedContentfulClient {
  async cacheWrap<T>(key: string, refresh: () => Promise<T>): Promise<T> {
    const cached = memCache.get(key);
    if (cached) return cached;
    // BUG: if 10 concurrent callers all miss cache, they all call refresh()
    const data = await refresh();
    memCache.put(key, data, 5000);
    return data;
  }
}
```

**After (fixed with @multitenant/contentful):**

```typescript
// libs/datasource/src/lib/contentful/client.ts
import { createCachedContentfulClient } from '@multitenant/contentful';
import { createClient } from 'contentful';

export function createContentfulClient(spaceId: string, accessToken: string, locale: string) {
  const raw = createClient({ space: spaceId, accessToken });
  return createCachedContentfulClient(raw, {
    spaceId,
    locale,
    debug: process.env.NODE_ENV === 'development',
  });
}
```

Remove the broken `buildCache` and `React.cache()` patterns — inflight dedup in `cachedSdkCall` handles all scenarios correctly.

---

## Verification

```bash
# Build the package
npm run build -w @multitenant/contentful

# Run tests (13 unit tests covering all cases)
npm test -w @multitenant/contentful

# Verify cache structure in your app
NEXT_PHASE=phase-production-build npm run build
ls .next/.build-cache/locales/  # Should show {locale}/ directories
ls .next/.build-cache/locales/en-US/  # Should show *.json cache files
```

---

## Why This Works

| Issue | Old Pattern | @multitenant/contentful |
|-------|-----------|------------------------|
| **Concurrent callers** | All fire requests (race condition) | Share one Promise |
| **Between builds** | Cold start every time (in-memory) | Filesystem persistence |
| **Build scope** | Request-scoped `React.cache()` | Inflight dedup + filesystem |
| **Framework** | Next.js only (`NEXT_PHASE`) | Any framework (`isBuildPhase` injectable) |
| **Error cleanup** | Removes key, stale promises linger | Removes from inflight map |
| **Stats** | None | `getCacheStats()` with hit/miss tracking |
