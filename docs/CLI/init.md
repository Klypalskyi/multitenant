# multitenant init

Scaffold a minimal, valid `tenants.config.json` at the project root (or `--cwd`) and optionally add starter files for a framework adapter.

## Usage

```bash
npx multitenant init [options]
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--cwd <dir>` | `process.cwd()` | Working directory. |
| `--tenant <key>` | `main` | Tenant id in `tenants`. |
| `--market <key>` | `default` | Market id in `markets`. |
| `--local-host <pattern>` | `main.localhost` | Single host pattern for `domains.local` (maps to `--tenant`). |
| `--framework <name>` | `none` | `none` \| `next-app` \| `next-pages` \| `express` — see below. |
| `--force` | off | Overwrite existing files without prompting (non-interactive). |

## Behavior

1. Builds a minimal config (one market, one tenant, `local` domain map) and runs the same validation as `multitenant check` before writing.
2. If `tenants.config.json` already exists, **init** prompts for confirmation (TTY) unless `--force` is passed. Non‑TTY without `--force` exits with an error.
3. **Framework stubs** (when not `none`): writes only if the target file is missing, or prompts / `--force` if it exists.

### `--framework`

| Value | Files created |
|-------|----------------|
| `none` | Only `tenants.config.json`. |
| `next-app` | `middleware.ts` — App Router middleware using `createTenantMiddleware` (imports `./tenants.config.json`). |
| `next-pages` | `lib/tenant-registry.ts` — `createTenantRegistry` for use with `withTenantGSSP` / `withTenantApi`. |
| `express` | `multitenant.server.example.ts` — minimal Express + `multitenantExpress` (rename/integrate into your app). |

Install peer packages for the adapter you use (`@multitenant/next-app`, `@multitenant/next-pages`, `@multitenant/express`, `@multitenant/core`, `next` or `express` as appropriate).

## After init

```bash
npx multitenant check
```

For local multi-host testing, run your app and the dev proxy (see [multitenant dev](tenantify-dev.md)).

## Success criteria (PLAN)

From an empty folder: `npx multitenant init` → `npx multitenant check` exits 0; optional `--framework next-app` gives a runnable middleware stub once Next and `@multitenant/*` deps are installed.
