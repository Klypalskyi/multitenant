import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EnvironmentName, TenantRegistry, ResolvedTenant } from '@multitenant/core';

export interface CreateTenantMiddlewareOptions {
  environment?: EnvironmentName;
  headers?: {
    tenantKey?: string;
    marketKey?: string;
    flags?: string;
    environment?: string;
  };
}

export function createTenantMiddleware(
  registry: TenantRegistry,
  options: CreateTenantMiddlewareOptions = {},
) {
  const {
    environment,
    headers = {
      tenantKey: 'x-tenant-key',
      marketKey: 'x-market-key',
      flags: 'x-tenant-flags',
      environment: 'x-tenant-env',
    },
  } = options;

  return function middleware(request: NextRequest) {
    const headersRecord: Record<string, string | string[]> = {};
    request.headers.forEach((v, k) => {
      headersRecord[k] = v;
    });
    const resolved = registry.resolveByRequest(
      {
        host: request.headers.get('host'),
        headers: headersRecord,
        url: request.nextUrl.toString(),
      },
      { environment },
    );

    if (!resolved) {
      throw new Error('[tenantify] Unable to resolve tenant in Next.js middleware');
    }

    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const tenantHeader = headers.tenantKey ?? 'x-tenant-key';
    const marketHeader = headers.marketKey ?? 'x-market-key';
    const flagsHeader = headers.flags ?? 'x-tenant-flags';
    const envHeader = headers.environment ?? 'x-tenant-env';

    response.headers.set(tenantHeader, resolved.tenantKey);
    response.headers.set(marketHeader, resolved.marketKey);
    response.headers.set(envHeader, resolved.environment);
    if (Object.keys(resolved.flags).length > 0) {
      response.headers.set(flagsHeader, JSON.stringify(resolved.flags));
    }

    return response;
  };
}

function headersToRecord(headers: Headers): Record<string, string | string[]> {
  const o: Record<string, string | string[]> = {};
  headers.forEach((v, k) => {
    o[k] = v;
  });
  return o;
}

/** Server-only: read tenant from request headers (e.g. in App Router route handlers). */
export function getTenantFromHeaders(
  headers: Headers,
  registry: TenantRegistry,
  options: { environment?: EnvironmentName } = {},
): ResolvedTenant | null {
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  return registry.resolveByRequest(
    { host, headers: headersToRecord(headers) },
    options,
  );
}

/** Server-only: like getTenantFromHeaders but throws if no tenant (throw-early). */
export function requireTenant(
  headers: Headers,
  registry: TenantRegistry,
  options: { environment?: EnvironmentName } = {},
): ResolvedTenant {
  const tenant = getTenantFromHeaders(headers, registry, options);
  if (!tenant) {
    throw new Error('[tenantify] No tenant resolved from request headers');
  }
  return tenant;
}

export type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@multitenant/core';
