import * as crypto from 'node:crypto';
import type { EncodedSession } from '@multitenant/core';

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function keyFromSecret(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64url');
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

export interface CookieConfig {
  cookieName?: string;
  domainStrategy?: 'host' | 'root' | 'market';
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAgeSeconds?: number;
}

export function encodeSessionToCookie(session: EncodedSession, secret: string): string {
  const key = keyFromSecret(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const payload = JSON.stringify(session);
  const enc = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, enc]);
  return base64urlEncode(combined);
}

export function decodeSessionFromCookie(
  cookieValue: string,
  secret: string,
): EncodedSession | null {
  try {
    const key = keyFromSecret(secret);
    const combined = base64urlDecode(cookieValue);
    if (combined.length < IV_LEN + TAG_LEN) return null;
    const iv = combined.subarray(0, IV_LEN);
    const tag = combined.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = combined.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    const payload = decipher.update(enc) + decipher.final('utf8');
    return JSON.parse(payload) as EncodedSession;
  } catch {
    return null;
  }
}
