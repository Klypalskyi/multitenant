# Per-tenant database URL (Phase 8.5)

**Topology B (partial):** distinct connection URL per tenant, resolved from **environment variables** — never from raw secrets in `tenants.config.json`.

## Config shape

On each **`TenantDefinition`** (optional):

```json
{
  "tenants": {
    "acme": {
      "market": "us",
      "domains": { ... },
      "database": { "envVar": "DATABASE_URL_TENANT_ACME" }
    }
  }
}
```

- **`database.envVar`** — must match `/^[A-Za-z_][A-Za-z0-9_]*$/` (validated by `@multitenant/config` / `npx multitenant check`).
- Put the real DSN in **deployment env**, secret manager injection, or local `.env` (gitignored).

## Runtime resolution

Use **`resolveTenantDatabaseUrl(resolved, tenants, options?)`** from `@multitenant/database`:

- **`resolved`** — `ResolvedTenant` from `registry.resolveByHost` / `resolveByRequest`.
- **`tenants`** — `registry.tenants` (normalized) or `config.tenants` after `validateTenantsConfig`.
- **`env`** — override map (defaults to `process.env`).
- **`required`** — default `true`: throws if `database.envVar` is set but the variable is missing or empty; set `false` to get `undefined`.

```ts
import { resolveTenantDatabaseUrl } from '@multitenant/database';

const url = resolveTenantDatabaseUrl(resolved, registry.tenants);
// pass url to pool / Drizzle / Prisma datasource for this request
```

Pair with **`runWithTenantScope`** at the HTTP boundary so repository code can read **`requireTenantKey()`** while the URL selection happens once per request using the same `resolved.tenantKey`.

## Threat model

- **Host resolution ≠ authz** — only set DSN after trusted tenant resolution (and identity `assertAccess` when applicable).
- **Logs** — never print full DSNs; redact passwords in structured logs.
- **Pool keys** — use **`BoundedTenantDbResourceCache`** / **`getOrCreateTenantDatabaseResource`** (Phase **8.6** — [bounded-tenant-db-pools.md](bounded-tenant-db-pools.md)); cache keys always include **tenant + URL**.

## See also

- [Config: tenants](../CONFIG/tenants-config.md)
- [Database scope / ALS](database-scope.md)
- [PLAN Phase 8](../../PLAN.md)
