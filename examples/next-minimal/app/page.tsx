import { headers } from 'next/headers';
import { getTenantFromHeaders } from '@multitenant/next-app';
import { tenantRegistry } from '../lib/tenant-registry';

export default async function HomePage() {
  const h = await headers();
  const tenant = getTenantFromHeaders(h, tenantRegistry, { environment: 'local' });

  if (!tenant) {
    return (
      <main>
        <h1>Next minimal example</h1>
        <p>No tenant resolved — set Host to <code>us.localhost</code> (and port), or use multitenant dev proxy.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Next minimal example</h1>
      <p>
        Tenant: <strong>{tenant.tenantKey}</strong>
      </p>
      <p>
        Market: <strong>{tenant.marketKey}</strong>
      </p>
      <p style={{ fontSize: '0.9rem', color: '#555' }}>
        <code>npm run dev -w @multitenant/example-next-minimal</code> — default port 3050.
      </p>
    </main>
  );
}
