## Multitenant

Multi-tenant + multi-market toolkit for TypeScript apps.

**In one line:** resolve **tenant + market** from the **Host** / proxy headers using a single **`tenants.config.json`**, then wire **Next.js (App + Pages), Express, Nest, or React** with typed errors and optional identity cookies.

[![npm](https://img.shields.io/npm/v/@multitenant/core.svg?label=%40multitenant%2Fcore)](https://www.npmjs.com/package/@multitenant/core)

Intro / pitfalls / diagram: [docs/WHY-MULTITENANT.md](docs/WHY-MULTITENANT.md).

**Quick links:** [Getting started](docs/GETTING-STARTED.md) · [Config reference](docs/CONFIG/tenants-config.md) · [Framework overview](docs/FRAMEWORKS/overview.md) · [docs index](docs/INDEX.md) · [Release / publish](docs/RELEASE.md)

**Demo:** there is no hosted SaaS in this repo — use [docs/INDEX.md](docs/INDEX.md), [examples/README.md](examples/README.md) (**runnable** [`express-minimal`](examples/express-minimal/) and [`next-minimal`](examples/next-minimal/) workspaces + `config-smoke`), and `npx multitenant init` as the hands-on path.

### 30-second start

```bash
npx multitenant init --force
npx multitenant check
```

Scaffold writes a valid `tenants.config.json` (and optional framework stubs with `--framework next-app` | `next-pages` | `express`). Then install adapters in your app, e.g. `npm install @multitenant/next next react` or per-package installs — see [Getting started](docs/GETTING-STARTED.md) and [CLI: init](docs/CLI/init.md).

### Copy-paste: Next.js App Router (`middleware.ts`)

```ts
import type { EnvironmentName, TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { createTenantMiddleware } from '@multitenant/next-app';
import tenantsConfig from './tenants.config.json';

const registry = createTenantRegistry(tenantsConfig as TenantsConfig);
const env = (process.env.MULTITENANT_ENV ?? 'local') as EnvironmentName;

export const middleware = createTenantMiddleware(registry, { environment: env });
```

See [Next App Router checklist](docs/FRAMEWORKS/next-app-router.md) for Edge vs Node and `onMissingTenant`.

### What it gives you

- **Config-driven tenants/markets** via `tenants.config.json`
- **Core engine**: `createTenantRegistry(config?)` returns a `TenantRegistry` that can resolve a `ResolvedTenant` from host/headers
- **Framework adapters**:
  - `@multitenant/next-app` – Next.js App Router middleware + server helpers
  - `@multitenant/next-pages` – Next.js Pages Router HOC + API wrapper
  - `@multitenant/react` – `TenantProvider` + hooks
  - `@multitenant/express` – Express middleware
  - `@multitenant/nest` – Nest module + `@Tenant()` decorator
- **CLI**:
  - `multitenant init` – scaffold `tenants.config.json` (+ optional Next/Express stubs)
  - `multitenant check` – validate `tenants.config.json`
  - `multitenant print` – print tenants/markets summary
  - `multitenant dev` – local proxy with per-tenant subdomains

### Packages

- `@multitenant/core`: types (`TenantsConfig`, `ResolvedTenant`, `Identity`, etc.), `createTenantRegistry`, typed errors (`InvalidTenantsConfigError`, `DomainResolutionError`, `TenantNotFoundError`, `isMultitenantError`), guards (`canAccessTenant`, `assertAccess`)
- `@multitenant/config`: `loadTenantsConfig`, `validateTenantsConfig`, `resolveConfigPath`
- `@multitenant/identity`: cookie encode/decode (AES-256-GCM), re-exports identity types and guards
- `@multitenant/dev-proxy`: low-level dev proxy (`startDevProxy`)
- `@multitenant/cli`: `multitenant` binary (deprecated `tenantify` alias)
- `@multitenant/react`, `@multitenant/next-app`, `@multitenant/next-pages`, `@multitenant/express`, `@multitenant/nest`: framework adapters

### Errors

Validation and resolution use typed errors from `@multitenant/core` (`InvalidTenantsConfigError`, `DomainResolutionError`, `TenantNotFoundError`, …). Reference: [docs/INTERNAL/errors.md](docs/INTERNAL/errors.md).

### Install

In a consumer app (not this repo), you’ll install from npm once published, e.g.:

```bash
npm install @multitenant/core @multitenant/config @multitenant/react @multitenant/next-app @multitenant/next-pages
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
import { loadTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';

const config = await loadTenantsConfig({ cwd: process.cwd() });
export const tenantRegistry = createTenantRegistry(config);
```

You can also do `createTenantRegistry()` in Node to auto-load `<cwd>/tenants.config.json`. If you’re in an edge runtime, keep passing the loaded config explicitly.

3. **Wire into your framework** (examples below).

### Next.js App Router example

`middleware.ts`:

```ts
import type { EnvironmentName, TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { createTenantMiddleware } from '@multitenant/next-app';
import tenantsConfig from './tenants.config.json';

const registry = createTenantRegistry(tenantsConfig as TenantsConfig);
const env = (
  process.env.MULTITENANT_ENV ??
  process.env.TENANTIFY_ENV ??
  'local'
) as EnvironmentName;

export const middleware = createTenantMiddleware(registry, {
  environment: env,
});
```

Note: if you run `next dev` directly (Host doesn't match any tenant domains), `createTenantMiddleware` will passthrough by default (no tenant headers added). If you want strict resolution, pass `onMissingTenant: 'throw'`.

`app/layout.tsx` (async request APIs; **`requireTenant`** throws **`TenantNotFoundError`** when unresolved — aligns with [react-ssr checklist](docs/FRAMEWORKS/react-ssr.md)):

```ts
import type { EnvironmentName } from '@multitenant/core';
import type { ReactNode } from 'react';
import { TenantProvider } from '@multitenant/react';
import { requireTenant } from '@multitenant/next-app';
import { headers } from 'next/headers';
import { tenantRegistry } from './tenant-registry';

const env = (
  process.env.MULTITENANT_ENV ??
  process.env.TENANTIFY_ENV ??
  'local'
) as EnvironmentName;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const tenant = requireTenant(h, tenantRegistry, { environment: env });

  return (
    <html lang="en">
      <body>
        <TenantProvider registry={tenantRegistry} tenant={tenant} environment={env}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

Inside components:

```ts
import { useTenant, useMarket, useTenantFlag } from '@multitenant/react';

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
import { TenantProvider } from '@multitenant/react';
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
import { withTenantGSSP } from '@multitenant/next-pages';
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
import { loadTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';
import { multitenantExpress } from '@multitenant/express';

async function main() {
  const app = express();
  const config = await loadTenantsConfig({ cwd: process.cwd() });
  const registry = createTenantRegistry(config);

  app.use(multitenantExpress({ registry, environment: 'local' }));

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
import { MultitenantModuleForRoot } from '@multitenant/nest';
import { loadTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';

const config = await loadTenantsConfig({ cwd: process.cwd() });
const registry = createTenantRegistry(config);

@Module({
  imports: [
    MultitenantModuleForRoot({
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
import { Tenant } from '@multitenant/nest';
import type { ResolvedTenant } from '@multitenant/core';

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
npx multitenant check

# Print a summary
npx multitenant print

# Dev proxy: app on 3000, proxy on 3100
npx multitenant dev --target http://localhost:3000 --port 3100

# Auto-run app dev server
npx multitenant dev --run-dev
```

### Open source

MIT — [**github.com/klypalskyi/multitenant**](https://github.com/klypalskyi/multitenant) · [Issues](https://github.com/klypalskyi/multitenant/issues) · [packages on npm](https://www.npmjs.com/package/@multitenant/core) (`@multitenant/*`)

### Local development (this repo)

```bash
npm install
npm run build
npm run dev    # if/when turbo dev is wired to examples
```
