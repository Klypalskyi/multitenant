import * as http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import HttpProxy from 'http-proxy';
import type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@multitenant/core';
import { resolveTenantFromIncomingHeaders } from './resolve-tenant';
import type { DevProxyTenantResolution } from './resolve-tenant';

export { resolveTenantFromIncomingHeaders } from './resolve-tenant';
export type { DevProxyTenantResolution } from './resolve-tenant';

export interface DevProxyOptions {
  registry: TenantRegistry;
  environment: EnvironmentName;
  host?: string;
  port: number;
  targetHost: string;
  targetPort: number;
  injectHeaders?: boolean | {
    tenantKey?: string;
    marketKey?: string;
    flags?: string;
    environment?: string;
  };
  onResolveTenant?: (info: { host: string; tenant: ResolvedTenant | null }) => void;
}

export interface DevProxyInstance {
  close(): Promise<void>;
  port: number;
}

const DEFAULT_HEADERS = {
  tenantKey: 'x-tenant-key',
  marketKey: 'x-market-key',
  flags: 'x-tenant-flags',
  environment: 'x-tenant-env',
};

function firstLocalDomainExample(
  tenant: { domains?: Partial<Record<EnvironmentName, Record<string, unknown>>> },
  environment: EnvironmentName,
): string | null {
  const envDomains = tenant.domains?.[environment];
  if (!envDomains) return null;
  const patterns = Object.keys(envDomains).filter((p) => !p.includes('*'));
  return patterns.sort()[0] ?? null;
}

function errorPage(message: string, tenants?: Array<{ key: string; hostExample: string }>): string {
  const list = tenants
    ? tenants.map((t) => `<li><a href="http://${t.hostExample}">${t.key}</a></li>`).join('')
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Multitenant</title></head><body><h1>${message}</h1>${list ? `<ul>${list}</ul>` : ''}</body></html>`;
}

function describeIncomingHost(req: IncomingMessage): string {
  const h = req.headers.host;
  const xf = req.headers['x-forwarded-host'];
  const hostStr = typeof h === 'string' ? h : Array.isArray(h) ? h[0] : '';
  const xfStr =
    typeof xf === 'string'
      ? xf.split(',')[0]?.trim()
      : Array.isArray(xf)
        ? xf[0]?.split(',')[0]?.trim()
        : '';
  if (hostStr && xfStr && hostStr !== xfStr) {
    return `${hostStr} (x-forwarded-host: ${xfStr})`;
  }
  return hostStr || xfStr || '<missing>';
}

export function startDevProxy(options: DevProxyOptions): Promise<DevProxyInstance> {
  const {
    registry,
    environment,
    host = '0.0.0.0',
    port,
    targetHost,
    targetPort,
    injectHeaders = true,
    onResolveTenant,
  } = options;

  const proxy = HttpProxy.createProxyServer({});
  const target = `http://${targetHost}:${targetPort}`;
  const headerNames =
    injectHeaders === true
      ? DEFAULT_HEADERS
      : injectHeaders === false
        ? null
        : { ...DEFAULT_HEADERS, ...injectHeaders };

  const handleRequest = (req: IncomingMessage): DevProxyTenantResolution | null => {
    const resolved = resolveTenantFromIncomingHeaders(
      (name) => req.headers[name.toLowerCase()],
      registry,
      environment,
    );
    if (resolved) {
      req.headers['x-forwarded-host'] = resolved.forwardHostForUpstream;
    }
    return resolved;
  };

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const resolved = handleRequest(req);
    const hostname = resolved?.hostname ?? '';

    onResolveTenant?.({ host: hostname || describeIncomingHost(req), tenant: resolved?.tenant ?? null });

    if (!resolved) {
      const tenantList = Object.entries(registry.tenants).map(([key, t]) => {
        const pattern = firstLocalDomainExample(t, environment);
        const hostExample = pattern ? `${pattern}:${port}` : `${key.replace(/-/g, '.')}.localhost:${port}`;
        return { key, hostExample };
      });
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(errorPage(`No tenant for host: ${describeIncomingHost(req)}`, tenantList));
      return;
    }

    const { tenant } = resolved;
    const proxyOptions: {
      target: string;
      xfwd: boolean;
      headers?: Record<string, string>;
    } = { target, xfwd: true };
    if (headerNames) {
      proxyOptions.headers = {
        [headerNames.tenantKey]: tenant.tenantKey,
        [headerNames.marketKey]: tenant.marketKey,
        [headerNames.environment]: tenant.environment,
      };
      if (Object.keys(tenant.flags).length > 0) {
        proxyOptions.headers[headerNames.flags] = JSON.stringify(tenant.flags);
      }
    }

    proxy.web(req, res, proxyOptions, (err?: Error) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Proxy error: ${err?.message ?? 'unknown'}`);
    });
  });

  server.on('upgrade', (req: IncomingMessage, socket: any, head: Buffer) => {
    const resolved = handleRequest(req);
    if (!resolved) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    proxy.ws(req, socket, head, { target, xfwd: true });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      resolve({
        port,
        async close() {
          return new Promise<void>((done, fail) => {
            server.close((err?: Error) => (err ? fail(err) : done()));
          });
        },
      });
    });
    server.on('error', reject);
  });
}
