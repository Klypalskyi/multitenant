import { describe, expect, it } from 'vitest';
import type { EncodedSession } from '@multitenant/core';
import { buildSessionSetCookieHeader, getSessionFromCookieHeader } from './session';

const secret = 'test-secret-at-least-32-chars-long!!';
const session: EncodedSession = {
  identity: {
    subject: 'u1',
    tenantAccess: [{ tenantKey: 't1' }],
  },
  currentTenantKey: 't1',
  issuedAt: 1,
  expiresAt: 9_999_999_999,
};

describe('session cookie helpers', () => {
  it('round-trips via Set-Cookie / Cookie header', () => {
    const setCookie = buildSessionSetCookieHeader(session, secret, {
      cookieName: 'mt_sess',
    });
    const valuePart = setCookie.split(';')[0];
    expect(valuePart.startsWith('mt_sess=')).toBe(true);
    const rawCookie = valuePart!;
    const header = `${rawCookie}; other=x`;
    const decoded = getSessionFromCookieHeader(header, secret, { cookieName: 'mt_sess' });
    expect(decoded?.currentTenantKey).toBe('t1');
    expect(decoded?.identity.subject).toBe('u1');
  });

  it('getSessionFromCookieHeader returns null when missing', () => {
    expect(getSessionFromCookieHeader('foo=bar', secret)).toBeNull();
  });

  it('buildSessionSetCookieHeader adds Domain when config.domain is set', () => {
    const setCookie = buildSessionSetCookieHeader(session, secret, {
      domain: '.example.com',
    });
    expect(setCookie).toMatch(/;\s*Domain=\.example\.com(;|$)/);
  });

  it('buildSessionSetCookieHeader rejects Domain with __Host- cookie name', () => {
    expect(() =>
      buildSessionSetCookieHeader(session, secret, {
        cookieName: '__Host-multitenant_session',
        domain: '.example.com',
      }),
    ).toThrow(/Domain must not be set/);
  });
});
