import type { EncodedSession } from '@multitenant/core';
import type { CookieConfig } from './cookie';
import { decodeSessionFromCookie, encodeSessionToCookie } from './cookie';

const DEFAULT_SESSION_COOKIE = 'multitenant_session';

/**
 * Parse a raw `Cookie` header and return the multitenant session, or `null`.
 */
export function getSessionFromCookieHeader(
  cookieHeader: string | null | undefined,
  secret: string,
  options?: Pick<CookieConfig, 'cookieName'>,
): EncodedSession | null {
  if (cookieHeader == null || cookieHeader === '') return null;
  const name = options?.cookieName ?? DEFAULT_SESSION_COOKIE;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const value = trimmed.slice(name.length + 1);
    return decodeSessionFromCookie(value, secret);
  }
  return null;
}

/**
 * Build a full `Set-Cookie` header value (name, value, Path, HttpOnly, SameSite, optional Secure / Max-Age).
 */
export function buildSessionSetCookieHeader(
  session: EncodedSession,
  secret: string,
  config?: CookieConfig,
): string {
  const name = config?.cookieName ?? DEFAULT_SESSION_COOKIE;
  const value = encodeSessionToCookie(session, secret);
  const path = config?.path ?? '/';
  const sameSite = config?.sameSite ?? 'lax';
  const segments = [`${name}=${value}`, `Path=${path}`, 'HttpOnly', `SameSite=${sameSite}`];
  if (config?.secure) {
    segments.push('Secure');
  }
  if (config?.maxAgeSeconds != null) {
    segments.push(`Max-Age=${config.maxAgeSeconds}`);
  }
  return segments.join('; ');
}
