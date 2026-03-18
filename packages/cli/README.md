# @multitenant/cli

CLI for working with `@multitenant/*` multi-tenant packages. It exposes a `multitenant` binary (with a deprecated `tenantify` alias) with:

- `multitenant check` – validate `tenants.config.json`
- `multitenant print` – print tenants/markets summary
- `multitenant dev` – start a local dev proxy with per-tenant subdomains

## Install

```bash
npm install -D @multitenant/cli
```

Add a script:

```jsonc
{
  "scripts": {
    "tenant:dev": "multitenant dev --target http://localhost:3000 --port 3100"
  }
}
```

## Commands

### `multitenant check`

```bash
npx multitenant check
```

Validates `tenants.config.json` in the current working directory and prints any schema or cross-field errors.

### `multitenant dev`

```bash
npx multitenant dev --target http://localhost:3000 --port 3100
```

- Spins up a proxy on `--port`
- Resolves tenant by `Host` header using your `tenants.config.json`
- Forwards traffic to `--target`

Optional:

- `--run-dev` – automatically run `npm|pnpm|yarn run dev` in your app before starting the proxy.

