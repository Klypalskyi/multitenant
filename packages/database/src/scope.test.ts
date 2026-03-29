import { describe, expect, it } from 'vitest';
import type { ResolvedTenant } from '@multitenant/core';
import {
  getResolvedTenantFromScope,
  getTenantScope,
  requireResolvedTenantFromScope,
  requireTenantScope,
  runWithTenantScope,
  runWithTenantScopeAsync,
} from './index';

function minimalResolved(overrides?: Partial<ResolvedTenant>): ResolvedTenant {
  return {
    tenantKey: 't1',
    marketKey: 'us',
    host: 'app.test',
    environment: 'local',
    theme: null,
    flags: { beta: true },
    experiments: {},
    ...overrides,
  };
}

describe('runWithTenantScope', () => {
  it('exposes scope inside sync callback', () => {
    runWithTenantScope({ tenantKey: 'a' }, () => {
      expect(getTenantScope()?.tenantKey).toBe('a');
    });
    expect(getTenantScope()).toBeUndefined();
  });

  it('requireTenantScope throws outside scope', () => {
    expect(() => requireTenantScope()).toThrow(/No tenant scope/);
  });

  it('requireTenantScope returns scope inside', () => {
    runWithTenantScope({ tenantKey: 'b' }, () => {
      expect(requireTenantScope().tenantKey).toBe('b');
    });
  });

  it('nested scopes override for inner async', async () => {
    const outerR = minimalResolved({ tenantKey: 'outer', marketKey: 'us' });
    const innerR = minimalResolved({ tenantKey: 'inner', marketKey: 'eu' });
    await runWithTenantScopeAsync({ tenantKey: 'outer', resolved: outerR }, async () => {
      expect(getTenantScope()?.tenantKey).toBe('outer');
      expect(getResolvedTenantFromScope()?.tenantKey).toBe('outer');
      await runWithTenantScopeAsync({ tenantKey: 'inner', resolved: innerR }, async () => {
        expect(getTenantScope()?.tenantKey).toBe('inner');
        expect(requireResolvedTenantFromScope().marketKey).toBe('eu');
      });
      expect(getTenantScope()?.tenantKey).toBe('outer');
      expect(getResolvedTenantFromScope()?.tenantKey).toBe('outer');
    });
  });

  it('getResolvedTenantFromScope is undefined when scope omits resolved', () => {
    runWithTenantScope({ tenantKey: 'only-key' }, () => {
      expect(getResolvedTenantFromScope()).toBeUndefined();
    });
  });

  it('requireResolvedTenantFromScope throws when resolved omitted', () => {
    runWithTenantScope({ tenantKey: 'only-key' }, () => {
      expect(() => requireResolvedTenantFromScope()).toThrow(/no ResolvedTenant/);
    });
  });

  it('requireResolvedTenantFromScope returns ResolvedTenant when set', () => {
    const r = minimalResolved();
    runWithTenantScope({ tenantKey: 't1', resolved: r }, () => {
      expect(requireResolvedTenantFromScope().flags.beta).toBe(true);
    });
  });
});
