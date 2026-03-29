import { describe, expect, it } from 'vitest';
import { requireSchemaNameForCurrentTenant, runWithTenantScope, schemaNameForTenant } from './index';

describe('schemaNameForTenant', () => {
  it('maps hyphenated tenant keys to valid-style identifiers', () => {
    expect(schemaNameForTenant('us-main')).toBe('us_main');
    expect(schemaNameForTenant('acme-corp-eu')).toBe('acme_corp_eu');
  });

  it('lowercases', () => {
    expect(schemaNameForTenant('Acme')).toBe('acme');
  });

  it('prefixes leading digits', () => {
    expect(schemaNameForTenant('42acme')).toBe('t_42acme');
  });

  it('prepends optional prefix', () => {
    expect(schemaNameForTenant('acme', { prefix: 'cust' })).toBe('cust_acme');
  });

  it('throws on empty input', () => {
    expect(() => schemaNameForTenant('')).toThrow(/non-empty string/);
    expect(() => schemaNameForTenant('   ')).toThrow(/non-empty string/);
  });

  it('throws when normalization empties', () => {
    expect(() => schemaNameForTenant('!!!')).toThrow(/empty identifier/);
  });

  it('truncates to maxLength bytes (UTF-8)', () => {
    const long = 'a'.repeat(80);
    const out = schemaNameForTenant(long, { maxLength: 20 });
    expect(Buffer.byteLength(out, 'utf8')).toBeLessThanOrEqual(20);
    expect(out.length).toBe(20);
  });

  it('handles multibyte truncation without splitting codepoints badly', () => {
    const s = 'café_' + 'x'.repeat(70);
    const out = schemaNameForTenant(s, { maxLength: 10 });
    expect(Buffer.byteLength(out, 'utf8')).toBeLessThanOrEqual(10);
  });
});

describe('requireSchemaNameForCurrentTenant', () => {
  it('throws outside scope', () => {
    expect(() => requireSchemaNameForCurrentTenant()).toThrow(/No tenant scope/);
  });

  it('uses scoped tenant key', () => {
    runWithTenantScope({ tenantKey: 'us-main' }, () => {
      expect(requireSchemaNameForCurrentTenant()).toBe('us_main');
      expect(requireSchemaNameForCurrentTenant({ prefix: 'tnt' })).toBe('tnt_us_main');
    });
  });
});
