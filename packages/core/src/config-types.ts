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
  access?: TenantAccessConfig;
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

