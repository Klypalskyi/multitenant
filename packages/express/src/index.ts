import type { Request, Response, NextFunction } from 'express';
import type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@tenantify/core';

export interface TenantifyExpressOptions {
  registry: TenantRegistry;
  environment?: EnvironmentName;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: ResolvedTenant | null;
    }
  }
}

export function tenantifyExpress(options: TenantifyExpressOptions) {
  const { registry, environment } = options;
  return function tenantMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    const host =
      (req.headers['x-forwarded-host'] as string) ??
      req.headers.host ??
      undefined;
    req.tenant = registry.resolveByRequest(
      {
        host: typeof host === 'string' ? host : Array.isArray(host) ? host[0] : undefined,
        headers: req.headers as Record<string, string | string[]>,
      },
      { environment },
    );
    next();
  };
}

export type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@tenantify/core';
