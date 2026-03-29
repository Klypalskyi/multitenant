import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    /** Pre-Fumadocs routes lived at `/foo`; docs are now under `/docs/foo`. */
    const legacy = [
      ['/getting-started', '/docs/getting-started'],
      ['/config', '/docs/config'],
      ['/errors', '/docs/errors'],
      ['/examples', '/docs/examples'],
      ['/why-multitenant', '/docs/why-multitenant'],
      ['/cli/init', '/docs/cli/init'],
      ['/cli/dev-check-print', '/docs/cli/dev-check-print'],
      ['/frameworks/overview', '/docs'],
      ['/frameworks/next-app', '/docs/packages/next'],
      ['/frameworks/next-pages', '/docs/packages/next'],
      ['/frameworks/express', '/docs/packages/express'],
      ['/frameworks/nest', '/docs/packages/nest'],
      ['/frameworks/react', '/docs/packages/react'],
      ['/docs/frameworks/overview', '/docs'],
      ['/docs/frameworks/next-app', '/docs/packages/next'],
      ['/docs/frameworks/next-pages', '/docs/packages/next'],
      ['/docs/frameworks/express', '/docs/packages/express'],
      ['/docs/frameworks/nest', '/docs/packages/nest'],
      ['/docs/frameworks/react', '/docs/packages/react'],
      ['/packages', '/docs/packages/overview'],
      ['/docs/packages', '/docs/packages/overview'],
      ['/packages/next-app', '/docs/packages/next'],
      ['/docs/packages/next-app', '/docs/packages/next'],
      ['/packages/next-pages', '/docs/packages/next'],
      ['/docs/packages/next-pages', '/docs/packages/next'],
      ...[
        'overview',
        'core',
        'config',
        'cli',
        'dev-proxy',
        'next',
        'react',
        'express',
        'nest',
        'identity',
        'database',
        'drizzle',
        'kysely',
        'prisma',
        'typeorm',
      ].map((slug) => [`/packages/${slug}`, `/docs/packages/${slug}`]),
    ];

    return legacy.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default withMDX(config);
