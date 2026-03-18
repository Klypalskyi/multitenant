import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ZodIssue } from 'zod';
import { tenantsConfigSchema } from './schema';
import type { TenantsConfig, EnvironmentName } from '@multitenant/core';

export interface LoadTenantsConfigOptions {
  cwd?: string;
}

export const DEFAULT_CONFIG_FILENAME = 'tenants.config.json';

export async function resolveConfigPath(
  cwd: string = process.cwd(),
): Promise<string | null> {
  const candidate = path.join(cwd, DEFAULT_CONFIG_FILENAME);
  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    return null;
  }
}

export function validateTenantsConfig(raw: unknown): TenantsConfig {
  const result = tenantsConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i: ZodIssue) => `- ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid tenants.config.json:\n${issues}`);
  }

  const config = result.data as TenantsConfig;

  // cross-field validation: hard errors

  // 1. tenant.market must exist
  for (const [tenantKey, tenant] of Object.entries(config.tenants)) {
    if (!config.markets[tenant.market]) {
      throw new Error(
        `Tenant "${tenantKey}" references unknown market "${tenant.market}"`,
      );
    }
  }

  // 2. overlapping domain patterns per env
  const envs: EnvironmentName[] = [
    'local',
    'development',
    'staging',
    'production',
  ];

  for (const env of envs) {
    const seen: Record<string, string[]> = {};
    for (const [tenantKey, tenant] of Object.entries(config.tenants)) {
      const envDomains = tenant.domains?.[env];
      if (!envDomains) continue;
      for (const pattern of Object.keys(envDomains)) {
        if (!seen[pattern]) seen[pattern] = [];
        seen[pattern].push(tenantKey);
      }
    }
    const conflicts = Object.entries(seen).filter(
      ([, tenants]) => tenants.length > 1,
    );
    if (conflicts.length) {
      const msg = conflicts
        .map(
          ([pattern, tenants]) =>
            `"${pattern}" used by tenants: ${tenants.join(', ')}`,
        )
        .join('\n');
      throw new Error(
        `Overlapping domain patterns in environment "${env}":\n${msg}`,
      );
    }
  }

  // 3. experiments overrides reference existing experiments
  if (config.experiments) {
    for (const [tenantKey, tenant] of Object.entries(config.tenants)) {
      if (!tenant.experiments) continue;
      for (const key of Object.keys(tenant.experiments)) {
        if (!config.experiments[key]) {
          throw new Error(
            `Tenant "${tenantKey}" overrides unknown experiment "${key}"`,
          );
        }
      }
    }
  }

  return config;
}

export async function loadTenantsConfig(
  options: LoadTenantsConfigOptions = {},
): Promise<TenantsConfig> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = await resolveConfigPath(cwd);

  if (!configPath) {
    throw new Error(`tenants.config.json not found in ${cwd}`);
  }

  const raw = await fs.readFile(configPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse tenants.config.json: ${(err as Error).message}`,
    );
  }

  return validateTenantsConfig(parsed);
}

