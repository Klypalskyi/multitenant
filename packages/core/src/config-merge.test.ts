import { describe, expect, it } from 'vitest';
import { InvalidTenantsConfigError } from './errors';
import { mergeTenantConfigLayers } from './config-merge';

describe('mergeTenantConfigLayers', () => {
  it('merges market → tenant → environment in order (last wins for scalars)', () => {
    const m = mergeTenantConfigLayers([
      { a: 1, nested: { x: 0 } },
      { b: 2, nested: { y: 1 } },
      { a: 99, nested: { x: 1 } },
    ]);
    expect(m).toEqual({ a: 99, b: 2, nested: { x: 1, y: 1 } });
  });

  it('deep-merges nested objects', () => {
    expect(
      mergeTenantConfigLayers([{ k: { inner: 1 } }, { k: { other: 2 } }]),
    ).toEqual({ k: { inner: 1, other: 2 } });
  });

  it('skips empty and undefined layers', () => {
    expect(
      mergeTenantConfigLayers([undefined, {}, { x: 1 }]),
    ).toEqual({ x: 1 });
  });

  it('throws InvalidTenantsConfigError when object collides with scalar', () => {
    expect(() =>
      mergeTenantConfigLayers([{ a: { b: 1 } }, { a: 2 }], { tenantKey: 't1' }),
    ).toThrow(InvalidTenantsConfigError);
    expect(() =>
      mergeTenantConfigLayers([{ a: 1 }, { a: { b: 2 } }]),
    ).toThrow(InvalidTenantsConfigError);
  });
});
