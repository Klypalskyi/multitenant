# Build-Time Request Cache for Next.js

**Last Updated:** 2026-04-03

This guide explains the build-time request cache feature available in `@multitenant/next-app` and `@multitenant/next`. This feature reduces redundant API calls to content management systems, data APIs, and other HTTP resources during multi-locale Next.js builds.

## Problem Statement

Multi-tenant, multi-locale Next.js apps often fetch content from external APIs (Contentful, Sanity, Stripe, etc.) during the build phase to pre-render pages. In a typical setup:

- Build runs once per tenant/locale combination
- Each locale fetches the same endpoints separately
- No built-in caching means **redundant API calls** across locales
- API rate limits get exhausted quickly
- Build times increase unnecessarily

**Example:** A build targeting 4 markets (en-US, es-US, fr-CA, de-DE) fetches the same homepage content 4 times:
```
Build starts
  ↓ en-US → POST /graphql (homepage) → API call #1
  ↓ es-US → POST /graphql (homepage) → API call #2
  ↓ fr-CA → POST /graphql (homepage) → API call #3
  ↓ de-DE → POST /graphql (homepage) → API call #4
Build finishes (cache unused)
```

The build-time cache **detects when `next build` is running** and caches fetch responses on disk, keyed by locale and URL hash. Subsequent builds reuse cached data, eliminating duplicate API calls.

## How It Works

### Detection

The cache is active only during `next build` (when `NEXT_PHASE === 'phase-production-build'`). Outside build (e.g., in `next dev` or runtime), `cachedFetch` passes through to native `fetch()` with **no caching**.

### Storage

Cache entries are stored in the filesystem:
```
.next/.build-cache/
└── locales/
    ├── en-US/
    │   ├── a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.json
    │   └── ...
    ├── es-US/
    │   ├── f1e2d3c4b5a6g7h8i9j0k1l2m3n4o5p6.json
    │   └── ...
    └── ...
```

Each file is named after a **SHA256 hash of the request URL** to avoid filename conflicts and filesystem limits. Files contain:
```json
{
  "url": "https://api.example.com/v1/pages/home",
  "locale": "en-US",
  "cachedAt": "2026-04-03T10:30:45.123Z",
  "data": { "title": "Home", "body": "..." }
}
```

### Cache Lifecycle

1. **Cache hit** — URL exists at `<cacheDir>/locales/<locale>/<hash>.json` → return cached data (no fetch)
2. **Cache miss** — URL not found → fetch from remote → store to filesystem → return data
3. **Write errors** — async write failure is logged (if `debug: true`) but does not block the build

### Key Design Decisions

- **Async writes** — cache writes don't block the build
- **Locale-scoped** — same URL can have different cached values per locale (useful for locale-specific APIs)
- **URL-based** — cache is per-URL, not per-component; you control granularity
- **Build-phase only** — no performance impact in `next dev` or runtime
- **No eviction** — cache persists between builds until explicitly invalidated

## API Reference

### `cachedFetch<T>(url, options)`

Simple cached fetch for a single request. Use this for straightforward per-locale API calls.

**Parameters:**

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `url` | `string` | Yes | The URL to fetch |
| `options.locale` | `string` | Yes | Locale code (e.g., `'en-US'`, `'es-US'`) — used as cache directory |
| `options.cacheDir` | `string` | No | Custom cache directory (default: `.next/.build-cache`) |
| `options.debug` | `boolean` | No | Log cache hits/misses to console |
| `options.log` | `(event: CacheLogEvent) => void` | No | Custom log function (overrides `debug`) |
| `...RequestInit` | object | No | Standard `fetch()` options (headers, method, body, etc.) |

**Returns:** `Promise<T>` — the response body (parsed as JSON)

**Example:**

```ts
import { cachedFetch } from '@multitenant/next-app';

export async function generateStaticParams() {
  const data = await cachedFetch<{ pages: Array<{ slug: string }> }>(
    'https://api.contentful.com/v1/pages',
    {
      locale: 'en-US',
      debug: true,
      headers: { Authorization: `Bearer ${process.env.CONTENTFUL_TOKEN}` },
    },
  );
  return data.pages.map((p) => ({ slug: p.slug }));
}
```

### `createTenantCachedFetch<T>(registry, tenantKey, options?)`

Creates a pre-configured cached fetch function bound to a tenant's locale. Useful when you have a tenant/market setup and want to avoid passing locale to every call.

**Parameters:**

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `registry` | `TenantRegistry` | Yes | From `createTenantRegistry(config)` |
| `tenantKey` | `string` | Yes | Tenant key (e.g., `'us-main'`) |
| `options.cacheDir` | `string` | No | Custom cache directory |
| `options.debug` | `boolean` | No | Enable debug logging |
| `options.log` | `(event: CacheLogEvent) => void` | No | Custom logger |

**Returns:** `(url, fetchInit?) => Promise<T>` — a fetch function with signature `(url, { locale?, ...RequestInit }?) => Promise<T>`

