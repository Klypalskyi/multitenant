# NestJS

Package: `@multitenant/nest`. Registers middleware that resolves the tenant the same way as Express (host + headers) and sets **`request.tenant`** (`ResolvedTenant | null`).

## Setup

`MultitenantModuleForRoot` applies **`createMultitenantNestMiddleware(registry, environment)`** globally (`forRoutes('*')`). Import the factory yourself only if you need a narrower route set or to compose with other middleware.

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

## Recipe: one registry instance for middleware + services

Create the registry **once** (sync validate + `createTenantRegistry`, or `await loadTenantsConfig()` then `createTenantRegistry`). Pass that **same object** into `MultitenantModuleForRoot` and into a provider your services inject.

```ts
// tenant.tokens.ts
/** Same registry instance is provided with this token and passed to MultitenantModuleForRoot */
export const TENANT_REGISTRY = Symbol('TENANT_REGISTRY');
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { createTenantRegistry } from '@multitenant/core';
import { validateTenantsConfig } from '@multitenant/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MultitenantModuleForRoot } from '@multitenant/nest';
import { TENANT_REGISTRY } from './tenant.tokens';

const configPath = path.join(process.cwd(), 'tenants.config.json');
const config = validateTenantsConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
const registry = createTenantRegistry(config);

@Module({
  imports: [
    MultitenantModuleForRoot({
      registry,
      environment: (process.env.MULTITENANT_ENV ??
        'production') as import('@multitenant/core').EnvironmentName,
    }),
  ],
  providers: [{ provide: TENANT_REGISTRY, useValue: registry }],
  exports: [TENANT_REGISTRY],
})
export class AppModule {}
```

```ts
// tenant-admin.service.ts (example)
import { Injectable, Inject } from '@nestjs/common';
import type { TenantRegistry } from '@multitenant/core';
import { TENANT_REGISTRY } from './tenant.tokens';

@Injectable()
export class TenantAdminService {
  constructor(@Inject(TENANT_REGISTRY) private readonly registry: TenantRegistry) {}

  listTenantKeys(): string[] {
    return Object.keys(this.registry.tenants);
  }
}
```

**Rules**

- **Singleton:** use `useValue: registry`, not a `useFactory` that allocates a new registry per request.
- **`@Tenant()`** still reads `request.tenant` set by middleware; the injected `TenantRegistry` is for **catalog** ops (all tenants, markets) or **manual** `resolveByHost` / `resolveByRequest` in workers/cron where there is no HTTP request.

## Guards (strict tenant)

If a route must not run without a resolved tenant, use a guard that reads `request.tenant` — same semantics as `requireTenant` on Next. This package does not **export** a guard (so you keep status-code / filter policy in your app); the snippet below is a drop-in starting point.

### Example: `TenantRequiredGuard`

Throws `TenantNotFoundError` from `@multitenant/core` when `request.tenant` is missing. Map it to **404** (or JSON `{ code: 'MULTITENANT_TENANT_NOT_FOUND' }`) with a Nest **exception filter** if the default error shape is not what you want.

```ts
// tenant-required.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantNotFoundError, type ResolvedTenant } from '@multitenant/core';

type TenantRequest = { tenant?: ResolvedTenant | null };

@Injectable()
export class TenantRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<TenantRequest>();
    if (req.tenant == null) {
      throw new TenantNotFoundError('No tenant resolved for this host');
    }
    return true;
  }
}
```

```ts
// e.g. on a controller or single handler
import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantRequiredGuard } from './tenant-required.guard';
import { Tenant } from '@multitenant/nest';
import type { ResolvedTenant } from '@multitenant/core';

@Controller('api')
@UseGuards(TenantRequiredGuard)
export class ApiController {
  @Get('ping')
  ping(@Tenant() tenant: ResolvedTenant) {
    return { tenantKey: tenant.tenantKey };
  }
}
```

Register the guard in `providers` if you inject dependencies into it; for the snippet above, `providers: [TenantRequiredGuard]` plus `@UseGuards(TenantRequiredGuard)` is enough.

## See also

- [Express](express.md) — same host/header resolution model
- [Internal: errors](../INTERNAL/errors.md) — `TenantNotFoundError` when you choose to throw from guards
