# CODEMAP: `@multitenant/cli`

**Role:** User-facing `multitenant` binary (also `tenantify` alias if configured in consumer `package.json`).

## Entrypoints

| File | Notes |
|------|--------|
| `packages/cli/src/cli.ts` | Commander program: `init`, `check`, `print`, `dev`. |
| `packages/cli/src/init.ts` | `runInit()`, `buildMinimalTenantsConfig`, `InitAbortedError`; optional `confirmOverwrite` for tests/CI. |
| `packages/cli/src/init.test.ts` | Vitest: pure config validation, temp-dir integration, framework stubs, overwrite/skip paths. |
| `packages/cli/src/index.ts` | Re-exports config/core/dev-proxy helpers for programmatic use. |

## Commands (high level)

- **init** — `DEFAULT_CONFIG_FILENAME` from `@multitenant/config`; overwrite policy: TTY prompt or `--force`.
- **check** — `loadTenantsConfig` / `resolveConfigPath`.
- **print** — `createTenantRegistry` + JSON summary.
- **dev** — `loadTenantsConfig`, `chokidar` on config, `startDevProxy`, optional child `npm|pnpm|yarn run dev`.

## Dependencies

`commander`, `chokidar`, `@multitenant/config`, `@multitenant/core`, `@multitenant/dev-proxy`.

## Docs

- [CLI: init](../CLI/init.md)
- [CLI: dev / check / print](../CLI/tenantify-dev.md)
