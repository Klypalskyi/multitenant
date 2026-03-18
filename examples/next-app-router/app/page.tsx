'use client';

import React from 'react';
import { useTenant, useMarket } from '@tenantify/react';

export default function Page() {
  const tenant = useTenant();
  const market = useMarket();

  return (
    <main>
      <h1>Tenantify Next App Router example</h1>
      <p>Tenant: {tenant.tenantKey}</p>
      <p>Market: {market.key}</p>
    </main>
  );
}
