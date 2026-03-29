import { describe, expect, it } from 'vitest';
import {
  assignTenantIdForWrite,
  assertRowTenantColumn,
  requireTenantKey,
  runWithTenantScope,
} from './index';

describe('requireTenantKey', () => {
  it('throws outside tenant scope', () => {
    expect(() => requireTenantKey()).toThrow(/No tenant scope/);
  });

  it('returns tenantKey inside scope', () => {
    runWithTenantScope({ tenantKey: 'acme' }, () => {
      expect(requireTenantKey()).toBe('acme');
    });
  });
});

describe('assignTenantIdForWrite', () => {
  it('adds default tenant_id when absent', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      const out = assignTenantIdForWrite({ name: 'x' });
      expect(out).toEqual({ name: 'x', tenant_id: 't1' });
    });
  });

  it('preserves row when tenant_id already matches', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      const out = assignTenantIdForWrite({ tenant_id: 't1', v: 1 });
      expect(out).toEqual({ tenant_id: 't1', v: 1 });
    });
  });

  it('throws when row tenant_id conflicts with scope', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      expect(() => assignTenantIdForWrite({ tenant_id: 'other' })).toThrow(/conflicts with current tenant scope/);
    });
  });

  it('uses custom column name', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      const out = assignTenantIdForWrite({ a: 1 }, 'org_id');
      expect(out).toEqual({ a: 1, org_id: 't1' });
    });
  });
});

describe('assertRowTenantColumn', () => {
  it('passes when column matches scope', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      expect(() => assertRowTenantColumn({ tenant_id: 't1', id: 1 })).not.toThrow();
    });
  });

  it('throws when column missing', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      expect(() => assertRowTenantColumn({ id: 1 })).toThrow(/missing required column/);
    });
  });

  it('throws when column mismatches scope', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      expect(() => assertRowTenantColumn({ tenant_id: 'x' })).toThrow(/does not match current tenant scope/);
    });
  });

  it('respects custom column name', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      assertRowTenantColumn({ org_id: 't1' }, 'org_id');
    });
  });

  it('rejects empty column name', () => {
    runWithTenantScope({ tenantKey: 't1' }, () => {
      expect(() => assertRowTenantColumn({ x: 1 }, '')).toThrow(/columnName must be non-empty/);
      expect(() => assignTenantIdForWrite({ x: 1 }, '')).toThrow(/columnName must be non-empty/);
    });
  });
});
