import type { EnvironmentName, ResolvedTenant, TenantRegistry } from '@multitenant/core';

export interface DevProxyTenantResolution {
  tenant: ResolvedTenant;
  /** Normalized hostname used for registry lookup (no port). */
  hostname: string;
  /** Value to set on `x-forwarded-host` for the upstream request (may include port). */
  forwardHostForUpstream: string;
}

/**
 * Resolves the tenant for an incoming dev-proxy request.
 *
 * Tries `Host` first, then `x-forwarded-host` (first comma-separated entry). That way a bad or
 * stale `x-forwarded-host` (e.g. `localhost`) cannot override a correct `Host` like
 * `us.localhost:3100` when the browser talks directly to the proxy.
 */
export function resolveTenantFromIncomingHeaders(
  getHeader: (name: string) => string | string[] | undefined,
  registry: TenantRegistry,
  environment: EnvironmentName,
): DevProxyTenantResolution | null {
  const hostRaw = getHeader('host');
  const forwardedRaw = getHeader('x-forwarded-host');

  const hostStr =
    typeof hostRaw === 'string' ? hostRaw : Array.isArray(hostRaw) ? hostRaw[0] : '';
  const forwardedStr =
    typeof forwardedRaw === 'string'
      ? forwardedRaw.split(',')[0]?.trim() ?? ''
      : Array.isArray(forwardedRaw)
        ? forwardedRaw[0]?.split(',')[0]?.trim() ?? ''
        : '';

  const candidates: Array<{ raw: string; hostname: string }> = [];
  if (hostStr) {
    const hn = hostStr.split(':')[0] ?? '';
    if (hn) candidates.push({ raw: hostStr, hostname: hn });
  }
  if (forwardedStr && forwardedStr !== hostStr) {
    const hn = forwardedStr.split(':')[0] ?? '';
    if (hn) candidates.push({ raw: forwardedStr, hostname: hn });
  }

  for (const c of candidates) {
    const tenant = registry.resolveByHost(c.hostname, { environment });
    if (tenant) {
      return {
        tenant,
        hostname: c.hostname,
        forwardHostForUpstream: c.raw.split(',')[0].trim(),
      };
    }
  }
  return null;
}
