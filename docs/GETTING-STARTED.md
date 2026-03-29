# Getting started

For scope and pitfalls, see [Why Multitenant](WHY-MULTITENANT.md).

1. **Add config at repo root**

   **Option A — scaffold**

   ```bash
   npx @multitenant/cli init
   # optional: --framework next-app | next-pages | express
   npx @multitenant/cli check
   ```

   **Option B — hand-write**

   Create `tenants.config.json`:

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

2. **Validate**

   ```bash
   npx @multitenant/cli check
   ```

   On failure, the CLI prints the same messages as `validateTenantsConfig` (`InvalidTenantsConfigError` in code). See [Errors](INTERNAL/errors.md).

3. **Use in your app**

   - **Next.js App Router**: `@multitenant/next-app` – middleware + `getTenantFromHeaders` / `requireTenant`
   - **Next.js Pages**: `@multitenant/next-pages` – `withTenantGSSP`, `withTenantApi`
   - **React**: `@multitenant/react` – `TenantProvider`, `useTenant`, `useMarket`
   - **Express**: `@multitenant/express` – `multitenantExpress()` middleware
   - **Nest**: `@multitenant/nest` – `MultitenantModuleForRoot()`, `@Tenant()` decorator

4. **Local dev with subdomains**

   Start your app (`npm run dev`), then in another terminal:

   ```bash
   npx @multitenant/cli dev --target http://localhost:3000 --port 3100
   ```

   Open `http://us.localhost:3100` (or the hosts you defined in `domains.local`).

   Optional: `npx @multitenant/cli dev --run-dev` to let Multitenant spawn `npm run dev` for you.

## Async or remote config (bootstrap only)

`createTenantRegistry` is **synchronous** — pass an already-loaded `TenantsConfig`. **Loading** that object may be async (disk, HTTP, control plane); do that **once** at process bootstrap (or before first request), then keep a **single registry instance** for the lifetime of the worker. Do **not** add an async registry API; keep async I/O at the edges and pass the validated config into middleware, Route Handlers, and DI.

**Refresh / hot reload** (signal, cron, watch) is **application-defined** and out of scope here: replace the registry handle your modules use, or restart the process, consistent with your deployment model.

### Load from disk (Node)

Uses the same discovery as the CLI: **`tenants.config.json`** in **`cwd`** (default `process.cwd()`).

```ts
import { createTenantRegistry } from '@multitenant/core';
import { loadTenantsConfig } from '@multitenant/config';

const config = await loadTenantsConfig(); // or loadTenantsConfig({ cwd: '/app' })
export const registry = createTenantRegistry(config);
```

`loadTenantsConfig` parses JSON, runs **`validateTenantsConfig`**, and throws **`InvalidTenantsConfigError`** on failure (same shape as `npx @multitenant/cli check`). See [Errors](INTERNAL/errors.md).

### Load from a remote URL or arbitrary source

Fetch (or read from your DB). If the response is **already** `tenants.config.json`-shaped JSON, validate it directly. If it comes from a **CMS, GraphQL, or proprietary API** (e.g. Contentful entries), your app **maps** that payload into the **`TenantsConfig`** shape (plain objects), then validates:

```ts
import { createTenantRegistry } from '@multitenant/core';
import { validateTenantsConfig } from '@multitenant/config';

/** Your function: SDK types → untyped object that should match the schema. */
function mapContentfulToTenantsConfig(_sdkPayload: unknown): unknown {
  return {
    /* version, defaultEnvironment, markets, tenants, … */
  };
}

async function bootstrapRegistryFromCms() {
  const sdkPayload = await fetchFromYourCms(); // Contentful client, etc.
  const candidate = mapContentfulToTenantsConfig(sdkPayload);
  const config = validateTenantsConfig(candidate); // InvalidTenantsConfigError if map is wrong
  return createTenantRegistry(config);
}
```

Same idea with a static URL when the server returns config-shaped JSON:

```ts
import { createTenantRegistry } from '@multitenant/core';
import { validateTenantsConfig } from '@multitenant/config';

async function bootstrapRegistryFromUrl() {
  const res = await fetch(process.env.TENANTS_CONFIG_URL!, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`config fetch ${res.status}`);
  const raw: unknown = await res.json();
  const config = validateTenantsConfig(raw);
  return createTenantRegistry(config);
}
```

Use whichever bootstrap matches your source (`bootstrapRegistryFromCms`, `bootstrapRegistryFromUrl`, …). Plain Node ESM can top-level `await` the result; otherwise call inside `async main()` and assign to a module-level **`let`**.

In **Next.js**, avoid top-level `await` in modules that Edge may load: run bootstrap in **`instrumentation.ts`** (Node), or use a **lazy** server-only module that awaits once on first use (see [Why Multitenant](WHY-MULTITENANT.md) — Edge vs Node).

### After bootstrap

Pass **`registry`** into **`createTenantMiddleware`**, **`multitenantExpress`**, **`withTenantGSSP`**, etc. Client bundles should receive **`ResolvedTenant`** or derived props from the server; do not ship full **`TenantsConfig`** to the browser unless you intend to expose tenant topology.
