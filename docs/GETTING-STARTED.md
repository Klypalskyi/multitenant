# Getting started

1. **Add config at repo root**

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
   npx tenantify check
   ```

3. **Use in your app**

   - **Next.js App Router**: `@tenantify/next-app` – middleware + `getTenantFromHeaders` / `requireTenant`
   - **Next.js Pages**: `@tenantify/next-pages` – `withTenantGSSP`, `withTenantApi`
   - **React**: `@tenantify/react` – `TenantProvider`, `useTenant`, `useMarket`
   - **Express**: `@tenantify/express` – `tenantifyExpress()` middleware
   - **Nest**: `@tenantify/nest` – `TenantifyModuleForRoot()`, `@Tenant()` decorator

4. **Local dev with subdomains**

   Start your app (`npm run dev`), then in another terminal:

   ```bash
   npx tenantify dev --target http://localhost:3000 --port 3100
   ```

   Open `http://us.localhost:3100` (or the hosts you defined in `domains.local`).

   Optional: `npx tenantify dev --run-dev` to let Tenantify spawn `npm run dev` for you.
