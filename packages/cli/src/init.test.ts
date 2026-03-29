import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTenantsConfig, validateTenantsConfig } from '@multitenant/config';
import {
  buildMinimalTenantsConfig,
  InitAbortedError,
  runInit,
} from './init';

const baseOptsNoCwd = {
  tenantKey: 'main',
  marketKey: 'default',
  localHostPattern: 'main.localhost',
  framework: 'none' as const,
  force: false,
};

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'mt-cli-init-'));
}

describe('buildMinimalTenantsConfig', () => {
  it('passes validateTenantsConfig with defaults', () => {
    const c = buildMinimalTenantsConfig({
      cwd: '/tmp',
      ...baseOptsNoCwd,
    });
    expect(validateTenantsConfig(c)).toEqual(c);
    expect(c.tenants.main?.domains.local?.['main.localhost']).toBe('main');
    expect(c.markets.default?.currency).toBe('USD');
  });

  it('uses custom tenant, market, and host pattern', () => {
    const c = buildMinimalTenantsConfig({
      cwd: '/tmp',
      ...baseOptsNoCwd,
      tenantKey: 'acme',
      marketKey: 'us',
      localHostPattern: 'acme.localhost',
    });
    validateTenantsConfig(c);
    expect(c.tenants.acme?.market).toBe('us');
    expect(c.tenants.acme?.domains.local?.['acme.localhost']).toBe('acme');
  });
});

describe('runInit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes tenants.config.json and loadTenantsConfig succeeds', async () => {
    const dir = await tmpDir();
    try {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        tenantKey: 't1',
        marketKey: 'm1',
        localHostPattern: 'app.localhost',
        framework: 'none',
        force: false,
      });
      expect(log).toHaveBeenCalled();
      const cfg = await loadTenantsConfig({ cwd: dir });
      expect(cfg.tenants.t1?.market).toBe('m1');
      expect(cfg.tenants.t1?.domains.local?.['app.localhost']).toBe('t1');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('throws InitAbortedError when config exists and overwrite declined', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        tenantKey: 'a',
        marketKey: 'm',
        localHostPattern: 'a.localhost',
        framework: 'none',
        force: false,
      });
      await expect(
        runInit({
          cwd: dir,
          tenantKey: 'b',
          marketKey: 'm',
          localHostPattern: 'b.localhost',
          framework: 'none',
          force: false,
          confirmOverwrite: async () => false,
        }),
      ).rejects.toThrow(InitAbortedError);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('overwrites existing config when force is true', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        tenantKey: 'first',
        marketKey: 'm',
        localHostPattern: 'first.localhost',
        framework: 'none',
        force: false,
      });
      await runInit({
        cwd: dir,
        tenantKey: 'second',
        marketKey: 'm',
        localHostPattern: 'second.localhost',
        framework: 'none',
        force: true,
      });
      const cfg = await loadTenantsConfig({ cwd: dir });
      expect(cfg.tenants.second).toBeDefined();
      expect(cfg.tenants.first).toBeUndefined();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('writes middleware.ts for next-app', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'next-app',
        force: false,
      });
      const mw = await fs.readFile(path.join(dir, 'middleware.ts'), 'utf8');
      expect(mw).toContain('createTenantMiddleware');
      expect(mw).toContain('tenants.config.json');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('writes lib/tenant-registry.ts for next-pages', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'next-pages',
        force: false,
      });
      const p = path.join(dir, 'lib', 'tenant-registry.ts');
      const body = await fs.readFile(p, 'utf8');
      expect(body).toContain('tenantRegistry');
      expect(body).toContain('withTenantGSSP');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('writes multitenant.server.example.ts for express', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'express',
        force: false,
      });
      const body = await fs.readFile(
        path.join(dir, 'multitenant.server.example.ts'),
        'utf8',
      );
      expect(body).toContain('multitenantExpress');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('skips overwriting lib/tenant-registry when exists and overwrite declined', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'next-pages',
        force: false,
      });
      const regPath = path.join(dir, 'lib', 'tenant-registry.ts');
      await fs.writeFile(regPath, '// keep-pages', 'utf8');
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'next-pages',
        force: false,
        confirmOverwrite: async (msg) => {
          if (msg.includes('tenants.config.json')) return true;
          return false;
        },
      });
      expect(await fs.readFile(regPath, 'utf8')).toBe('// keep-pages');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('skips overwriting express example when exists and overwrite declined', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'express',
        force: false,
      });
      const exPath = path.join(dir, 'multitenant.server.example.ts');
      await fs.writeFile(exPath, '// keep-express', 'utf8');
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'express',
        force: false,
        confirmOverwrite: async (msg) => {
          if (msg.includes('tenants.config.json')) return true;
          return false;
        },
      });
      expect(await fs.readFile(exPath, 'utf8')).toBe('// keep-express');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('skips overwriting middleware when exists and overwrite declined', async () => {
    const dir = await tmpDir();
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'next-app',
        force: false,
      });
      const mwPath = path.join(dir, 'middleware.ts');
      await fs.writeFile(mwPath, '// keep-me', 'utf8');
      await runInit({
        cwd: dir,
        ...baseOptsNoCwd,
        framework: 'next-app',
        force: false,
        confirmOverwrite: async (msg) => {
          if (msg.includes('tenants.config.json')) return true;
          return false;
        },
      });
      expect(await fs.readFile(mwPath, 'utf8')).toBe('// keep-me');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
