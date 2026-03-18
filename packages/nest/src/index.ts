import {
  Module,
  MiddlewareConsumer,
  NestModule,
  createParamDecorator,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@tenantify/core';

export const TENANTIFY_MODULE_OPTIONS = 'TENANTIFY_MODULE_OPTIONS';

export interface TenantifyModuleOptions {
  registry: TenantRegistry;
  environment?: EnvironmentName;
}

@Module({})
export class TenantifyModule implements NestModule {
  constructor(
    @Inject(TENANTIFY_MODULE_OPTIONS) private readonly options: TenantifyModuleOptions,
  ) {}

  configure(consumer: MiddlewareConsumer): void {
    const { registry, environment } = this.options;
    consumer
      .apply((req: any, _res: any, next: () => void) => {
        const host =
          req.headers['x-forwarded-host'] ?? req.headers.host ?? undefined;
        req.tenant = registry.resolveByRequest(
          {
            host: typeof host === 'string' ? host : Array.isArray(host) ? host[0] : undefined,
            headers: req.headers,
          },
          { environment },
        );
        next();
      })
      .forRoutes('*');
  }
}

export function TenantifyModuleForRoot(options: TenantifyModuleOptions) {
  return {
    module: TenantifyModule,
    providers: [
      {
        provide: TENANTIFY_MODULE_OPTIONS,
        useValue: options,
      },
    ],
    exports: [TENANTIFY_MODULE_OPTIONS],
  };
}

/** Param decorator to inject current ResolvedTenant. Use after TenantifyModule middleware. */
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedTenant | null => {
    const request = ctx.switchToHttp().getRequest<{ tenant?: ResolvedTenant | null }>();
    return request.tenant ?? null;
  },
);

export type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@tenantify/core';
