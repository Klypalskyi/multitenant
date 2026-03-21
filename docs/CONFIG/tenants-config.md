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
- `seo`: `defaultTitleTemplate`, `defaultMetaDescription`, `canonicalBaseUrl`
- `theme`: `preset`, `tokens`

## tenants

Each key is a tenant id. Value shape:

- `market` (required) – must exist in `markets`
- `domains` (required) – `Partial<Record<EnvironmentName, DomainMap>>`
  - Each env maps **host pattern** → **tenant key** (string) or `{ tenant, basePath? }`
  - Patterns: exact host (`us.example.com`) or wildcard (`*.us.example.com`)
- `paths.basePath`, `theme`, `flags`, `experiments` (overrides), `seo`, `config` (arbitrary), `access` (defaultRoles, permissions) – optional

## Validation (hard errors)

- Every `tenants[*].market` must exist in `markets`.
- No overlapping domain patterns **within the same environment** (e.g. two tenants claiming the same host).
- Any tenant `experiments` override must reference an entry in top-level `experiments`.

Run `npx multitenant check` to validate.
