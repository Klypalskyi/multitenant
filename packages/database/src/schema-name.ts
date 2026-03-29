import { Buffer } from 'node:buffer';

/** PostgreSQL `NAMEDATALEN - 1` for identifiers (63 bytes in typical builds). */
export const POSTGRES_MAX_IDENTIFIER_BYTES = 63;

function normalizeIdentSegment(segment: string): string {
  let s = segment.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  s = s.replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (/^[0-9]/.test(s)) {
    s = `t_${s}`;
  }
  return s;
}

function truncateToUtf8ByteLength(s: string, maxBytes: number): string {
  if (Buffer.byteLength(s, 'utf8') <= maxBytes) {
    return s.replace(/_+$/, '');
  }
  let end = s.length;
  while (end > 0 && Buffer.byteLength(s.slice(0, end), 'utf8') > maxBytes) {
    end -= 1;
  }
  const out = s.slice(0, end).replace(/_+$/, '');
  if (!out) {
    throw new Error('[multitenant/database] schemaNameForTenant: truncation would yield empty identifier');
  }
  return out;
}

/**
 * Map a logical `tenantKey` (from `ResolvedTenant`) to a **PostgreSQL-safe unquoted schema name**:
 * lowercased, non-alphanumeric → `_`, optional `prefix`, leading digits get `t_`, length capped by byte size.
 *
 * **Collision risk:** different keys can normalize to the same string (e.g. `acme-corp` and `acme_corp`).
 * Keep registry `tenantKey` strings distinct under this rule or use explicit mapping in config.
 */
export function schemaNameForTenant(
  tenantKey: string,
  options?: { prefix?: string; maxLength?: number },
): string {
  if (tenantKey === undefined || tenantKey === null || String(tenantKey).trim() === '') {
    throw new Error('[multitenant/database] schemaNameForTenant: tenantKey must be a non-empty string');
  }

  const body = normalizeIdentSegment(String(tenantKey).trim());
  if (!body) {
    throw new Error('[multitenant/database] schemaNameForTenant: tenantKey produces empty identifier after normalization');
  }

  const maxLen = Math.min(
    Math.max(1, options?.maxLength ?? POSTGRES_MAX_IDENTIFIER_BYTES),
    POSTGRES_MAX_IDENTIFIER_BYTES,
  );

  let prefixPart = '';
  if (options?.prefix !== undefined && options.prefix !== '') {
    prefixPart = normalizeIdentSegment(String(options.prefix).trim());
    if (!prefixPart) {
      throw new Error('[multitenant/database] schemaNameForTenant: prefix normalizes to empty');
    }
  }

  const combined = prefixPart ? `${prefixPart}_${body}` : body;
  return truncateToUtf8ByteLength(combined, maxLen);
}
