# tenants.config.json reference

Schema and validation rules.

## Location

- **v1**: Single file at **repo root**: `tenants.config.json`.
- Resolved by `@multitenant/config` via `loadTenantsConfig({ cwd })` (default `process.cwd()`).

Validation failures throw **`InvalidTenantsConfigError`** from `@multitenant/core` (see [Errors](../INTERNAL/errors.md)).

## Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `1` | Yes | Config version. |
| `defaultEnvironment` | `'local' \| 'development' \| 'staging' \| 'production'` | No | Used when no env is passed at runtime. |
| `markets` | `Record<string, MarketDefinition>` | Yes | Market definitions (currency, locale, timezone, etc.). |
| `tenants` | `Record<string, TenantDefinition>` | Yes | Tenant definitions; each references a market and has per-env domains. |
| `experiments` | `Record<string, ExperimentDefinition>` | No | A/B experiment definitions. |
| `defaults` | `TenantsDefaults` | No | Global defaults (e.g. `localDomainTemplate`). |

## markets

Each key is a market id. Value shape:

- `currency`, `locale`, `timezone` (required)
- `locales` (optional) – full list of supported BCP 47 locale tags; when set, must include `locale` and must not duplicate entries. Omitted means only `locale` is supported.
- `label`, `primaryDomain`, `fallbackTenant` (optional)
- **`config`** (optional, Phase 3.3) – arbitrary key/value defaults merged into each tenant’s effective config (**before** tenant `config`; see **Config merge** below).
- `seo`: `defaultTitleTemplate`, `defaultMetaDescription`, `canonicalBaseUrl`
- `theme`: `preset`, `tokens`

## tenants

Each key is a tenant id. Value shape:

- `market` (required) – must exist in `markets`
- `domains` (required) – `Partial<Record<EnvironmentName, DomainMap>>`
  - Each env maps **host pattern** → **tenant key** (string) or `{ tenant, basePath? }`
  - Patterns: exact host (`us.example.com`) or wildcard (`*.us.example.com`)
- `paths.basePath`, `theme`, `flags`, `experiments` (overrides), `seo`, `config` (arbitrary), **`configByEnvironment`** (optional, Phase 3.3) – per-environment overlays (`local` \| `development` \| `staging` \| `production`), each a small object merged after **`config`** when that deployment environment applies
- `access` (optional) – `defaultRoles`, `permissions`
- **`database`** (optional, Phase 8.5) – `{ "envVar": "DATABASE_URL_TENANT_KEY" }` only. Must be a valid environment variable **name** (not a URL). Resolve at runtime with `resolveTenantDatabaseUrl` in `@multitenant/database` — see [Per-tenant database URL](../INTERNAL/per-tenant-database-url.md).

## Config merge (Phase 3.3)

**Order:** `markets[*].config` → `tenants[*].config` → `tenants[*].configByEnvironment[environment]` (when an environment key is applied).

- **Deep merge** for nested plain objects (not arrays); **scalars / arrays** are replaced by the later layer (**last wins**).
- **Conflict:** at the same path, one layer has a **plain object** and another a **non-object** → validation fails with **`InvalidTenantsConfigError`** (also caught by `multitenant check`).
- **Server / client:** use **`getTenantConfig(registry, tenantKey, environment?)`** in `@multitenant/core` or **`useTenantConfig()`** in React (resolved tenant’s **`environment`** is passed automatically).

## Validation (hard errors)

- Every `tenants[*].market` must exist in `markets`.
- No overlapping domain patterns **within the same environment** (e.g. two tenants claiming the same host).
- **Config merge** must not hit object vs non-object clashes (per environment that defines a non-empty `configByEnvironment` layer).
- Any tenant `experiments` override must reference an entry in top-level `experiments`.

Run `npx multitenant check` to validate.
