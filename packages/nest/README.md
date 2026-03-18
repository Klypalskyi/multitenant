# @multitenant/nest

NestJS integration for `@multitenant/core`. Provides:

- `TenantifyModuleForRoot({ registry, environment? })` – global module wiring tenant resolution middleware
- `@Tenant()` param decorator – injects the current `ResolvedTenant | null` into controller handlers

## Install

```bash
npm install @multitenant/nest @multitenant/core
```

Peer dependencies:

- `@nestjs/common >= 10.0.0`
- `@nestjs/core >= 10.0.0`

## Usage

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { TenantifyModuleForRoot } from '@multitenant/nest';
import { loadTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';

const config = await loadTenantsConfig({ cwd: process.cwd() });
const registry = createTenantRegistry(config);

@Module({
  imports: [
    TenantifyModuleForRoot({
      registry,
      environment: 'local',
    }),
  ],
})
export class AppModule {}
```

```ts
// app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Tenant } from '@multitenant/nest';
import type { ResolvedTenant } from '@multitenant/core';

@Controller()
export class AppController {
  @Get()
  index(@Tenant() tenant: ResolvedTenant | null) {
    if (!tenant) return 'no tenant';
    return `Tenant ${tenant.tenantKey}`;
  }
}
```

