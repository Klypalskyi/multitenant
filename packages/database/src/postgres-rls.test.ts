import { describe, expect, it } from 'vitest';
import {
  POSTGRES_RLS_TENANT_GUC_DEFAULT,
  assertSafePostgresCustomGucName,
  buildSetLocalTenantGucSql,
  buildSetLocalTenantGucSqlFromScope,
  escapePostgresStringLiteral,
  runWithTenantScope,
} from './index';

describe('escapePostgresStringLiteral', () => {
  it('wraps and escapes single quotes', () => {
    expect(escapePostgresStringLiteral("O'Brien")).toBe("'O''Brien'");
    expect(escapePostgresStringLiteral('acme')).toBe("'acme'");
  });

  it('rejects null bytes', () => {
    expect(() => escapePostgresStringLiteral('a\0b')).toThrow(/null byte/);
  });
});

describe('assertSafePostgresCustomGucName', () => {
  it('accepts dotted custom GUC names', () => {
    expect(() => assertSafePostgresCustomGucName('app.tenant_id')).not.toThrow();
    expect(() => assertSafePostgresCustomGucName('my_app.current_tenant')).not.toThrow();
  });

  it('rejects injection-shaped names', () => {
    expect(() => assertSafePostgresCustomGucName("app'; DROP TABLE users;--")).toThrow(/Invalid Postgres custom GUC/);
    expect(() => assertSafePostgresCustomGucName('')).toThrow(/Invalid Postgres custom GUC/);
    expect(() => assertSafePostgresCustomGucName('1bad')).toThrow(/Invalid Postgres custom GUC/);
    expect(() => assertSafePostgresCustomGucName('.bad')).toThrow(/Invalid Postgres custom GUC/);
  });
});

describe('buildSetLocalTenantGucSql', () => {
  it('builds SET LOCAL with escaped tenant key', () => {
    expect(buildSetLocalTenantGucSql('app.tenant_id', "a'b")).toBe(
      "SET LOCAL app.tenant_id TO 'a''b'",
    );
  });

  it('uses default GUC constant', () => {
    const sql = buildSetLocalTenantGucSql(POSTGRES_RLS_TENANT_GUC_DEFAULT, 't1');
    expect(sql).toBe("SET LOCAL app.tenant_id TO 't1'");
  });

  it('rejects empty tenant key', () => {
    expect(() => buildSetLocalTenantGucSql('app.tenant_id', '')).toThrow(/non-empty/);
    expect(() => buildSetLocalTenantGucSql('app.tenant_id', '   ')).toThrow(/non-empty/);
  });
});

describe('buildSetLocalTenantGucSqlFromScope', () => {
  it('throws without ALS scope', () => {
    expect(() => buildSetLocalTenantGucSqlFromScope()).toThrow(/No tenant scope/);
  });

  it('uses requireTenantKey and optional GUC name', () => {
    runWithTenantScope({ tenantKey: 'us-main' }, () => {
      expect(buildSetLocalTenantGucSqlFromScope()).toBe("SET LOCAL app.tenant_id TO 'us-main'");
      expect(buildSetLocalTenantGucSqlFromScope('cfg.tenant_key')).toBe(
        "SET LOCAL cfg.tenant_key TO 'us-main'",
      );
    });
  });
});
