# tenantify dev

Starts a local HTTP proxy that maps per-tenant subdomains to your app’s dev server.

## Usage

```bash
npx tenantify dev [options]
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--config <path>` | (auto) | Path to `tenants.config.json`. |
| `--cwd <dir>` | `process.cwd()` | Working directory. |
| `-p, --port <number>` | `3100` | Port the proxy listens on. |
| `-t, --target <url>` | `http://localhost:3000` | Upstream dev server URL. |
| `--run-dev` | off | Spawn `npm` / `pnpm` / `yarn` `run dev` and manage its lifecycle. |
| `--env <name>` | `local` | Environment: `local`, `development`, `staging`, or `production`. |

## Behavior

1. Loads and validates `tenants.config.json` from `--cwd`.
2. Builds a tenant registry and resolves tenant by request **Host** using `domains[env]`.
3. Proxies requests to `--target` and injects headers: `x-tenant-key`, `x-market-key`, `x-tenant-env`, and optionally `x-tenant-flags` (JSON).
4. If `--run-dev` is set, detects package manager (pnpm/yarn/npm) and runs the `dev` script from `package.json` before starting the proxy.
5. Watches `tenants.config.json` and reloads the registry on change.

## Examples

```bash
# App already running on 3000; proxy on 3100
npx tenantify dev --target http://localhost:3000 --port 3100

# Let Tenantify start the app
npx tenantify dev --run-dev --port 3100
```

Then open e.g. `http://us.localhost:3100` (or whatever hosts you defined in `domains.local`).
