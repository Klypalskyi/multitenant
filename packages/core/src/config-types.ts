export type EnvironmentName = 'local' | 'development' | 'staging' | 'production';

export interface MarketSeoConfig {
  defaultTitleTemplate?: string;
  defaultMetaDescription?: string;
  canonicalBaseUrl?: string;
}

export interface ThemeConfigRef {
  preset?: string;
  tokens?: Record<string, string | number | boolean>;
}

export interface TenantAccessConfig {
  defaultRoles?: string[];
  permissions?: string[];
}

export interface MarketDefinition {
  label?: string;
  /**
   * Optional defaults merged into every tenant in this market (Phase 3.3).
   * Order: **market → tenant `config` → tenant `configByEnvironment[env]`**.
   */
  config?: Record<string, unknown>;
  currency: string;
  /**
   * Default locale (BCP 47), e.g. `en-US`. Must appear in `locales` when `locales` is set.
   */
  locale: string;
  /**
   * All locales supported for this market. When omitted, only `locale` is used.
   * When set, must include `locale` and must not contain duplicates.
   */
  locales?: string[];
  timezone: string;
  primaryDomain?: string;
  fallbackTenant?: string;
  seo?: MarketSeoConfig;
  theme?: ThemeConfigRef;
}

export type DomainTarget =
  | string
  | {
      tenant: string;
      basePath?: string;
    };

export type DomainMapV2 = Record<string, DomainTarget>;

/**
 * Per-tenant database DSN **indirection** (Phase 8.5): URL is read from an environment variable at runtime.
 * Do **not** put raw connection strings in `tenants.config.json`.
 */
export interface TenantDatabaseConfig {
  /** `process.env[envVar]` must hold the full connection URL when using `resolveTenantDatabaseUrl`. */
  envVar: string;
}

export interface TenantDefinition {
  label?: string;
  market: string;
  domains: Partial<Record<EnvironmentName, DomainMapV2>>;
  paths?: {
    basePath?: string;
  };
  theme?: ThemeConfigRef;
  flags?: Record<string, boolean>;
  experiments?: Record<
    string,
    {
      forcedVariant?: string;
      enabled?: boolean;
    }
  >;
  seo?: MarketSeoConfig & {
    overrides?: Record<string, string>;
  };
  config?: Record<string, unknown>;
  /**
   * Per-deployment-environment overlays on top of **`config`** (same merge order as `config`).
   */
  configByEnvironment?: Partial<Record<EnvironmentName, Record<string, unknown>>>;
  access?: TenantAccessConfig;
  /** Optional per-tenant database URL via env (see Phase 8.5). */
  database?: TenantDatabaseConfig;
}

export interface ExperimentDefinition {
  description?: string;
  defaultVariant: string;
  variants: string[];
}

export interface TenantsDefaults {
  environment?: EnvironmentName;
  localDomainTemplate?: string;
}

export interface TenantsConfig {
  version: 1;
  defaultEnvironment?: EnvironmentName;
  markets: Record<string, MarketDefinition>;
  tenants: Record<string, TenantDefinition>;
  experiments?: Record<string, ExperimentDefinition>;
  defaults?: TenantsDefaults;
}

