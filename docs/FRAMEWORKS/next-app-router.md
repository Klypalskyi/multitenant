# Next.js App Router — integration checklist

Use with `@multitenant/next-app` (or meta-package `@multitenant/next`). This doc is **Phase 5.1** guidance from `PLAN.md`: runtime boundaries and where tenant context is safe.

## Resolution vs data access

| Runtime | Tenant resolution | Database / Node APIs |
|---------|-------------------|----------------------|
| **Edge middleware** | Yes — `createTenantMiddleware`, `resolveByRequest` with **inline/static** config (no `fs`) | No — use Route Handlers / server with `nodejs` runtime |
| **Node server** | Yes — `getTenantFromHeaders` / `requireTenant`, or `auto-node` loading `tenants.config.json` | Yes — wrap work in `runWithTenantScope` from `@multitenant/database` if you use ALS |

## Middleware

- Default `onMissingTenant: 'passthrough'` so `next dev` on raw `localhost` does not throw; use `multitenant dev` + matching `domains.local` hosts for real tenant headers, or `onMissingTenant: 'throw'` in production-like setups.
- Prefer **`x-forwarded-host`** when behind a proxy; the middleware normalizes the left-most host.
- Injected request headers for downstream App Router code: `x-tenant-key`, `x-market-key`, `x-tenant-env`, optional `x-tenant-flags` (JSON).

## Server Components & Route Handlers

- Call `headers()` and pass the result into `getTenantFromHeaders(h, registry, { environment })` — **same** `registry` instance shape as middleware (usually one shared module).
- Use `requireTenant` when missing tenant must be a hard error (returns `TenantNotFoundError`).

## Server Actions

- Server Actions run on the **server**; they still receive the **incoming request** headers for that action. Resolve tenant the same way as Route Handlers (`headers()` + `getTenantFromHeaders`), not from client-only context.
- Do **not** assume Edge: set `export const runtime = 'nodejs'` only when you rely on Node-only APIs (`fs`, native DB drivers, `@multitenant/database` ALS tied to the same request).

## Route Handler and Server Action (copy-paste)

Share one registry module (Edge-safe: static import of JSON), then reuse it in middleware, routes, and actions.

**`lib/tenant-registry.ts`**

```ts
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import tenantsConfig from '../tenants.config.json';

export const tenantRegistry = createTenantRegistry(tenantsConfig as TenantsConfig);

export function multitenantEnv() {
  return (process.env.MULTITENANT_ENV ?? process.env.TENANTIFY_ENV ?? 'local') as import('@multitenant/core').EnvironmentName;
}
```

**`middleware.ts`** (project root — **same registry** as Route Handlers / Server Actions)

```ts
import { createTenantMiddleware } from '@multitenant/next-app';
import { multitenantEnv, tenantRegistry } from '@/lib/tenant-registry';

export const middleware = createTenantMiddleware(tenantRegistry, {
  environment: multitenantEnv(),
  // onMissingTenant: 'throw', // when every request must map to a tenant
});

/** Optional — skip static assets and Next internals explicitly */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

For a **single-file** middleware that only imports JSON (no shared `lib/tenant-registry` module), use the minimal pattern in the root [README](../../README.md) (“Copy-paste: Next.js App Router”) — fine when you don’t need the same `TenantRegistry` instance in server code yet.

**`app/api/whoami/route.ts`** (Route Handler)

```ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTenantFromHeaders } from '@multitenant/next-app';
import { multitenantEnv, tenantRegistry } from '@/lib/tenant-registry';

export async function GET() {
  const h = await headers();
  const resolved = getTenantFromHeaders(h, tenantRegistry, { environment: multitenantEnv() });
  return NextResponse.json({
    tenantKey: resolved?.tenantKey ?? null,
    marketKey: resolved?.marketKey ?? null,
  });
}
```

**`app/actions.ts`** (Server Action)

```ts
'use server';

import { headers } from 'next/headers';
import { getTenantFromHeaders } from '@multitenant/next-app';
import { multitenantEnv, tenantRegistry } from '@/lib/tenant-registry';

