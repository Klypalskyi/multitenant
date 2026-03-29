import { DataSource, type DataSourceOptions } from 'typeorm';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import {
  BoundedTenantDbResourceCache,
  getOrCreateTenantDatabaseResource,
  type ResolveTenantDatabaseUrlOptions,
} from '@multitenant/database';

/** Options merged after `{ type: 'postgres', url }`. Do not set `type` or `url` here. */
export type PostgresDataSourceExtras = Partial<
  Omit<Extract<DataSourceOptions, { type: 'postgres' }>, 'type' | 'url'>
>;

export type GetOrCreateTenantPostgresDataSourceOptions = ResolveTenantDatabaseUrlOptions & {
  dataSourceOptions?: PostgresDataSourceExtras;
};

/**
 * **Per-tenant database URL:** bounded-cached {@link DataSource} per `(tenantKey, DSN)`.
 * Call **`await dataSource.initialize()`** before use. On cache eviction use
 * **`onEvict: (ds) => { void ds.destroy().catch(() => undefined) }`**.
 */
export function getOrCreateTenantPostgresDataSource(
  cache: BoundedTenantDbResourceCache<DataSource>,
  resolved: ResolvedTenant,
  tenants: Record<string, TenantDefinition>,
  options?: GetOrCreateTenantPostgresDataSourceOptions,
): DataSource {
  const { dataSourceOptions, ...urlOptions } = options ?? {};
  return getOrCreateTenantDatabaseResource(
    cache,
    resolved,
    tenants,
    (databaseUrl) =>
      new DataSource({
        type: 'postgres',
        url: databaseUrl,
        ...dataSourceOptions,
      } as DataSourceOptions),
    urlOptions,
  );
}

/**
 * **Shared database:** one URL for all tenants. Pair with `assignTenantIdForWrite` / RLS from `@multitenant/database`.
 * You must **`await dataSource.initialize()`** before queries.
 */
export function createSharedPostgresDataSource(
  databaseUrl: string,
  dataSourceOptions?: PostgresDataSourceExtras,
): DataSource {
  return new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ...dataSourceOptions,
  } as DataSourceOptions);
}