**Throws:** `TenantNotFoundError` if the tenant or its market locale is not found

**Example:**

```ts
import { createTenantCachedFetch } from '@multitenant/next-app';
import { tenantRegistry } from '@/lib/tenant-registry';

// Create a fetch function for 'us-main' tenant
// It uses the market's default locale (e.g., 'en-US')
const fetch = createTenantCachedFetch(tenantRegistry, 'us-main', { debug: true });

// In generateStaticParams or getStaticProps
export async function generateStaticParams() {
  // Uses 'en-US' (tenant's market locale) automatically
  const data = await fetch<HomePage>('https://api.contentful.com/pages/home');

  // Override locale for a specific call (e.g., fetch es-US data for a region)
  const esData = await fetch<HomePage>('https://api.contentful.com/pages/home', {
    locale: 'es-US',
  });

  return [];
}
```

### `getCacheStats()`

Returns an array of cache statistics for all entries accessed during the current build.

**Returns:** `CacheEntryStats[]` — array of objects with shape:

```ts
{
  url: string;        // The cached URL
  locale: string;     // The locale
  hits: number;       // Number of times this entry was read from cache
  misses: number;     // Number of times this entry was fetched (missed cache)
}
```

**Example:**

```ts
import { getCacheStats } from '@multitenant/next-app';

// At the end of your build or in a logging hook
const stats = getCacheStats();
stats.forEach(({ url, locale, hits, misses }) => {
  const total = hits + misses;
  const hitRate = hits > 0 ? ((hits / total) * 100).toFixed(1) : '0.0';
  console.log(`${locale} ${url}: ${hits}/${total} hits (${hitRate}%)`);
});
```

### `resetCacheStats()`

Clears the in-memory statistics map. Use this between separate build runs if you're tracking stats manually.

## CLI Commands

### View Cache Statistics

```bash
multitenant cache --stats
```

Prints a summary of all cached entries in `.next/.build-cache/locales`:

```
Cache stats (.next/.build-cache):
  en-US: 12 entries, last cached 2026-04-03T10:30:45.123Z
  es-US: 12 entries, last cached 2026-04-03T10:30:52.456Z
  fr-CA: 8 entries, last cached 2026-04-03T10:31:01.789Z
Total: 32 entries
```

### Invalidate Cache for Specific Locales

```bash
# Clear cache for specific locales
multitenant cache --locale en-US --locale es-US

# Clear cache for one locale
multitenant cache --locale fr-CA

# Clear all cache
multitenant cache --locale all
```

### Custom Cache Directory

```bash
multitenant cache --stats --cache-dir ./custom-cache-dir
```

## Usage Examples

### Example 1: Simple Contentful Homepage

```ts
// app/page.tsx
import { cachedFetch } from '@multitenant/next-app';

interface HomePageData {
  title: string;
  description: string;
  sections: Array<{ id: string; content: string }>;
}

export const revalidate = 3600; // ISR: revalidate every hour

export default async function HomePage() {
  const data = await cachedFetch<HomePageData>(
    `https://cdn.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/entries?sys.id=${process.env.CONTENTFUL_HOME_ID}`,
    {
      locale: process.env.NEXT_LOCALE || 'en-US',
      headers: {
        Authorization: `Bearer ${process.env.CONTENTFUL_TOKEN}`,
      },
    },
  );

  return (
    <main>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
      {data.sections.map((section) => (
        <section key={section.id}>{section.content}</section>
      ))}
    </main>
  );
}
```

### Example 2: Multi-Locale Build with Tenant Registry

```ts
// lib/api.ts
import { createTenantCachedFetch } from '@multitenant/next-app';
import { tenantRegistry } from './tenant-registry';

/**
 * Create a cached fetch instance for a tenant.
 * Automatically uses the tenant's market locale.
 */
export function getTenantApi(tenantKey: string) {
  return createTenantCachedFetch(tenantRegistry, tenantKey, {
    debug: process.env.DEBUG === '1',
  });
}
```

```ts
// app/layout.tsx
import { getTenantApi } from '@/lib/api';
import { getTenantFromHeaders } from '@multitenant/next-app';
import { headers } from 'next/headers';

export default async function RootLayout({ children }) {
  const h = await headers();
  const tenant = getTenantFromHeaders(h, tenantRegistry);

  if (!tenant) return <>{children}</>;

  // Fetch tenant-specific config using cached fetch
  const api = getTenantApi(tenant.tenantKey);
  const config = await api<TenantConfig>(`https://api.example.com/config`);

  return (
    <html>
      <body>
        {/* Use config here */}
        {children}
      </body>
    </html>
  );
}
```

### Example 3: Monitoring Cache Hit Rate

```ts
// scripts/build-cache-report.ts
import { getCacheStats } from '@multitenant/next-app';

