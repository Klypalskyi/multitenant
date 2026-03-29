# @multitenant/database

Node-only **async context** for tenant scope using `AsyncLocalStorage`. Use after you have resolved a tenant (e.g. from `ResolvedTenant`) to make `tenantKey` (and optional `resolved`) available inside the request’s async tree — without a global singleton.

**No** SQL, drivers, or connection pools — see [Phase 8](https://github.com/klypalskyi/multitenant/blob/master/PLAN.md) in the repo PLAN for future ORM peers.

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

Docs: [`docs/INTERNAL/database-scope.md`](../../docs/INTERNAL/database-scope.md).
