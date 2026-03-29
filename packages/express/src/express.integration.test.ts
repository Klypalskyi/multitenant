import { describe, expect, it } from 'vitest';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import type { TenantsConfig } from '@multitenant/core';
import { TenantNotFoundError, createTenantRegistry } from '@multitenant/core';
import { multitenantExpress } from './index';

const minimalMarket = {
  currency: 'USD',
  locale: 'en-US',
  timezone: 'America/New_York',
};

function baseConfig(overrides?: Partial<TenantsConfig>): TenantsConfig {
  return {
    version: 1,
    defaultEnvironment: 'local',
    markets: { us: minimalMarket },
    tenants: {
      'us-main': {
        market: 'us',
        flags: { api: true },
        domains: {
          local: { 'app.example.test': 'us-main' },
        },
      },
    },
    ...overrides,
  };
}

describe('multitenantExpress (HTTP integration)', () => {
  const registry = createTenantRegistry(baseConfig());

  it('resolves tenant from Host and exposes it on the handler', async () => {
    const app = express();
    app.use(multitenantExpress({ registry, environment: 'local' }));
    app.get('/t', (req, res) => {
      res.json({
        key: req.tenant?.tenantKey ?? null,
        market: req.tenant?.marketKey ?? null,
        flags: req.tenant?.flags ?? null,
      });
    });

    const res = await request(app).get('/t').set('Host', 'app.example.test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      key: 'us-main',
      market: 'us',
      flags: { api: true },
    });
  });

  it('prefers x-forwarded-host for resolution behind a proxy', async () => {
    const app = express();
    app.use(multitenantExpress({ registry, environment: 'local' }));
    app.get('/t', (req, res) => {
      res.json({ key: req.tenant?.tenantKey ?? null });
    });

    const res = await request(app)
      .get('/t')
      .set('Host', '127.0.0.1')
      .set('X-Forwarded-Host', 'app.example.test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ key: 'us-main' });
  });

  it('yields null tenant when host does not map', async () => {
    const app = express();
    app.use(multitenantExpress({ registry, environment: 'local' }));
    app.get('/t', (req, res) => {
      res.json({ key: req.tenant?.tenantKey ?? null });
    });

    const res = await request(app).get('/t').set('Host', 'nope.example.test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ key: null });
  });

  it('surfaces TenantNotFoundError when onMissingTenant is throw', async () => {
    const app = express();
    app.use(
      multitenantExpress({
        registry,
        environment: 'local',
        onMissingTenant: 'throw',
      }),
    );
    const errMw: ErrorRequestHandler = (err, _req, res, _next) => {
      if (err instanceof TenantNotFoundError) {
        res.status(404).json({ code: err.code });
        return;
      }
      _next(err);
    };
    app.use(errMw);

    const res = await request(app).get('/t').set('Host', 'nope.example.test');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'MULTITENANT_TENANT_NOT_FOUND' });
  });
});
