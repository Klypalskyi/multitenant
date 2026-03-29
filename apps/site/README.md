# `@multitenant/site`

Public docs / landing: **Next.js** (App Router) + **Fumadocs** (**`fumadocs-mdx`**, **`fumadocs-ui`**, Tailwind 4). MDX lives in **`content/docs/`** (sidebar via **`meta.json`** per folder).

**Tests:** `npm test -w @multitenant/site` (`docs-structure.test.ts` guards doc files).

**Sidebar labels** come from each page’s YAML `title` / `description`. To bulk-refresh titles after editing MDX, run `npm run docs:patch-titles -w @multitenant/site` (see `scripts/patch-doc-titles.mjs`).

## Local

From the monorepo root:

```bash
npm run site:dev
# → http://localhost:3101
```

- **`/`** — short landing
- **`/docs/*`** — documentation (search API at **`/api/search`**)

## Deploy (Vercel)

**Root Directory** `apps/site`. Install/build run from the repo root via [`vercel.json`](./vercel.json) (`npm ci` + `npm run build -w @multitenant/site`).
