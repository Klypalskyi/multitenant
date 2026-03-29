# Examples

## Runnable workspaces (`package.json`)

| Workspace | Scripts | Notes |
|-----------|---------|--------|
| **`config-smoke/`** | `npm run smoke` | Validates repo root `tenants.config.json` + `resolveByHost` — run from root as **`npm run examples:smoke`** (after `npm run build`). |
| **`express-minimal/`** | `npm run start`, `npm run smoke` | Express + **`multitenantExpress`**; smoke uses **supertest** (no listening port). Root: **`npm run examples:express-smoke`**. |
| **`next-minimal/`** | `npm run dev`, `npm run build` | Next.js 15 App Router — middleware via **`@multitenant/next-app/auto`**, RSC page + **`getTenantFromHeaders`**. **`next build`** runs in root **`npm run build`** (turbo). Use Host **`us.localhost`** (e.g. port **3050**). |

From monorepo root (after `npm install`):

```bash
npm run examples:smoke
npm run examples:express-smoke
npm run dev -w @multitenant/example-next-minimal
npm run start -w @multitenant/example-express-minimal
```

## Reference-only folders (no `package.json`)

Copy-paste snippets assuming this repo tree (`../../tenants.config.json` from `examples/next-app-router/`):

| Folder | What it shows |
|--------|----------------|
| `next-app-router/` | `middleware.ts`, `tenant-registry.ts`, minimal `app/` (see **`next-minimal`** for a full build). |
| `next-pages/` | `tenant-registry.ts` + `pages/index.tsx` |
| `express/` | Express wiring (see **`express-minimal`** for runnable). |

## Using in your own app

1. Run **`npx @multitenant/cli init`** (or copy root `tenants.config.json` and adjust domains).
2. For local multi-host testing, use **`multitenant dev`** — see [`docs/CLI/tenantify-dev.md`](../docs/CLI/tenantify-dev.md).
