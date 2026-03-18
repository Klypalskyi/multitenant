import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  TenantRegistry,
  ResolvedTenant,
  EnvironmentName,
} from '@tenantify/core';

export interface WithTenantOptions {
  registry: TenantRegistry;
  environment?: EnvironmentName;
}

function getHostFromRequest(req: GetServerSidePropsContext['req']): string | null {
  const host =
    (req.headers['x-forwarded-host'] as string) ??
    req.headers.host ??
    null;
  if (typeof host === 'string') return host;
  if (Array.isArray(host) && host[0]) return host[0];
  return null;
}

/**
 * Wraps getServerSideProps to resolve tenant from request and pass it as `tenant` in props.
 * Your page component should have props extending { tenant: ResolvedTenant }.
 */
export function withTenantGSSP<P extends { tenant: ResolvedTenant }>(
  gssp: (
    ctx: GetServerSidePropsContext & { tenant: ResolvedTenant },
  ) => Promise<GetServerSidePropsResult<P>>,
  options: WithTenantOptions,
): GetServerSideProps<P> {
  const { registry, environment } = options;
  return async (context) => {
    const host = getHostFromRequest(context.req);
    const tenant = registry.resolveByRequest(
      {
        host: host ?? undefined,
        headers: context.req.headers as Record<string, string | string[]>,
      },
      { environment },
    );
    if (!tenant) {
      return {
        notFound: true,
      };
    }
    return gssp({ ...context, tenant });
  };
}

export interface NextApiRequestWithTenant extends NextApiRequest {
  tenant: ResolvedTenant | null;
}

/**
 * Wraps an API route handler to resolve tenant and attach to req.tenant.
 * Throws (404) if tenant cannot be resolved (throw-early).
 */
export function withTenantApi<P = unknown>(
  handler: (
    req: NextApiRequestWithTenant,
    res: NextApiResponse<P>,
  ) => void | Promise<void>,
  options: WithTenantOptions,
) {
  const { registry, environment } = options;
  return async (req: NextApiRequestWithTenant, res: NextApiResponse<P>) => {
    const host =
      (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? null;
    const tenant = registry.resolveByRequest(
      {
        host: host ?? undefined,
        headers: req.headers as Record<string, string | string[]>,
      },
      { environment },
    );
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not resolved' } as P);
      return;
    }
    req.tenant = tenant;
    return handler(req, res);
  };
}

export type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@tenantify/core';
