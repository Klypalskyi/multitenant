'use client';

import React from 'react';
import { TenantProvider } from '@multitenant/react';
import { tenantRegistry } from '../tenant-registry';
import type { ResolvedTenant } from '@multitenant/core';

// In a real app, you'd get this from middleware/headers via a server component.
const dummyTenant: ResolvedTenant = {
  tenantKey: 'us-main',
  marketKey: 'us',
  host: 'us.localhost',
  environment: 'local',
  theme: null,
  flags: {},
  experiments: {},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <TenantProvider registry={tenantRegistry} tenant={dummyTenant}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