export async function currentTenantKey(): Promise<string | null> {
  const h = await headers();
  const resolved = getTenantFromHeaders(h, tenantRegistry, { environment: multitenantEnv() });
  return resolved?.tenantKey ?? null;
}
```

Replace `@/` paths with your alias or relative imports. Use `requireTenant` instead of `getTenantFromHeaders` when a missing tenant must hard-fail.

## App Router page (RSC)

Server Components run in Node by default; they can call `headers()` like Route Handlers.

**`app/page.tsx`**

```tsx
import { headers } from 'next/headers';
import { getTenantFromHeaders } from '@multitenant/next-app';
import { getTenantConfig } from '@multitenant/core';
import { multitenantEnv, tenantRegistry } from '@/lib/tenant-registry';

export default async function Page() {
  const h = await headers();
  const resolved = getTenantFromHeaders(h, tenantRegistry, { environment: multitenantEnv() });
  const config = resolved
    ? getTenantConfig(tenantRegistry, resolved.tenantKey, resolved.environment)
    : {};
  return (
    <main>
      <pre>{JSON.stringify({ tenantKey: resolved?.tenantKey ?? null, config }, null, 2)}</pre>
    </main>
  );
}
```

## Node-only Server Action (database)

Server Actions run on the **server**; App Router defaults to the **Node** runtime for server components and most actions. When you force **`runtime = 'edge'`** on a **layout** or **page**, actions imported from that tree run on Edge — avoid native DB drivers there.

```ts
'use server';

import { headers } from 'next/headers';
import { getTenantFromHeaders } from '@multitenant/next-app';
import { multitenantEnv, tenantRegistry } from '@/lib/tenant-registry';

export async function doWork(): Promise<void> {
  const h = await headers();
  const resolved = getTenantFromHeaders(h, tenantRegistry, { environment: multitenantEnv() });
  if (!resolved) return;
  // runWithTenantScope({ tenantKey: resolved.tenantKey }, () => { ... });
}
```

To **force Node** for a subtree (e.g. before adding Edge‑unsafe code), set on **`app/layout.tsx`** or **`app/page.tsx`**: `export const runtime = 'nodejs'`.

## Testing

- Integration-style tests in this repo: `packages/next-app/src/middleware.integration.test.ts` (middleware + `NextRequest`, header propagation contract).

## Build-time request caching (optional)

For multi-locale builds, `@multitenant/next-app` exports `cachedFetch()` and `createTenantCachedFetch()` to cache fetch requests during `next build`. This reduces redundant API calls to Contentful, Sanity, Stripe, and other external services when pre-rendering across multiple locales.

**When to use:** Multi-locale builds with shared content fetched from external APIs.

**Quick example:**

```ts
import { cachedFetch } from '@multitenant/next-app';

export async function generateStaticParams() {
  const data = await cachedFetch<PagesData>(
    'https://api.contentful.com/pages',
    {
      locale: process.env.NEXT_LOCALE || 'en-US',
      debug: true, // log cache hits/misses
    },
  );
  return data.pages.map((p) => ({ slug: p.slug }));
}
```

**Features:**
- Active only during `next build` (zero overhead in `next dev` or runtime)
- Locale-scoped caching (same URL, different results per locale if needed)
- Filesystem storage in `.next/.build-cache/locales/<locale>/`
- CLI to view stats and invalidate cache: `multitenant cache --stats`

See [Build-time cache guide](../BUILD-TIME-CACHE.md) for full API, examples, and strategies.

## See also

- [Framework overview](overview.md)
- [Build-time cache guide](../BUILD-TIME-CACHE.md) — cachedFetch, createTenantCachedFetch, CLI
- [React SSR / RSC + `TenantProvider`](react-ssr.md) — server/client boundary; Next layout example
- [CLI: init](../CLI/init.md) — generated `middleware` stub
- [Internal: database scope](../INTERNAL/database-scope.md) — Node ALS for DB layers
- [Internal: session cookies](../INTERNAL/session-cookies.md) — SameSite / Domain patterns for identity
