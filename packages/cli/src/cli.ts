#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs/promises';
import { loadTenantsConfig, resolveConfigPath } from '@multitenant/config';
import { createTenantRegistry } from '@multitenant/core';
import { startDevProxy } from '@multitenant/dev-proxy';
import chokidar from 'chokidar';

const program = new Command();

program
  .name('multitenant')
  .description('Multi-tenant dev proxy and config tools')
  .version('0.4.0');

program
  .command('check')
  .description('Validate tenants.config.json')
  .option('-c, --config <path>', 'Path to tenants.config.json')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .action(async (opts: { config?: string; cwd: string }) => {
    const cwd = opts.cwd;
    const configPath = opts.config ?? (await resolveConfigPath(cwd));
    if (!configPath) {
      console.error('Error: tenants.config.json not found in', cwd);
      process.exit(1);
    }
    try {
      await loadTenantsConfig({ cwd });
      console.log('OK:', configPath);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(1);
    }
  });

program
  .command('print')
  .description('Print resolved tenant registry (for debugging)')
  .option('-c, --config <path>', 'Path to tenants.config.json')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .action(async (opts: { config?: string; cwd: string }) => {
    const cwd = opts.cwd;
    try {
      const config = await loadTenantsConfig({ cwd });
      const registry = createTenantRegistry(config);
      console.log(JSON.stringify({ tenants: Object.keys(registry.tenants), markets: Object.keys(registry.markets) }, null, 2));
    } catch (e) {
      console.error((e as Error).message);
      process.exit(1);
    }
  });

program
  .command('dev')
  .description('Start dev proxy with per-tenant subdomains')
  .option('-c, --config <path>', 'Path to tenants.config.json')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .option('-p, --port <number>', 'Proxy listen port', '3100')
  .option('-t, --target <url>', 'Upstream dev server URL', 'http://localhost:3000')
  .option('--run-dev', 'Spawn npm/pnpm/yarn run dev before proxying')
  .option('--env <name>', 'Environment (local|development|staging|production)', 'local')
  .action(async (opts: {
    config?: string;
    cwd: string;
    port: string;
    target: string;
    runDev?: boolean;
    env: string;
  }) => {
    const cwd = opts.cwd;
    const port = parseInt(opts.port, 10);
    const targetUrl = new URL(opts.target);
    const env = opts.env as 'local' | 'development' | 'staging' | 'production';

    let child: import('node:child_process').ChildProcess | null = null;
    if (opts.runDev) {
      const pkgPath = path.join(cwd, 'package.json');
      try {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        if (!pkg.scripts?.dev) {
          console.error('Error: package.json has no "dev" script');
          process.exit(1);
        }
        const hasPnpm = await fs.access(path.join(cwd, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
        const hasYarn = await fs.access(path.join(cwd, 'yarn.lock')).then(() => true).catch(() => false);
        const runner = hasPnpm ? 'pnpm' : hasYarn ? 'yarn' : 'npm';
        const { spawn } = await import('node:child_process');
        child = spawn(runner, ['run', 'dev'], { cwd, stdio: 'inherit', shell: true });
        child.on('error', (e: Error) => {
          console.error('Dev server error:', e);
          process.exit(1);
        });
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error('Failed to start dev server:', (e as Error).message);
        process.exit(1);
      }
    }

    await loadTenantsConfig({ cwd }).catch((e) => {
      console.error((e as Error).message);
      process.exit(1);
    });

    const watcher = chokidar.watch(path.join(cwd, 'tenants.config.json'), { ignoreInitial: true });
    let instance: Awaited<ReturnType<typeof startDevProxy>> | null = null;

    const start = async () => {
      if (instance) await instance.close();
      const cfg = await loadTenantsConfig({ cwd });
      const reg = createTenantRegistry(cfg);
      instance = await startDevProxy({
        registry: reg,
        environment: env,
        port,
        targetHost: targetUrl.hostname,
        targetPort: parseInt(targetUrl.port || '3000', 10),
      });
      console.log(`Multitenant dev proxy: http://0.0.0.0:${port} -> ${opts.target}`);
      console.log('Tenants:', Object.keys(reg.tenants).join(', '));
    };

    watcher.on('change', async () => {
      console.log('Reloading tenants.config.json...');
      await start();
    });

    await start();

    process.on('SIGINT', async () => {
      watcher.close();
      if (instance) await instance.close();
      if (child != null) child.kill('SIGINT');
      process.exit(0);
    });
  });

program.parse();
