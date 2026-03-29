import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  DEFAULT_CONFIG_FILENAME,
  validateTenantsConfig,
} from '@multitenant/config';
import type { TenantsConfig } from '@multitenant/core';

export type InitFramework = 'none' | 'next-app' | 'next-pages' | 'express';

export interface InitOptions {
  cwd: string;
  tenantKey: string;
  marketKey: string;
  /** Host pattern for domains.local, e.g. `main.localhost` */
  localHostPattern: string;
  framework: InitFramework;
  force: boolean;
}

function buildMinimalConfig(opts: InitOptions): TenantsConfig {
  const { tenantKey, marketKey, localHostPattern } = opts;
  return {
    version: 1,
    defaultEnvironment: 'local',
    markets: {
      [marketKey]: {
        currency: 'USD',
        locale: 'en-US',
        timezone: 'America/New_York',
      },
    },
    tenants: {
      [tenantKey]: {
        market: marketKey,
        domains: {
          local: {
            [localHostPattern]: tenantKey,
          },
        },
      },
    },
  };
}

async function confirmOverwrite(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return false;
  }
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    const t = answer.trim().toLowerCase();
    return t === 'y' || t === 'yes';
  } finally {
    rl.close();
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const NEXT_MIDDLEWARE = `import type { EnvironmentName, TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { createTenantMiddleware } from '@multitenant/next-app';

import tenantsConfig from './tenants.config.json';

const registry = createTenantRegistry(tenantsConfig as TenantsConfig);
const env = (process.env.MULTITENANT_ENV ?? 'local') as EnvironmentName;

export const middleware = createTenantMiddleware(registry, {
  environment: env,
});
`;

const PAGES_REGISTRY = `import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';

import tenantsConfig from '../tenants.config.json';

/** Use with withTenantGSSP / withTenantApi from @multitenant/next-pages */
export const tenantRegistry = createTenantRegistry(tenantsConfig as TenantsConfig);
`;

const EXPRESS_STUB = `/**
 * Example: wire @multitenant/express. Rename to server.ts and add to your app.
 * Install: npm i @multitenant/core @multitenant/express express
 */
import express from 'express';
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { multitenantExpress } from '@multitenant/express';

import tenantsConfig from './tenants.config.json';

const app = express();
const registry = createTenantRegistry(tenantsConfig as TenantsConfig);

app.use(multitenantExpress({ registry, environment: 'local' }));

app.get('/', (req, res) => {
  res.json({ tenant: req.tenant?.tenantKey ?? null });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(\`Listening on http://localhost:\${port}\`);
});
`;

export async function runInit(opts: InitOptions): Promise<void> {
  const configPath = path.join(opts.cwd, DEFAULT_CONFIG_FILENAME);

  if (await pathExists(configPath)) {
    if (!opts.force) {
      const ok = await confirmOverwrite(
        `${DEFAULT_CONFIG_FILENAME} already exists. Overwrite?`,
      );
      if (!ok) {
        console.error('Aborted.');
        process.exit(1);
      }
    }
  }

  const raw = buildMinimalConfig(opts);
  validateTenantsConfig(raw);
  await fs.writeFile(configPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${configPath}`);

  switch (opts.framework) {
    case 'none':
      console.log('Run: npx multitenant check');
      return;
    case 'next-app': {
      const mw = path.join(opts.cwd, 'middleware.ts');
      if ((await pathExists(mw)) && !opts.force) {
        const ok = await confirmOverwrite('middleware.ts already exists. Overwrite?');
        if (!ok) {
          console.log('Skipped middleware.ts.');
          break;
        }
      }
      await fs.writeFile(mw, NEXT_MIDDLEWARE, 'utf8');
      console.log(`Wrote ${mw}`);
      break;
    }
    case 'next-pages': {
      const libDir = path.join(opts.cwd, 'lib');
      await fs.mkdir(libDir, { recursive: true });
      const regPath = path.join(libDir, 'tenant-registry.ts');
      if ((await pathExists(regPath)) && !opts.force) {
        const ok = await confirmOverwrite('lib/tenant-registry.ts already exists. Overwrite?');
        if (!ok) {
          console.log('Skipped lib/tenant-registry.ts.');
          break;
        }
      }
      await fs.writeFile(regPath, PAGES_REGISTRY, 'utf8');
      console.log(`Wrote ${regPath}`);
      break;
    }
    case 'express': {
      const ex = path.join(opts.cwd, 'multitenant.server.example.ts');
      if ((await pathExists(ex)) && !opts.force) {
        const ok = await confirmOverwrite(
          'multitenant.server.example.ts already exists. Overwrite?',
        );
        if (!ok) {
          console.log('Skipped multitenant.server.example.ts.');
          break;
        }
      }
      await fs.writeFile(ex, EXPRESS_STUB, 'utf8');
      console.log(`Wrote ${ex}`);
      break;
    }
    default:
      break;
  }

  console.log('Run: npx multitenant check');
}
