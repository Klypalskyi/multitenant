import type { EnvironmentName, ResolvedTenant, TenantRegistry } from '@multitenant/core';
import { TenantNotFoundError } from '@multitenant/core';
import type { NextFunction, Request, Response } from 'express';

interface MultitenantExpressOptions {
  registry: TenantRegistry;
  environment?: EnvironmentName;
  /**
   * When resolution yields no tenant: leave `req.tenant` as `null` and call `next()` (default),
   * or call `next(err)` with `TenantNotFoundError` (use an error middleware and `isMultitenantError`).
   */
  onMissingTenant?: 'passthrough' | 'throw';
}

declare global {
  namespace Express {
    interface Request {
      tenant?: ResolvedTenant | null;
    }
  }
}

export function multitenantExpress(options: MultitenantExpressOptions) {
  const { registry, environment, onMissingTenant = 'passthrough' } = options;
  return function tenantMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    const host =
      (req.headers['x-forwarded-host'] as string) ??
      req.headers.host ??
      undefined;
    const resolved = registry.resolveByRequest(
      {
        host: typeof host === 'string' ? host : Array.isArray(host) ? host[0] : undefined,
        headers: req.headers as Record<string, string | string[]>,
      },
      { environment },
    );

    if (!resolved) {
      if (onMissingTenant === 'throw') {
        next(
          new TenantNotFoundError(
            `[multitenant] Unable to resolve tenant for Express request (host: ${typeof host === 'string' ? host : '<missing>'})`,
          ),
        );
        return;
      }
      req.tenant = null;
      next();
      return;
    }

    req.tenant = resolved;
    next();
  };
}

export type {
  TenantRegistry,
  ResolvedTenant,
  EnvironmentName,
} from '@multitenant/core';
