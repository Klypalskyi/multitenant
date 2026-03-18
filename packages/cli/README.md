# @multitenant/cli

CLI for working with `@multitenant/*` multi-tenant packages. It exposes a `tenantify` binary with:

- `tenantify check` – validate `tenants.config.json`
- `tenantify print` – print tenants/markets summary
- `tenantify dev` – start a local dev proxy with per-tenant subdomains

## Install

```bash
npm install -D @multitenant/cli
```

Add a script:

```jsonc
{
  "scripts": {
    "tenant:dev": "tenantify dev --target http://localhost:3000 --port 3100"
  }
}
```

## Commands

### `tenantify check`

```bash
npx tenantify check
```

Validates `tenants.config.json` in the current working directory and prints any schema or cross-field errors.

### `tenantify dev`

```bash
npx tenantify dev --target http://localhost:3000 --port 3100
```

- Spins up a proxy on `--port`
- Resolves tenant by `Host` header using your `tenants.config.json`
- Forwards traffic to `--target`

Optional:

- `--run-dev` – automatically run `npm|pnpm|yarn run dev` in your app before starting the proxy.

