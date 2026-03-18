# Framework integrations

| Package | Use case |
|---------|----------|
| `@multitenant/next-app` | Next.js 13+ App Router – middleware, `getTenantFromHeaders`, `requireTenant` |
| `@multitenant/next-pages` | Next.js Pages Router – `withTenantGSSP`, `withTenantApi` |
| `@multitenant/react` | React – `TenantProvider`, `useTenant`, `useMarket`, `useTenantFlag`, `useExperiment`, `useTenantTheme`, `useTenantConfig` |
| `@multitenant/express` | Express – `multitenantExpress({ registry, environment })` → `req.tenant` |
| `@multitenant/nest` | NestJS – `MultitenantModuleForRoot({ registry, environment })`, `@Tenant()` param decorator |

All adapters expect a **TenantRegistry** from `createTenantRegistry(config)` where `config` is your loaded `TenantsConfig` (e.g. from `tenants.config.json` via `@multitenant/config` or from a static import).
