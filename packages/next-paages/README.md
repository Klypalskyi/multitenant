# @multitenant/next-pages

Next.js **Pages Router** integration for `@multitenant/core`.

It provides:

- `withTenantGSSP(gssp, { registry, environment? })` – wraps `getServerSideProps` and injects `tenant` into props
- `withTenantApi(handler, { registry, environment? })` – wraps API route handlers and attaches `req.tenant`

## Install

```bash
npm install @multitenant/next-pages @multitenant/core
```

## Usage

### `pages/index.tsx`

```tsx
import React from 'react';
import type { GetServerSideProps } from 'next';
import { withTenantGSSP } from '@multitenant/next-pages';
import { tenantRegistry } from '../tenant-registry';
import type { ResolvedTenant } from '@multitenant/core';

interface Props {
  tenant: ResolvedTenant;
}

export const getServerSideProps: GetServerSideProps<Props> = withTenantGSSP(
  async ({ tenant }) => {
    return { props: { tenant } };
  },
  { registry: tenantRegistry, environment: 'local' },
);

export default function Page({ tenant }: Props) {
  return <div>Tenant: {tenant.tenantKey}</div>;
}
```

### API routes

```ts
// pages/api/example.ts
import type { NextApiResponse } from 'next';
import { withTenantApi, type NextApiRequestWithTenant } from '@multitenant/next-pages';
import { tenantRegistry } from '../../tenant-registry';

export default withTenantApi(
  (req: NextApiRequestWithTenant, res: NextApiResponse) => {
    if (!req.tenant) return res.status(404).end('no tenant');
    res.json({ tenant: req.tenant.tenantKey });
  },
  { registry: tenantRegistry, environment: 'local' },
);
```

