# @multitenant/database

Node-only **async context** for tenant scope using `AsyncLocalStorage`. Use after you have resolved a tenant (e.g. from `ResolvedTenant`) to make `tenantKey` (and optional `resolved`) available inside the request’s async tree — without a global singleton.

**Phase 8.2 — shared DB:** `requireTenantKey()`, `assignTenantIdForWrite(row, column?)`, `assertRowTenantColumn(row, column?)` help enforce **`tenant_id`** (or a custom column name) on writes and reads. Still **no** SQL generation or drivers — see [shared-db-tenant-id.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/shared-db-tenant-id.md).

**Phase 8.4 — schema-per-tenant Postgres:** `schemaNameForTenant(tenantKey, options?)`, `requireSchemaNameForCurrentTenant(options?)` map registry keys to **PostgreSQL-safe schema names** (63-byte cap, normalization rules). See [schema-per-tenant-postgres.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/schema-per-tenant-postgres.md).

## Install

```bash
npm install @multitenant/database @multitenant/core
```

## Usage

```ts
import { runWithTenantScopeAsync, requireTenantScope } from '@multitenant/database';

await runWithTenantScopeAsync({ tenantKey: 'acme', resolved }, async () => {
  const scope = requireTenantScope();
  // use scope.tenantKey in repositories
});
```

**Write / read invariants (same scope):**

```ts
import { assignTenantIdForWrite, assertRowTenantColumn, schemaNameForTenant } from '@multitenant/database';

const payload = assignTenantIdForWrite({ title: 'Hello' }); // adds tenant_id
// … INSERT with parameterized SQL …

const row = { id: '1', tenant_id: 'acme', title: 'Hello' }; // from SELECT
assertRowTenantColumn(row);

const schema = schemaNameForTenant('us-main', { prefix: 'tnt' }); // "tnt_us_main"
```

Docs: [database-scope.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/database-scope.md) · [shared-db-tenant-id.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/shared-db-tenant-id.md) · [schema-per-tenant-postgres.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/schema-per-tenant-postgres.md).

---

## Open source

MIT licensed — [**github.com/klypalskyi/multitenant**](https://github.com/klypalskyi/multitenant) · [Issues](https://github.com/klypalskyi/multitenant/issues) · [npm](https://www.npmjs.com/package/@multitenant/database)
