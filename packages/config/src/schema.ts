import { z } from 'zod';
import type {
  EnvironmentName,
  MarketDefinition,
  TenantDefinition,
  TenantsConfig,
} from '@multitenant/core';

const configByEnvironmentSchema = z
  .object({
    local: z.record(z.unknown()).optional(),
    development: z.record(z.unknown()).optional(),
    staging: z.record(z.unknown()).optional(),
    production: z.record(z.unknown()).optional(),
  })
  .strict();

export const environmentNameSchema: z.ZodType<EnvironmentName> = z.union([
  z.literal('local'),
  z.literal('development'),
  z.literal('staging'),
  z.literal('production'),
]);

export const themeConfigRefSchema = z.object({
  preset: z.string().optional(),
  tokens: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const marketSeoConfigSchema = z.object({
  defaultTitleTemplate: z.string().optional(),
  defaultMetaDescription: z.string().optional(),
  canonicalBaseUrl: z.string().url().optional(),
});

export const tenantAccessConfigSchema = z.object({
  defaultRoles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

/** Env-only DSN ref — must look like `FOO` or `MY_DSN_1`, never a URL. */
export const tenantDatabaseConfigSchema = z.object({
  envVar: z
    .string()
    .min(1)
    .regex(
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      'database.envVar must be a valid environment variable name (letters, digits, underscore; no URL)',
    ),
});

export const marketDefinitionSchema: z.ZodType<MarketDefinition> = z
  .object({
    label: z.string().optional(),
    config: z.record(z.unknown()).optional(),
    currency: z.string(),
    locale: z.string(),
    locales: z.array(z.string().min(1)).optional(),
    timezone: z.string(),
    primaryDomain: z.string().optional(),
    fallbackTenant: z.string().optional(),
    seo: marketSeoConfigSchema.optional(),
    theme: themeConfigRefSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.locales && data.locales.length > 0) {
      const uniq = new Set(data.locales);
      if (uniq.size !== data.locales.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '[multitenant] market.locales must not contain duplicate entries',
        });
      }
      if (!data.locales.includes(data.locale)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            '[multitenant] market.locale must be included in market.locales when locales is set',
        });
      }
    }
  });

const domainTargetSchema = z.union([
  z.string(),
  z.object({
    tenant: z.string(),
    basePath: z.string().optional(),
  }),
]);

export const domainMapV2Schema = z.record(domainTargetSchema);

const tenantDomainsSchema = z.object({
  local: domainMapV2Schema.optional(),
  development: domainMapV2Schema.optional(),
  staging: domainMapV2Schema.optional(),
  production: domainMapV2Schema.optional(),
});

export const tenantDefinitionSchema: z.ZodType<TenantDefinition> = z.object({
  label: z.string().optional(),
  market: z.string(),
  domains: tenantDomainsSchema,
  paths: z
    .object({
      basePath: z.string().optional(),
    })
    .optional(),
  theme: themeConfigRefSchema.optional(),
  flags: z.record(z.boolean()).optional(),
  experiments: z
    .record(
      z.object({
        forcedVariant: z.string().optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .optional(),
  seo: marketSeoConfigSchema
    .extend({
      overrides: z.record(z.string()).optional(),
    })
    .optional(),
  config: z.record(z.unknown()).optional(),
  access: tenantAccessConfigSchema.optional(),
  database: tenantDatabaseConfigSchema.optional(),
  configByEnvironment: configByEnvironmentSchema.optional(),
});

export const experimentDefinitionSchema = z.object({
  description: z.string().optional(),
  defaultVariant: z.string(),
  variants: z.array(z.string()).min(1),
});

export const tenantsDefaultsSchema = z.object({
  environment: environmentNameSchema.optional(),
  localDomainTemplate: z.string().optional(),
});

export const tenantsConfigSchema: z.ZodType<TenantsConfig> = z.object({
  version: z.literal(1),
  defaultEnvironment: environmentNameSchema.optional(),
  markets: z.record(marketDefinitionSchema),
  tenants: z.record(tenantDefinitionSchema),
  experiments: z.record(experimentDefinitionSchema).optional(),
  defaults: tenantsDefaultsSchema.optional(),
});

