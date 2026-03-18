import {
  Module,
  MiddlewareConsumer,
  NestModule,
  createParamDecorator,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@multitenant/core';

export const MULTITENANT_MODULE_OPTIONS = 'MULTITENANT_MODULE_OPTIONS';

export interface MultitenantModuleOptions {
  registry: TenantRegistry;
  environment?: EnvironmentName;
}

@Module({})
export class MultitenantModule implements NestModule {
  constructor(
    @Inject(MULTITENANT_MODULE_OPTIONS) private readonly options: MultitenantModuleOptions,
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

export function MultitenantModuleForRoot(options: MultitenantModuleOptions) {
  return {
    module: MultitenantModule,
    providers: [
      {
        provide: MULTITENANT_MODULE_OPTIONS,
        useValue: options,
      },
    ],
    exports: [MULTITENANT_MODULE_OPTIONS],
  };
}

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedTenant | null => {
    const request = ctx.switchToHttp().getRequest<{ tenant?: ResolvedTenant | null }>();
    return request.tenant ?? null;
  },
);

export type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@multitenant/core';
