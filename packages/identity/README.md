# @multitenant/identity

Identity utilities for multi-tenant apps built on `@multitenant/core`.

It provides:

- `encodeSessionToCookie(session, secret)` → encrypted+signed cookie value
- `decodeSessionFromCookie(value, secret)` → `EncodedSession | null`
- `getSessionFromCookieHeader(...)`, `buildSessionSetCookieHeader(...)` — thin wiring on top of cookie primitives; optional **`CookieConfig.domain`** for `Domain=` (cross-subdomain); **`Domain`** is rejected with **`__Host-`** cookie names
- Re-exports from `@multitenant/core`:
  - `Identity`
  - `EncodedSession`
  - `TenantGuardOptions`
  - `canAccessTenant`
  - `assertAccess`

## Install

```bash
npm install @multitenant/identity
```

## Usage

```ts
import {
  encodeSessionToCookie,
  decodeSessionFromCookie,
  type EncodedSession,
} from '@multitenant/identity';

const secret = process.env.SESSION_SECRET!;

const cookieValue = encodeSessionToCookie(
  {
    identity: { subject: 'user_123', tenantAccess: [] },
    currentTenantKey: 'us-main',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60,
  },
  secret,
);

const session: EncodedSession | null = decodeSessionFromCookie(cookieValue, secret);
```

---

## Open source

MIT licensed — [**github.com/klypalskyi/multitenant**](https://github.com/klypalskyi/multitenant) · [Issues](https://github.com/klypalskyi/multitenant/issues) · [npm](https://www.npmjs.com/package/@multitenant/identity)