export function reportCacheStats() {
  const stats = getCacheStats();

  console.log('\n=== Build Cache Report ===\n');

  let totalHits = 0;
  let totalMisses = 0;

  stats.forEach(({ url, locale, hits, misses }) => {
    totalHits += hits;
    totalMisses += misses;
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : '0.0';
    console.log(`[${locale}] ${url}`);
    console.log(`  → ${hits} hits, ${misses} misses (${hitRate}% hit rate)`);
  });

  const totalRequests = totalHits + totalMisses;
  const overallHitRate =
    totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(1) : '0.0';

  console.log(`\nTotal: ${totalHits}/${totalRequests} hits (${overallHitRate}% hit rate)`);
  console.log(`Saved ~${totalHits * 500}ms in API calls\n`); // Assuming 500ms per call
}

// Call this after build
reportCacheStats();
```

## Performance Characteristics

### Build Time Improvement

Typical savings depend on:
- **Number of locales** — more locales = more cache hits
- **Shared content** — how much content is identical across locales
- **API response time** — slow APIs benefit more

**Example measurements:**
- Single-locale build: ~0ms overhead (no cache benefits)
- Dual-locale build: 30–50% reduction in API calls
- 4+ locale build: 60–80% reduction in API calls

### Filesystem I/O

- **Cache hits:** ~1–5ms per entry (filesystem read)
- **Cache misses:** network latency + ~2–5ms filesystem write
- **Writes are async** — no blocking on the critical build path

### Disk Space

Minimal overhead:
- Each cached entry: ~100 bytes to ~50KB (depends on response size)
- Typical project: 50–500 entries → ~1–50MB on disk
- Versioning: you control when to clear via CLI

## Cache Invalidation Strategies

### Strategy 1: Manual Invalidation (Recommended for most projects)

Use the CLI before deploying a build with updated content:

```bash
# Before deploying, clear all cache
multitenant cache --locale all
npm run build
npm run deploy
```

### Strategy 2: Time-Based Invalidation

Clear cache on a schedule (e.g., in CI/CD):

```yaml
# .github/workflows/deploy.yml
- name: Invalidate cache for stale builds
  run: |
    # Clear all cache before production builds
    npx @multitenant/cli cache --locale all
    npm run build
```

### Strategy 3: Content Update Webhooks

If your CMS supports webhooks, trigger cache invalidation:

```ts
// pages/api/webhooks/contentful.ts
import { invalidateCache } from '@multitenant/next-app/cache';

export default async function handler(req, res) {
  if (req.headers['x-contentful-topic'] === 'Entry.publish') {
    // Clear specific locale cache when content updates
    await invalidateCache({
      locales: [process.env.NEXT_LOCALE || 'en-US'],
      cwd: process.cwd(),
    });

    // Trigger rebuild
    await fetch('https://api.vercel.com/v1/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
      body: JSON.stringify({ name: process.env.VERCEL_PROJECT_NAME }),
    });

    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'Unknown event' });
  }
}
```

### Strategy 4: Environment-Based Invalidation

Only cache in specific environments:

```ts
const cacheDir = process.env.NODE_ENV === 'production' ? '.next/.build-cache' : null;

const data = await cachedFetch(url, {
  locale: 'en-US',
  cacheDir, // undefined → no caching in development
});
```

## Troubleshooting

### Cache hits are 0, all misses

**Check:** Is `next build` actually running?
```bash
# Verify NEXT_PHASE is set correctly during build
NEXT_PHASE=phase-production-build next build
```

**Check:** Are URLs consistent across calls?
```ts
// This will create separate cache entries:
await cachedFetch(`https://api.example.com/pages?id=${id}`, { locale });

// More efficient:
const baseUrl = 'https://api.example.com/pages';
await cachedFetch(`${baseUrl}?id=123`, { locale });
```

### Cache grows too large

Monitor with `multitenant cache --stats` and clear periodically:

```bash
multitenant cache --locale all
```

Or implement a cron job to auto-clear:

```bash
# Clear cache older than 7 days (before deployment)
find .next/.build-cache -mtime +7 -delete
```

### Stale cache between builds

If content updates but cache is not invalidated:

```bash
# Option 1: Clear before each build
multitenant cache --locale all && npm run build

# Option 2: Clear specific locales that changed
multitenant cache --locale es-US && npm run build
```

## Disabling the Cache

To disable the cache entirely (e.g., for testing):

```ts
// Don't use cachedFetch; use native fetch
const data = await fetch(url, options).then((r) => r.json());
```

Or set an environment variable and wrap:

```ts
export async function fetchContent(url: string, locale: string) {
  if (process.env.DISABLE_BUILD_CACHE === '1') {
    return fetch(url).then((r) => r.json());
  }
  return cachedFetch(url, { locale });
}
```

## See Also

- [Next.js App Router checklist](./FRAMEWORKS/next-app-router.md)
- [Framework overview](./FRAMEWORKS/overview.md)
- [CLI: cache command](./CLI/tenantify-dev.md) (will expand to include cache docs)
- [`@multitenant/next-app` package README](../packages/next-app/README.md)
