/**
 * **Node.js only** — uses `fs.readFileSync` + `validateTenantsConfig`.
 * Default Next.js middleware runs on the **Edge** runtime; this helper is for
 * custom setups that execute middleware in Node (or for route handlers / scripts).
 * For Edge middleware, use `createTenantMiddlewareFromConfig` with a static JSON import.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateTenantsConfig } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';
import type { CreateTenantMiddlewareOptions } from './index';
import { createTenantMiddleware } from './index';

export type NodeAutoMiddlewareOptions = CreateTenantMiddlewareOptions & {
  cwd?: string;
  /** @default tenants.config.json */
  filename?: string;
};

export function createNodeTenantMiddlewareFromProjectRoot(
  options?: NodeAutoMiddlewareOptions,
): ReturnType<typeof createTenantMiddleware> {
  const cwd = options?.cwd ?? process.cwd();
  const filename = options?.filename ?? 'tenants.config.json';
  const raw = JSON.parse(readFileSync(join(cwd, filename), 'utf8')) as unknown;
  const config = validateTenantsConfig(raw);
  const registry = createTenantRegistry(config);
  const { cwd: _cwd, filename: _fn, ...mwOpts } = options ?? {};
  return createTenantMiddleware(registry, mwOpts);
}
