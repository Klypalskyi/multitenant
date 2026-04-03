import { createClient } from 'contentful';
import type { ContentfulClientApi } from 'contentful';
import { TenantNotFoundError } from '@multitenant/core';
import type { TenantRegistry } from '@multitenant/core';
import { createCachedContentfulClient } from './client';
import type { ContentfulSdkConfig, TenantContentfulCacheOptions } from './types';

/**
 * Creates a fully configured, locale-aware, cached Contentful client for a specific tenant.
 *
 * This is a convenience factory that:
 * 1. Looks up the tenant in the registry to resolve its market locale
 * 2. Creates a raw Contentful SDK client using the provided sdkConfig
 * 3. Wraps it with createCachedContentfulClient using the resolved locale
 *
 * Throws `TenantNotFoundError` if:
 * - `tenantKey` does not exist in `registry.tenants`
 * - The tenant's market does not exist in `registry.markets`
 *
 * The returned client uses the market's primary locale (`market.locale`) as the default.
 * If a market supports multiple locales, individual SDK calls can override via the
 * `locale` query parameter (passed to the underlying SDK method).
 *
 * @param registry - A TenantRegistry from @multitenant/core
 * @param tenantKey - The tenant identifier (e.g., 'us-main', 'eu-primary')
 * @param sdkConfig - Contentful SDK configuration (spaceId, accessToken, environment, preview)
 * @param options - Optional cache configuration (cacheDir, isBuildPhase, debug, log)
 * @returns A cached Contentful SDK client (ContentfulClientApi interface)
 * @throws TenantNotFoundError if tenant or market not found
 *
 * @example
 * ```ts
 * import { createTenantRegistry } from '@multitenant/core';
 * import { createTenantContentfulClient } from '@multitenant/contentful';
 *
 * const registry = createTenantRegistry();
 * const client = createTenantContentfulClient(
 *   registry,
 *   'us-main',
 *   {
 *     spaceId: process.env.CONTENTFUL_SPACE_ID!,
 *     accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
 *   },
 *   { debug: true },
 * );
 *
 * // Locale is auto-resolved to 'en-US' (or whatever the us-main market's locale is)
 * const entries = await client.getEntries({ content_type: 'page' });
 * ```
 */
export function createTenantContentfulClient(
  registry: TenantRegistry,
  tenantKey: string,
  sdkConfig: ContentfulSdkConfig,
  options?: TenantContentfulCacheOptions,
): ContentfulClientApi<undefined> {
  const tenant = registry.tenants[tenantKey];
  if (!tenant) {
    throw new TenantNotFoundError(
      `[multitenant/contentful] Tenant "${tenantKey}" not found in registry`,
    );
  }

  const market = registry.markets[tenant.marketKey];
  if (!market) {
    throw new TenantNotFoundError(
      `[multitenant/contentful] Market "${tenant.marketKey}" for tenant "${tenantKey}" not found in registry`,
    );
  }

  const locale = market.locale;

  const rawClient = createClient({
    space: sdkConfig.spaceId,
    accessToken: sdkConfig.accessToken,
    environment: sdkConfig.environment ?? 'master',
    host: sdkConfig.preview ? 'preview.contentful.com' : 'cdn.contentful.com',
  });

  return createCachedContentfulClient(rawClient, {
    spaceId: sdkConfig.spaceId,
    locale,
    cacheDir: options?.cacheDir,
    isBuildPhase: options?.isBuildPhase,
    debug: options?.debug,
    log: options?.log,
  });
}
