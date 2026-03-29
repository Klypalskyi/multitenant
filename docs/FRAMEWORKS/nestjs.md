# NestJS

Package: `@multitenant/nest`. Registers middleware that resolves the tenant the same way as Express (host + headers) and sets **`request.tenant`** (`ResolvedTenant | null`).

## Setup

```ts
import { MultitenantModuleForRoot } from '@multitenant/nest';

@Module({
  imports: [
    MultitenantModuleForRoot({
      registry,
      environment: 'local',
    }),
  ],
})
export class AppModule {}
```

## `@Tenant()` parameter

```ts
import type { ResolvedTenant } from '@multitenant/core';
import { Tenant } from '@multitenant/nest';

@Get('profile')
getProfile(@Tenant() tenant: ResolvedTenant | null) {
  …
}
```

`tenant` may be **`null`** if the host did not match any domain map (same semantics as optional resolution elsewhere). Use guards or throw if a route must always have a tenant.

## DI vs registry

The module stores options in a token (`MULTITENANT_MODULE_OPTIONS`). The **registry** is created in your bootstrap (e.g. after `loadTenantsConfig`); inject the registry elsewhere by providing it yourself if you need it in services — this package does not register `TenantRegistry` as a Nest provider by default.
