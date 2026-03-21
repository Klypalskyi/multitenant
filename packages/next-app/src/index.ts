import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EnvironmentName, TenantRegistry, ResolvedTenant } from '@multitenant/core';
import { TenantNotFoundError } from '@multitenant/core';

export interface CreateTenantMiddlewareOptions {
  environment?: EnvironmentName;
  headers?: {
    tenantKey?: string;
    marketKey?: string;
    flags?: string;
    environment?: string;
  };
  /**
   * What to do when tenant resolution fails for the incoming request.
   *
   * Default: `passthrough` so `next dev` doesn't crash when you're not running via
   * `multitenant dev` (or the Host header doesn't match your tenant domains).
   */
  onMissingTenant?: 'passthrough' | 'warn' | 'throw';
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
    onMissingTenant = 'passthrough',
  } = options;

  const warnedHosts = new Set<string>();

  return function middleware(request: NextRequest) {
    const headersRecord: Record<string, string | string[]> = {};
    request.headers.forEach((v, k) => {
      headersRecord[k] = v;
    });

    // `x-forwarded-host` can be a comma-separated list; we want the left-most host.
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost
      ? forwardedHost.split(',')[0]?.trim()
      : request.headers.get('host');

    // `@multitenant/core` prefers `req.headers['x-forwarded-host']` over `req.host`, so normalize it here.
    if (forwardedHost && host) {
      headersRecord['x-forwarded-host'] = host;
    }

    const resolved = registry.resolveByRequest(
      {
        host,
        headers: headersRecord,
        url: request.nextUrl.toString(),
      },
      { environment },
    );

    if (!resolved) {
      if (onMissingTenant === 'throw') {
        throw new TenantNotFoundError(
          `[multitenant] Unable to resolve tenant in Next.js middleware (host: ${host ?? '<missing>'})`,
        );
      }

      if (onMissingTenant === 'warn') {
        const hostKey = host ?? '';
        if (!warnedHosts.has(hostKey)) {
          warnedHosts.add(hostKey);
          console.warn(
            `[multitenant] Unable to resolve tenant in Next.js middleware (host: ${hostKey || '<missing>'}). Passing through.`,
          );
        }
      }

      return NextResponse.next();
    }

    const tenantHeader = headers.tenantKey ?? 'x-tenant-key';
    const marketHeader = headers.marketKey ?? 'x-market-key';
    const flagsHeader = headers.flags ?? 'x-tenant-flags';
    const envHeader = headers.environment ?? 'x-tenant-env';

    // Next.js server components read from *request* headers (what we pass via `request.headers`).
    // Don't rely on response headers for server-side `headers()`.
    const newHeaders = new Headers(request.headers);
    newHeaders.set(tenantHeader, resolved.tenantKey);
    newHeaders.set(marketHeader, resolved.marketKey);
    newHeaders.set(envHeader, resolved.environment);
    if (Object.keys(resolved.flags).length > 0) {
      newHeaders.set(flagsHeader, JSON.stringify(resolved.flags));
    }

    return NextResponse.next({
      request: {
        headers: newHeaders,
      },
    });
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
    throw new TenantNotFoundError('[multitenant] No tenant resolved from request headers');
  }
  return tenant;
}

export type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@multitenant/core';
