# Error taxonomy (`@multitenant/core`)

All errors extend **`MultitenantError`** and expose a stable **`code`** string for programmatic handling (`instanceof` or `switch (e.code)`).

| Class | `code` | When |
|-------|--------|------|
| `InvalidTenantsConfigError` | `MULTITENANT_INVALID_CONFIG` | Zod / cross-field validation failures, missing `tenants.config.json`, JSON parse errors, failed auto-load in `createTenantRegistry()` when config is omitted |
| `DomainResolutionError` | `MULTITENANT_DOMAIN_RESOLUTION` | Ambiguous domain patterns at runtime, unknown `environment` during resolution, tenant references unknown market (inconsistent config) |
| `TenantNotFoundError` | `MULTITENANT_TENANT_NOT_FOUND` | Domain target points at a missing tenant row; `requireTenant()` / Next middleware `onMissingTenant: 'throw'` when no tenant resolves |

Helper: **`isMultitenantError(unknown)`** — type guard.

## Config (`@multitenant/config`)

`validateTenantsConfig()` and `loadTenantsConfig()` throw **`InvalidTenantsConfigError`** (replacing generic `Error` for validation failures).

## Registry debugging

`createTenantRegistry(config, options)` accepts:

- **`debug?: boolean`** — logs resolution steps via `console.debug` with a `[multitenant]` prefix.
- **`log?: (message, ...args) => void`** — custom logger (e.g. OpenTelemetry); when set, called for resolution steps without requiring `debug`.

No secrets are logged; payloads are host, environment, matched `tenantKey`, and `basePath` when applicable.

## Next.js (`@multitenant/next-app`)

`requireTenant()` throws **`TenantNotFoundError`** when headers do not yield a tenant.

**Migration (0.3 → 0.4):** Code that relied on `error.message` substrings still works; prefer `instanceof TenantNotFoundError` or `e.code === 'MULTITENANT_TENANT_NOT_FOUND'` for branching.
