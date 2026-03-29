import { describe, expect, it, vi } from 'vitest';
import type { GetServerSidePropsContext } from 'next';
import type { TenantsConfig } from '@multitenant/core';
import { createTenantRegistry } from '@multitenant/core';
import { withTenantGSSP } from './index';

const minimalMarket = {
  currency: 'USD',
  locale: 'en-US',
  timezone: 'America/New_York',
};

function baseConfig(): TenantsConfig {
  return {
    version: 1,
    defaultEnvironment: 'local',
    markets: { us: minimalMarket },
    tenants: {
      'us-main': {
        market: 'us',
        domains: {
          local: { 'app.example.test': 'us-main' },
        },
      },
    },
  };
}

function ctx(partial: Partial<GetServerSidePropsContext['req']>): GetServerSidePropsContext {
  return {
    req: {
      headers: {},
      ...partial,
    },
  } as GetServerSidePropsContext;
}

describe('withTenantGSSP', () => {
  const registry = createTenantRegistry(baseConfig());

  it('returns notFound when tenant cannot be resolved (Pages contract)', async () => {
    const inner = vi.fn();
    const gssp = withTenantGSSP(inner, { registry, environment: 'local' });
    const result = await gssp(
      ctx({ headers: { host: 'unknown.example.test' } } as GetServerSidePropsContext['req']),
    );
    expect(inner).not.toHaveBeenCalled();
    expect(result).toEqual({ notFound: true });
  });

  it('calls inner getServerSideProps with tenant when host matches', async () => {
    const inner = vi.fn(async () => ({ props: { page: 'ok' } }));
    const gssp = withTenantGSSP(inner, { registry, environment: 'local' });
    const context = ctx({
      headers: { host: 'app.example.test' },
    } as GetServerSidePropsContext['req']);

    const result = await gssp(context);

    expect(inner).toHaveBeenCalledTimes(1);
    const arg = inner.mock.calls[0]![0];
    expect(arg.tenant.tenantKey).toBe('us-main');
    expect(result).toEqual({ props: { page: 'ok' } });
  });

  it('uses x-forwarded-host when present', async () => {
    const inner = vi.fn(async () => ({ props: {} as { tenant: unknown } }));
    const gssp = withTenantGSSP(inner, { registry, environment: 'local' });
    await gssp(
      ctx({
        headers: { host: '127.0.0.1', 'x-forwarded-host': 'app.example.test' },
      } as GetServerSidePropsContext['req']),
    );
    expect(inner.mock.calls[0]![0].tenant.tenantKey).toBe('us-main');
  });
});
