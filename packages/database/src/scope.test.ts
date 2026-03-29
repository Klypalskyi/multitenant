import { describe, expect, it } from 'vitest';
import {
  getTenantScope,
  requireTenantScope,
  runWithTenantScope,
  runWithTenantScopeAsync,
} from './index';

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
    await runWithTenantScopeAsync({ tenantKey: 'outer' }, async () => {
      expect(getTenantScope()?.tenantKey).toBe('outer');
      await runWithTenantScopeAsync({ tenantKey: 'inner' }, async () => {
        expect(getTenantScope()?.tenantKey).toBe('inner');
      });
      expect(getTenantScope()?.tenantKey).toBe('outer');
    });
  });
});
