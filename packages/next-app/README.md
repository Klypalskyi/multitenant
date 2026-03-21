# @multitenant/next-app

Next.js **App Router** integration for `@multitenant/core`.

It provides:

- `createTenantMiddleware(registry, options)` – Next.js `middleware.ts` factory
- `getTenantFromHeaders(headers, registry, options?)` – read `ResolvedTenant` in route handlers / server components
- `requireTenant(headers, registry, options?)` – same but throws if missing

## Install

```bash
npm install @multitenant/next-app @multitenant/core
```

## Usage

### `middleware.ts`

```ts
import type { EnvironmentName } from '@multitenant/core';
import { createTenantMiddleware } from '@multitenant/next-app';
import tenantsConfig from './tenants.config.json';
import { createTenantRegistry } from '@multitenant/core';

const registry = createTenantRegistry(tenantsConfig as any);
const env = (process.env.TENANT_ENV ?? 'local') as EnvironmentName;

export const middleware = createTenantMiddleware(registry, {
  environment: env,
});
```

#### Missing tenant behavior
`createTenantMiddleware` resolves the tenant from the incoming request `Host` header (it also respects `x-forwarded-host`).
If the current host doesn't match any tenant domain (common when you run `next dev` directly on `localhost` instead of via `multitenant dev`), tenant resolution will fail.
By default (`onMissingTenant: 'passthrough'`) the middleware will *not* throw; it will `NextResponse.next()` (no tenant headers are added). Your app/server code must still handle `getTenantFromHeaders(...) === null` if you don’t route through `multitenant dev`.
If you want a hard failure (or logs), set `onMissingTenant: 'throw'` (or `'warn'`).

### In route handlers / server components

```ts
import { headers } from 'next/headers';
import { getTenantFromHeaders } from '@multitenant/next-app';
import { tenantRegistry } from './tenant-registry';

export async function GET() {
  const h = headers();
  const tenant = getTenantFromHeaders(h, tenantRegistry, { environment: 'local' });
  // ...
}
```

