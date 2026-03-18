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

