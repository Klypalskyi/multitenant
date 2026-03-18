import { extractHostname } from './utils';
import type {
  DomainMapV2,
  EnvironmentName,
  TenantsConfig,
  TenantDefinition,
  MarketDefinition,
  ThemeConfigRef,
} from './config-types';

export interface NormalizedMarket extends MarketDefinition {
  key: string;
}

export interface NormalizedTenant extends TenantDefinition {
  key: string;
  marketKey: string;
}

export interface ResolvedTenant {
  tenantKey: string;
  marketKey: string;
  host: string;
  environment: EnvironmentName;
  basePath?: string;
  theme: ThemeConfigRef | null;
  flags: Record<string, boolean>;
  experiments: Record<string, string>;
}

export interface TenantRegistry {
  tenants: Record<string, NormalizedTenant>;
  markets: Record<string, NormalizedMarket>;

  resolveByHost(
    hostname: string,
    options?: { environment?: EnvironmentName },
  ): ResolvedTenant | null;

  resolveByRequest(
    req: {
      host?: string | null;
      headers: Record<string, string | string[]>;
      url?: string;
    },
    options?: { environment?: EnvironmentName },
  ): ResolvedTenant | null;
}

const ENVIRONMENTS: EnvironmentName[] = [
  'local',
  'development',
  'staging',
  'production',
];

const WILDCARD = '*.';

const normalizeMarkets = (
  markets: Record<string, MarketDefinition>,
): Record<string, NormalizedMarket> => {
  const result: Record<string, NormalizedMarket> = {};
  for (const [key, value] of Object.entries(markets)) {
    result[key] = { ...value, key };
  }
  return result;
};

const normalizeTenants = (
  tenants: Record<string, TenantDefinition>,
): Record<string, NormalizedTenant> => {
  const result: Record<string, NormalizedTenant> = {};
  for (const [key, value] of Object.entries(tenants)) {
    result[key] = { ...value, key, marketKey: value.market };
  }
  return result;
};

const resolveDomainV2 = (
  hostname: string,
  env: EnvironmentName,
  tenants: Record<string, NormalizedTenant>,
): { tenantKey: string; basePath?: string } | null => {
  // exact first, then wildcard, deterministic
  const exactMatches: Array<{ tenantKey: string; target: string | { tenant: string; basePath?: string } }> =
    [];
  const wildcardMatches: Array<{
    tenantKey: string;
    pattern: string;
    target: string | { tenant: string; basePath?: string };
  }> = [];

  for (const [tenantKey, tenant] of Object.entries(tenants)) {
    const envDomains = tenant.domains?.[env];
    if (!envDomains) continue;

    for (const [pattern, target] of Object.entries(envDomains as DomainMapV2)) {
      if (!pattern.includes('*')) {
        if (pattern === hostname) {
          exactMatches.push({ tenantKey, target });
        }
      } else if (pattern.startsWith(WILDCARD)) {
        const base = pattern.slice(WILDCARD.length);
        if (hostname.endsWith(base)) {
          wildcardMatches.push({ tenantKey, pattern, target });
        }
      }
    }
  }

  if (exactMatches.length > 1 || wildcardMatches.length > 1) {
    // config loader should have prevented this; be safe and error
    throw new Error(
      `[multitenant] Ambiguous domain resolution for host "${hostname}" in environment "${env}"`,
    );
  }

  const match =
    exactMatches[0] ??
    (wildcardMatches.length > 0 ? wildcardMatches[0] : undefined);

  if (!match) return null;

  const { tenantKey, target } = match;
  if (typeof target === 'string') {
    return { tenantKey: target };
  }
  return {
    tenantKey: target.tenant,
    basePath: target.basePath,
  };
};

const getEnvironment = (
  explicit: EnvironmentName | undefined,
  config: TenantsConfig,
): EnvironmentName => {
  if (explicit) return explicit;
  if (config.defaultEnvironment) return config.defaultEnvironment;
  return 'local';
};

export const createTenantRegistry = (config: TenantsConfig): TenantRegistry => {
  const markets = normalizeMarkets(config.markets);
  const tenants = normalizeTenants(config.tenants);

  const resolve = (
    hostname: string,
    envOverride?: EnvironmentName,
  ): ResolvedTenant | null => {
    const environment = getEnvironment(envOverride, config);
    if (!ENVIRONMENTS.includes(environment)) {
      throw new Error(
        `[multitenant] Unknown environment "${environment}" for host "${hostname}"`,
      );
    }

    const match = resolveDomainV2(hostname, environment, tenants);
    if (!match) return null;

    const tenant = tenants[match.tenantKey];
    if (!tenant) {
      throw new Error(
        `[multitenant] Domain for host "${hostname}" resolved to unknown tenant "${match.tenantKey}"`,
      );
    }

    const market = markets[tenant.marketKey];
    if (!market) {
      throw new Error(
        `[multitenant] Tenant "${tenant.key}" references unknown market "${tenant.marketKey}"`,
      );
    }

    const theme = tenant.theme ?? market.theme ?? null;
    const flags = tenant.flags ?? {};

    const experiments: Record<string, string> = {};
    if (config.experiments) {
      for (const [key, exp] of Object.entries(config.experiments)) {
        const override = tenant.experiments?.[key];
        if (override?.forcedVariant) {
          experiments[key] = override.forcedVariant;
        } else {
          experiments[key] = exp.defaultVariant;
        }
      }
    }

    return {
      tenantKey: tenant.key,
      marketKey: tenant.marketKey,
      host: hostname,
      environment,
      basePath: match.basePath ?? tenant.paths?.basePath,
      theme,
      flags,
      experiments,
    };
  };

  return {
    tenants,
    markets,
    resolveByHost(hostname, options) {
      const normalized = extractHostname(hostname);
      if (!normalized) return null;
      return resolve(normalized, options?.environment);
    },
    resolveByRequest(req, options) {
      const hostHeader =
        req.headers['x-forwarded-host'] ??
        req.headers['x-forwarded-host'.toUpperCase()] ??
        req.host ??
        req.headers.host;

      const host =
        typeof hostHeader === 'string'
          ? hostHeader
          : Array.isArray(hostHeader)
          ? hostHeader[0]
          : undefined;

      const normalized = extractHostname(host);
      if (!normalized) return null;
      return resolve(normalized, options?.environment);
    },
  };
};
