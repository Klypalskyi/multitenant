## Tenantify

Multi-tenant + multi-market toolkit for TypeScript apps.

### What it gives you

- **Config-driven tenants/markets** via `tenants.config.json`
- **Core engine**: `createTenantRegistry(config)` returns a `TenantRegistry` that can resolve a `ResolvedTenant` from host/headers
- **Framework adapters**:
  - `@tenantify/next-app` – Next.js App Router middleware + server helpers
  - `@tenantify/next-pages` – Next.js Pages Router HOC + API wrapper
  - `@tenantify/react` – `TenantProvider` + hooks
  - `@tenantify/express` – Express middleware
  - `@tenantify/nest` – Nest module + `@Tenant()` decorator
- **CLI**:
  - `tenantify check` – validate `tenants.config.json`
  - `tenantify print` – print tenants/markets summary
  - `tenantify dev` – local proxy with per-tenant subdomains

### Packages

- `@tenantify/core`: types (`TenantsConfig`, `ResolvedTenant`, `Identity`, etc.), `createTenantRegistry`, guards (`canAccessTenant`, `assertAccess`)
- `@tenantify/config`: `loadTenantsConfig`, `validateTenantsConfig`, `resolveConfigPath`
- `@tenantify/identity`: cookie encode/decode (AES-256-GCM), re-exports identity types and guards
- `@tenantify/dev-proxy`: low-level dev proxy (`startDevProxy`)
- `@tenantify/cli`: `tenantify` binary
- `@tenantify/react`, `@tenantify/next-app`, `@tenantify/next-pages`, `@tenantify/express`, `@tenantify/nest`: framework adapters

### Install

In a consumer app (not this repo), you’ll install from npm once published, e.g.:

```bash
npm install @tenantify/core @tenantify/config @tenantify/react @tenantify/next-app @tenantify/next-pages
```

### Basic flow

1. **Define tenants.config.json** at your app root:

```json
{
  "version": 1,
  "defaultEnvironment": "local",
  "markets": {
    "us": {
      "currency": "USD",
      "locale": "en-US",
      "timezone": "America/New_York"
    }
  },
  "tenants": {
    "us-main": {
      "market": "us",
      "domains": {
        "local": { "us.localhost": "us-main" },
        "production": { "us.example.com": "us-main" }
      }
    }
  }
}
```

2. **Load + build registry** (Node entrypoint in your app):

```ts
import { loadTenantsConfig } from '@tenantify/config';
import { createTenantRegistry } from '@tenantify/core';

const config = await loadTenantsConfig({ cwd: process.cwd() });
export const tenantRegistry = createTenantRegistry(config);
```

3. **Wire into your framework** (examples below).

### Next.js App Router example

`middleware.ts`:

```ts
import type { EnvironmentName } from '@tenantify/core';
import { createTenantMiddleware } from '@tenantify/next-app';
import tenantsConfig from './tenants.config.json';
import { createTenantRegistry } from '@tenantify/core';

const registry = createTenantRegistry(tenantsConfig);
const env = (process.env.TENANTIFY_ENV ?? 'local') as EnvironmentName;

export const middleware = createTenantMiddleware(registry, {
  environment: env,
});
```

`app/layout.tsx`:

```ts
import { TenantProvider } from '@tenantify/react';
import { getTenantFromHeaders } from '@tenantify/next-app';
import { headers } from 'next/headers';
import { tenantRegistry } from './tenant-registry';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const tenant = getTenantFromHeaders(h, tenantRegistry) ?? (() => {
    throw new Error('No tenant resolved');
  })();

  return (
    <html>
      <body>
        <TenantProvider registry={tenantRegistry} tenant={tenant}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

Inside components:

```ts
import { useTenant, useMarket, useTenantFlag } from '@tenantify/react';

export function Header() {
  const tenant = useTenant();
  const market = useMarket();
  const showNewNav = useTenantFlag('showNewNav');

  return (
    <header>
      <span>{tenant.tenantKey}</span>
      <span>{market.currency}</span>
      {showNewNav && <nav>…</nav>}
    </header>
  );
}
```

### Next.js Pages Router example

`pages/_app.tsx`:

```ts
import type { AppProps } from 'next/app';
import { TenantProvider } from '@tenantify/react';
import { tenantRegistry } from '../tenant-registry';

export default function App({ Component, pageProps }: AppProps & { pageProps: { tenant: any } }) {
  return (
    <TenantProvider registry={tenantRegistry} tenant={pageProps.tenant}>
      <Component {...pageProps} />
    </TenantProvider>
  );
}
```

`pages/index.tsx`:

```ts
import type { GetServerSideProps } from 'next';
import { withTenantGSSP } from '@tenantify/next-pages';
import { tenantRegistry } from '../tenant-registry';

export const getServerSideProps: GetServerSideProps = withTenantGSSP(
  async ({ tenant }) => {
    return { props: { tenant } };
  },
  { registry: tenantRegistry, environment: 'local' },
);

export default function Page({ tenant }: { tenant: any }) {
  return <div>Tenant: {tenant.tenantKey}</div>;
}
```

### Express example

```ts
import express from 'express';
import { loadTenantsConfig } from '@tenantify/config';
import { createTenantRegistry } from '@tenantify/core';
import { tenantifyExpress } from '@tenantify/express';

async function main() {
  const app = express();
  const config = await loadTenantsConfig({ cwd: process.cwd() });
  const registry = createTenantRegistry(config);

  app.use(tenantifyExpress({ registry, environment: 'local' }));

  app.get('/', (req, res) => {
    if (!req.tenant) return res.status(404).send('no tenant');
    res.send(`Tenant ${req.tenant.tenantKey}, market ${req.tenant.marketKey}`);
  });

  app.listen(3000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### NestJS example

```ts
import { Module } from '@nestjs/common';
import { TenantifyModuleForRoot } from '@tenantify/nest';
import { loadTenantsConfig } from '@tenantify/config';
import { createTenantRegistry } from '@tenantify/core';

const config = await loadTenantsConfig({ cwd: process.cwd() });
const registry = createTenantRegistry(config);

@Module({
  imports: [
    TenantifyModuleForRoot({
      registry,
      environment: 'local',
    }),
  ],
})
export class AppModule {}
```

In a controller:

```ts
import { Controller, Get } from '@nestjs/common';
import { Tenant } from '@tenantify/nest';
import type { ResolvedTenant } from '@tenantify/core';

@Controller()
export class AppController {
  @Get()
  index(@Tenant() tenant: ResolvedTenant | null) {
    if (!tenant) return 'no tenant';
    return `Tenant ${tenant.tenantKey}`;
  }
}
```

### CLI usage

```bash
# Validate config
npx tenantify check

# Print a summary
npx tenantify print

# Dev proxy: app on 3000, proxy on 3100
npx tenantify dev --target http://localhost:3000 --port 3100

# Auto-run app dev server
npx tenantify dev --run-dev
```

### Local development (this repo)

```bash
npm install
npm run build
npm run dev    # if/when turbo dev is wired to examples\n```
