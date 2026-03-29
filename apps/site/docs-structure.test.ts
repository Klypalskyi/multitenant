import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appDir = join(__dirname, 'app');

/** Every public MDX page we ship — catches accidental deletes when editing nav. */
const requiredMdx = [
  'page.mdx',
  'why-multitenant/page.mdx',
  'getting-started/page.mdx',
  'config/page.mdx',
  'packages/page.mdx',
  'errors/page.mdx',
  'examples/page.mdx',
  'cli/init/page.mdx',
  'cli/dev-check-print/page.mdx',
  'frameworks/overview/page.mdx',
  'frameworks/next-app/page.mdx',
  'frameworks/next-pages/page.mdx',
  'frameworks/express/page.mdx',
  'frameworks/nest/page.mdx',
  'frameworks/react/page.mdx',
];

describe('@multitenant/site docs pages', () => {
  it.each(requiredMdx)('has non-trivial %s', (rel) => {
    const abs = join(appDir, rel);
    expect(existsSync(abs), `missing ${rel}`).toBe(true);
    const text = readFileSync(abs, 'utf8');
    expect(text.length).toBeGreaterThan(120);
    expect(text).toMatch(/#{1,3} /);
  });

  it('home links to key sections', () => {
    const home = readFileSync(join(appDir, 'page.mdx'), 'utf8');
    expect(home).toContain('/getting-started');
    expect(home).toContain('/frameworks/overview');
    expect(home).toContain('/examples');
  });
});
