import React from 'react';
import type { GetServerSideProps } from 'next';
import { withTenantGSSP } from '@tenantify/next-pages';
import { tenantRegistry } from '../tenant-registry';
import type { ResolvedTenant } from '@tenantify/core';

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
  return (
    <main>
      <h1>Tenantify Next Pages example</h1>
      <p>Tenant: {tenant.tenantKey}</p>
      <p>Market: {tenant.marketKey}</p>
    </main>
  );
}
