import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentDir = join(__dirname, 'content/docs');

/** Every shipped MDX doc — catches accidental deletes when editing nav. */
const requiredMdx = [
  'index.mdx',
  'why-multitenant.mdx',
  'getting-started.mdx',
  'config.mdx',
  'packages/overview.mdx',
  'packages/core.mdx',
  'packages/config.mdx',
  'packages/cli.mdx',
  'packages/dev-proxy.mdx',
  'packages/next.mdx',
  'packages/react.mdx',
  'packages/express.mdx',
  'packages/nest.mdx',
  'packages/identity.mdx',
  'packages/database.mdx',
  'packages/drizzle.mdx',
  'packages/kysely.mdx',
  'packages/prisma.mdx',
  'packages/typeorm.mdx',
  'errors.mdx',
  'examples.mdx',
  'cli/init.mdx',
  'cli/dev-check-print.mdx',
];

describe('@multitenant/site docs pages', () => {
  it.each(requiredMdx)('has non-trivial %s', (rel) => {
    const abs = join(contentDir, rel);
    expect(existsSync(abs), `missing ${rel}`).toBe(true);
    const text = readFileSync(abs, 'utf8');
    expect(text.length).toBeGreaterThan(120);
    expect(text).toMatch(/#{1,3} /);
  });

  it('home index links to key sections', () => {
    const home = readFileSync(join(contentDir, 'index.mdx'), 'utf8');
    expect(home).toContain('/docs/getting-started');
    expect(home).toContain('/docs/packages/next');
    expect(home).toContain('/docs/packages/overview');
    expect(home).toContain('/docs/examples');
  });
});
