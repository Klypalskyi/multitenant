# multitenant cache

Manage the build-time request cache for Next.js. View cache entries, statistics, and invalidate cache for specific locales.

The cache is used by `cachedFetch()` and `createTenantCachedFetch()` in `@multitenant/next-app` during `next build` to reduce redundant API calls across locales.

## Usage

```bash
npx @multitenant/cli cache [options]
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `--stats` | boolean | Display cache statistics: entry count per locale and last-modified timestamps |
| `--locale <name>` | string | Invalidate cache for a specific locale (repeatable: `--locale en-US --locale es-US`) |
| `--cache-dir <path>` | string | Custom cache directory (default: `.next/.build-cache`) |
| `--cwd <dir>` | string | Working directory (default: `process.cwd()`) |

## Examples

### View Cache Statistics

```bash
npx @multitenant/cli cache --stats
```

Output:
```
Cache stats (.next/.build-cache):
  en-US: 12 entries, last cached 2026-04-03T10:30:45.123Z
  es-US: 12 entries, last cached 2026-04-03T10:30:52.456Z
  fr-CA: 8 entries, last cached 2026-04-03T10:31:01.789Z
Total: 32 entries
```

### Clear Cache for Specific Locales

```bash
# Clear en-US and es-US
npx @multitenant/cli cache --locale en-US --locale es-US
```

Output:
```
Invalidated cache for locale: en-US
Invalidated cache for locale: es-US
```

### Clear Cache for One Locale

```bash
npx @multitenant/cli cache --locale fr-CA
```

### Clear All Cache

```bash
npx @multitenant/cli cache --locale all
```

Output:
```
Invalidated cache for all locales
```

### Custom Cache Directory

```bash
npx @multitenant/cli cache --stats --cache-dir ./custom-build-cache
```

## Common Patterns

### Before Production Deployment

Clear cache to ensure fresh builds:

```bash
npx @multitenant/cli cache --locale all
npm run build
npm run deploy
```

### In CI/CD (GitHub Actions)

```yaml
- name: Clear build cache
  run: npx @multitenant/cli cache --locale all

- name: Build
  run: npm run build
```

### On CMS Updates (Webhook)

```ts
// pages/api/webhooks/contentful.ts
import { invalidateCache } from '@multitenant/cli/cache';

export default async function handler(req, res) {
  if (req.headers['x-contentful-topic'] === 'Entry.publish') {
    // Clear specific locale cache when content updates
    await invalidateCache({
      locales: [process.env.NEXT_LOCALE || 'en-US'],
      cwd: process.cwd(),
    });

    // Trigger rebuild
    await triggerVercelDeploy();

    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'Unknown event' });
  }
}
```

## See Also

- [Build-time cache guide](../BUILD-TIME-CACHE.md) — comprehensive feature documentation
- [CLI: init](./init.md) — scaffold config and stubs
- [CLI: dev](./tenantify-dev.md) — local proxy for multi-tenant development
