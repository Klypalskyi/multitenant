/**
 * One-off / optional: normalize frontmatter title+description for sidebar readability.
 * Run: node scripts/patch-doc-titles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'content', 'docs');

const patches = {
  'index.mdx': {
    title: 'Home',
    description: 'Multitenant — config-driven tenant and market resolution for TypeScript.',
  },
  'why-multitenant.mdx': {
    title: 'Why Multitenant?',
    description: 'When this stack fits, host→tenant flow, and pitfalls.',
  },
  'guide/quick-start.mdx': {
    title: 'Quick start',
    description: 'Scaffold config and validate in under a minute.',
  },
  'guide/getting-started.mdx': {
    title: 'Getting started',
    description: 'Install, config, validation, and wiring adapters.',
  },
  'guide/config.mdx': {
    title: 'Configuration',
    description: '`tenants.config.json` schema, flags, and merge rules.',
  },
  'errors.mdx': {
    title: 'Errors',
    description: '`MultitenantError` hierarchy and stable `code` values.',
  },
  'examples/index.mdx': {
    title: 'Examples',
    description: 'Runnable monorepo workspaces — Express, Next.js App Router, config smoke.',
  },
  'examples/express.mdx': {
    title: 'Express',
    description: 'Minimal Express + multitenantExpress — example express-minimal.',
  },
  'examples/next-app.mdx': {
    title: 'Next.js (App Router)',
    description: '`auto` middleware + example-next-minimal workspace.',
  },
  'cli/init.mdx': {
    title: 'multitenant init',
    description: 'Scaffold `tenants.config.json` and starter files.',
  },
  'cli/dev-check-print.mdx': {
    title: 'dev, check, print',
    description: 'Local proxy, validation, and config inspection.',
  },
  'packages/overview.mdx': {
    title: 'Overview',
    description: 'All `@multitenant/*` packages at a glance.',
  },
  'packages/core.mdx': {
    title: 'Core',
    description: '`@multitenant/core` — registry, resolution, typed errors.',
  },
  'packages/config.mdx': {
    title: 'Config',
    description: '`@multitenant/config` — load and validate tenants.config.json.',
  },
  'packages/cli.mdx': {
    title: 'CLI',
    description: '`@multitenant/cli` — init, dev, check, print.',
  },
  'packages/dev-proxy.mdx': {
    title: 'Dev proxy',
    description: '`@multitenant/dev-proxy` — HTTP proxy for multitenant dev.',
  },
  'packages/next.mdx': {
    title: 'Next.js',
    description: '`@multitenant/next`, `next-app`, `next-pages` — combined guide.',
  },
  'packages/react.mdx': {
    title: 'React',
    description: '`@multitenant/react` — TenantProvider, hooks, SSR/RSC.',
  },
  'packages/express.mdx': {
    title: 'Express',
    description: '`@multitenant/express` — middleware, typings, error handling.',
  },
  'packages/nest.mdx': {
    title: 'NestJS',
    description: '`@multitenant/nest` — module, `@Tenant()`, registry.',
  },
  'packages/identity.mdx': {
    title: 'Identity',
    description: '`@multitenant/identity` — encrypted session cookies.',
  },
  'packages/database.mdx': {
    title: 'Database',
    description: '`@multitenant/database` — ALS scope and Postgres helpers.',
  },
  'packages/drizzle.mdx': {
    title: 'Drizzle',
    description: '`@multitenant/drizzle` — tenant-scoped Drizzle.',
  },
  'packages/kysely.mdx': {
    title: 'Kysely',
    description: '`@multitenant/kysely` — tenant-scoped Kysely.',
  },
  'packages/prisma.mdx': {
    title: 'Prisma',
    description: '`@multitenant/prisma` — tenant-scoped Prisma clients.',
  },
  'packages/typeorm.mdx': {
    title: 'TypeORM',
    description: '`@multitenant/typeorm` — tenant-scoped DataSource.',
  },
};

function replaceFrontmatter(content, title, description) {
  if (!content.startsWith('---\n')) return content;
  const m = content.match(/^---\n[\s\S]*?\n---\n/);
  if (!m) return content;
  const rest = content.slice(m[0].length);
  return (
    `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n` + rest
  );
}

for (const [rel, { title, description }] of Object.entries(patches)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn('skip missing', rel);
    continue;
  }
  const before = fs.readFileSync(abs, 'utf8');
  const after = replaceFrontmatter(before, title, description);
  if (after !== before) {
    fs.writeFileSync(abs, after);
    console.log('updated', rel);
  }
}
