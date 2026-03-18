import * as http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import HttpProxy from 'http-proxy';
import type { TenantRegistry, ResolvedTenant, EnvironmentName } from '@multitenant/core';

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

function errorPage(message: string, tenants?: Array<{ key: string; hostExample: string }>): string {
  const list = tenants
    ? tenants.map((t) => `<li><a href="http://${t.hostExample}">${t.key}</a></li>`).join('')
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tenantify</title></head><body><h1>${message}</h1>${list ? `<ul>${list}</ul>` : ''}</body></html>`;
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

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host ?? '';
    const hostname = typeof hostHeader === 'string' ? hostHeader.split(':')[0] : hostHeader[0]?.split(':')[0] ?? '';

    const tenant = registry.resolveByHost(hostname, { environment });
    onResolveTenant?.({ host: hostname, tenant: tenant ?? null });

    if (!tenant) {
      const tenantList = Object.keys(registry.tenants).map((key) => ({
        key,
        hostExample: `${key.replace(/-/g, '.')}.localhost:${port}`,
      }));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(errorPage(`No tenant for host: ${hostname}`, tenantList));
      return;
    }

    const proxyOptions: { target: string; headers?: Record<string, string> } = { target };
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
    proxy.ws(req, socket, head, { target });
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
