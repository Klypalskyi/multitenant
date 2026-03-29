# Getting started

For scope and pitfalls, see [Why Multitenant](WHY-MULTITENANT.md).

1. **Add config at repo root**

   **Option A — scaffold**

   ```bash
   npx multitenant init
   # optional: --framework next-app | next-pages | express
   npx multitenant check
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
   npx multitenant check
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
   npx multitenant dev --target http://localhost:3000 --port 3100
   ```

   Open `http://us.localhost:3100` (or the hosts you defined in `domains.local`).

   Optional: `npx multitenant dev --run-dev` to let Multitenant spawn `npm run dev` for you.

## Async or remote config (bootstrap only)

`createTenantRegistry` is **synchronous** — pass an already-loaded `TenantsConfig` object. If config comes from **S3, Control Plane, or your DB**, load and validate it **once** at process/App startup (e.g. `await fetchConfig()` → `validateTenantsConfig(raw)`), then construct the registry and reuse that instance for the lifetime of the worker (refresh on interval or signal if your ops model requires it). Do **not** make the registry itself async; keep async I/O at the edges and inject the resulting config into middleware and DI.
