# Framework integrations

| Package | Use case |
|---------|----------|
| `@tenantify/next-app` | Next.js 13+ App Router – middleware, `getTenantFromHeaders`, `requireTenant` |
| `@tenantify/next-pages` | Next.js Pages Router – `withTenantGSSP`, `withTenantApi` |
| `@tenantify/react` | React – `TenantProvider`, `useTenant`, `useMarket`, `useTenantFlag`, `useExperiment`, `useTenantTheme`, `useTenantConfig` |
| `@tenantify/express` | Express – `tenantifyExpress({ registry, environment })` → `req.tenant` |
| `@tenantify/nest` | NestJS – `TenantifyModuleForRoot({ registry, environment })`, `@Tenant()` param decorator |

All adapters expect a **TenantRegistry** from `createTenantRegistry(config)` where `config` is your loaded `TenantsConfig` (e.g. from `tenants.config.json` via `@tenantify/config` or from a static import).
