# Examples (reference snippets)

These folders are **copy-paste references** for how multitenant middleware and helpers fit into Next.js App Router, Next.js Pages Router, and Express. They are **not** standalone npm workspaces: there is no per-example `package.json`; paths assume this monorepo layout (e.g. `../../tenants.config.json` from `examples/next-app-router/`).

## Layout

| Folder | What it shows |
|--------|----------------|
| `next-app-router/` | `middleware.ts`, shared `tenant-registry.ts`, minimal `app/` pages |
| `next-pages/` | `tenant-registry.ts` + `pages/index.tsx` pattern |
| `express/` | Express app wiring |

## Using in your own app

1. Run **`npx multitenant init`** in your project (or copy `tenants.config.json` from the repo root and adjust domains).
2. Point imports at **`tenants.config.json`** from your app root (not `../../` unless you keep the same tree).
3. For local multi-host testing, use **`multitenant dev`** and the `domains.local` (or configured) hosts from your config — see [`docs/CLI/tenantify-dev.md`](../docs/CLI/tenantify-dev.md).

Optional future work: add a runnable example per framework with its own `package.json` and CI smoke (see `PLAN.md` Phase 6.3).
