import { PrismaClient, type Prisma } from '@prisma/client';
import type { ResolvedTenant, TenantDefinition } from '@multitenant/core';
import {
  BoundedTenantDbResourceCache,
  getOrCreateTenantDatabaseResource,
  type ResolveTenantDatabaseUrlOptions,
} from '@multitenant/database';

export type GetOrCreateTenantPrismaClientOptions = ResolveTenantDatabaseUrlOptions & {
  /** Passed to `PrismaClient` after `datasourceUrl` (e.g. `log`). */
  prismaOptions?: Omit<Prisma.PrismaClientOptions, 'datasourceUrl'>;
};

/**
 * **Per-tenant database URL:** bounded-cached {@link PrismaClient} per `(tenantKey, DSN)`.
 * Use **`onEvict: (c) => { void c.$disconnect() }`** on the cache.
 */
export function getOrCreateTenantPrismaClient(
  cache: BoundedTenantDbResourceCache<PrismaClient>,
  resolved: ResolvedTenant,
  tenants: Record<string, TenantDefinition>,
  options?: GetOrCreateTenantPrismaClientOptions,
): PrismaClient {
  const { prismaOptions, ...urlOptions } = options ?? {};
  return getOrCreateTenantDatabaseResource(
    cache,
    resolved,
    tenants,
    (databaseUrl) =>
      new PrismaClient({
        ...prismaOptions,
        datasourceUrl: databaseUrl,
      }),
    urlOptions,
  );
}

/**
 * **Shared database:** one URL for all tenants. Pair with `assignTenantIdForWrite` / RLS from `@multitenant/database`.
 */
export function createSharedPrismaClient(
  databaseUrl: string,
  prismaOptions?: Omit<Prisma.PrismaClientOptions, 'datasourceUrl'>,
): PrismaClient {
  return new PrismaClient({
    ...prismaOptions,
    datasourceUrl: databaseUrl,
  });
}
