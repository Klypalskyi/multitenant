import { Analytics } from '@vercel/analytics/react';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'nextra-theme-docs/style.css';

export const metadata: Metadata = {
  title: {
    template: '%s — Multitenant',
    default: 'Multitenant',
  },
  description:
    'Multi-tenant + multi-market toolkit for TypeScript — config-driven hosts, Next.js, Express, Nest, React.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap();

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={
            <Navbar
              logo={<strong>@multitenant</strong>}
              projectLink="https://github.com/klypalskyi/multitenant"
              chatLink="https://github.com/klypalskyi/multitenant/issues"
            />
          }
          footer={<Footer>MIT — Multitenant monorepo</Footer>}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/klypalskyi/multitenant/tree/master/apps/site"
          pageMap={pageMap}
        >
          {children}
        </Layout>
        <Analytics />
      </body>
    </html>
  );
}
