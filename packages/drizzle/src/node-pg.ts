import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import {
  BoundedTenantDbResourceCache,
  getOrCreateTenantDatabaseResource,
  type ResolveTenantDatabaseUrlOptions,
} from '@multitenant/database';

export type GetOrCreateTenantNodePgPoolOptions = ResolveTenantDatabaseUrlOptions & {
  /** Extra `pg.Pool` options (`connectionString` comes from env via Phase 8.5 resolution). */
  poolOptions?: Omit<PoolConfig, 'connectionString'>;
};

/**
 * **Per-tenant database URL** topology: reuse a bounded-cached {@link Pool} for
 * `(tenantKey, DSN)` — see {@link BoundedTenantDbResourceCache}.
 */
export function getOrCreateTenantNodePgPool(
  cache: BoundedTenantDbResourceCache<Pool>,
  resolved: ResolvedTenant,
  tenants: Record<string, TenantDefinition>,
  options?: GetOrCreateTenantNodePgPoolOptions,
): Pool {
  const { poolOptions, ...urlOptions } = options ?? {};
  return getOrCreateTenantDatabaseResource(
    cache,
    resolved,
    tenants,
    (databaseUrl) => new Pool({ connectionString: databaseUrl, ...poolOptions }),
    urlOptions,
  );
}

/**
 * **Shared database** topology: one `Pool` for the app. Pair with
 * `assignTenantIdForWrite` / RLS helpers from `@multitenant/database`.
 */
export function createNodePgDrizzle(
  pool: Pool,
): NodePgDatabase<Record<string, never>>;
export function createNodePgDrizzle<TSchema extends Record<string, unknown>>(
  pool: Pool,
  schema: TSchema,
): NodePgDatabase<TSchema>;
export function createNodePgDrizzle(
  pool: Pool,
  schema?: Record<string, unknown>,
): NodePgDatabase<Record<string, never>> | NodePgDatabase<Record<string, unknown>> {
  if (schema === undefined) {
    return drizzle(pool) as NodePgDatabase<Record<string, never>>;
  }
  return drizzle(pool, { schema }) as NodePgDatabase<Record<string, unknown>>;
}

/**
 * **Per-tenant URL** + Drizzle: resolve URL, `getOrCreate` pool, then `drizzle(pool, { schema })`.
 * Creating a new Drizzle per request is cheap; pooling happens on `Pool`.
 */
export function getTenantNodePgDrizzle<TSchema extends Record<string, unknown>>(
  cache: BoundedTenantDbResourceCache<Pool>,
  resolved: ResolvedTenant,
  tenants: Record<string, TenantDefinition>,
  schema: TSchema,
  options?: GetOrCreateTenantNodePgPoolOptions,
): NodePgDatabase<TSchema> {
  const pool = getOrCreateTenantNodePgPool(cache, resolved, tenants, options);
  return drizzle(pool, { schema });
}
