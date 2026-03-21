import { describe, expect, it } from 'vitest';
import {
  DomainResolutionError,
  InvalidTenantsConfigError,
  MultitenantError,
  TenantNotFoundError,
  isMultitenantError,
} from './errors';

describe('MultitenantError hierarchy', () => {
  it('InvalidTenantsConfigError has stable code', () => {
    const e = new InvalidTenantsConfigError('bad');
    expect(e).toBeInstanceOf(MultitenantError);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('MULTITENANT_INVALID_CONFIG');
    expect(e.name).toBe('InvalidTenantsConfigError');
    expect(e.message).toBe('bad');
  });

  it('DomainResolutionError has stable code', () => {
    const e = new DomainResolutionError('ambiguous');
    expect(e.code).toBe('MULTITENANT_DOMAIN_RESOLUTION');
    expect(e.name).toBe('DomainResolutionError');
  });

  it('TenantNotFoundError has stable code', () => {
    const e = new TenantNotFoundError('none');
    expect(e.code).toBe('MULTITENANT_TENANT_NOT_FOUND');
    expect(e.name).toBe('TenantNotFoundError');
  });

  it('preserves cause', () => {
    const inner = new Error('inner');
    const e = new InvalidTenantsConfigError('wrap', { cause: inner });
    expect(e.cause).toBe(inner);
  });

  it('isMultitenantError narrows', () => {
    expect(isMultitenantError(new DomainResolutionError('x'))).toBe(true);
    expect(isMultitenantError(new Error('plain'))).toBe(false);
  });
});
