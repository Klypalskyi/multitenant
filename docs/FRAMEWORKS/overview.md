# Framework integrations

Scaffold a minimal config and optional stubs: [`multitenant init`](../CLI/init.md).

| Package | Use case |
|---------|----------|
| `@multitenant/next` | Optional meta-install – re-exports `core`, `config`, `react`, `next-app` |
| `@multitenant/next-app` | Next.js 13+ App Router – middleware, `getTenantFromHeaders`, `requireTenant`; `@multitenant/next-app/auto` and `/auto-node` for zero-config middleware (see package README) |
| `@multitenant/next-pages` | Next.js Pages Router – `withTenantGSSP`, `withTenantApi` |
| `@multitenant/react` | React – `TenantProvider`, `useTenant`, `useMarket`, `useTenantFlag`, `useExperiment`, `useTenantTheme`, `useTenantConfig` |
| `@multitenant/express` | Express – `multitenantExpress({ registry, environment })` → `req.tenant` |
| `@multitenant/nest` | NestJS – `MultitenantModuleForRoot({ registry, environment })`, `@Tenant()` param decorator |

All adapters expect a **TenantRegistry** from `createTenantRegistry(config)` where `config` is your loaded `TenantsConfig` (e.g. from `tenants.config.json` via `@multitenant/config` or from a static import).

**Next.js App Router:** [next-app-router.md](next-app-router.md) · **Express:** [express.md](express.md) · **NestJS:** [nestjs.md](nestjs.md) · **React SSR / RSC:** [react-ssr.md](react-ssr.md) · **Product framing:** [Why Multitenant](../WHY-MULTITENANT.md).
