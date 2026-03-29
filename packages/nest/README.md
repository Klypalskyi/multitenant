# @multitenant/nest

NestJS integration for `@multitenant/core`. Provides:

- `MultitenantModuleForRoot({ registry, environment? })` — registers tenant-resolution middleware on all routes
- `createMultitenantNestMiddleware(registry, environment?)` — same handler the module uses; optional for custom `MiddlewareConsumer` paths or tests
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
import { MultitenantModuleForRoot } from '@multitenant/nest';
import { loadTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';

const config = await loadTenantsConfig({ cwd: process.cwd() });
const registry = createTenantRegistry(config);

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

More detail in the repo: [docs/FRAMEWORKS/nestjs.md](https://github.com/klypalskyi/multitenant/blob/master/docs/FRAMEWORKS/nestjs.md).

---

## Open source

MIT licensed — [**github.com/klypalskyi/multitenant**](https://github.com/klypalskyi/multitenant) · [Issues](https://github.com/klypalskyi/multitenant/issues) · [npm](https://www.npmjs.com/package/@multitenant/nest)

