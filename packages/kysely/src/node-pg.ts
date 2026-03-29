import { Kysely, PostgresDialect } from 'kysely';
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
export function createNodePgKysely<T>(pool: Pool): Kysely<T> {
  return new Kysely<T>({
    dialect: new PostgresDialect({ pool }),
  });
}

/**
 * **Per-tenant URL** + Kysely: resolve URL, `getOrCreate` pool, then `new Kysely({ PostgresDialect })`.
 * Each call returns a **new** `Kysely` over a **cached** pool (cheap; pooling is on `Pool`).
 */
export function getTenantNodePgKysely<T>(
  cache: BoundedTenantDbResourceCache<Pool>,
  resolved: ResolvedTenant,
  tenants: Record<string, TenantDefinition>,
  options?: GetOrCreateTenantNodePgPoolOptions,
): Kysely<T> {
  const pool = getOrCreateTenantNodePgPool(cache, resolved, tenants, options);
  return createNodePgKysely<T>(pool);
}
