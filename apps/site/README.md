# `@multitenant/site`

Public docs / landing built with **Nextra 4** + **`nextra-theme-docs`** (same lineage as [shuding/nextra-docs-template](https://github.com/shuding/nextra-docs-template): Next.js + Nextra docs theme; this app uses the App Router + `_meta.global` layout from current Nextra 4).

## Develop

From repo root:

```bash
npm install
npm run dev -w @multitenant/site
```

Open [http://localhost:3101](http://localhost:3101).

If you see a **duplicate React** / `useContext` error after changing dependencies, run **`npm dedupe`** at the repo root (npm sometimes nests `apps/site/node_modules` until deduped).

## Vercel

1. Import the repo, set **Root Directory** to `apps/site`.
2. Install / build commands are in [`vercel.json`](./vercel.json) (`npm ci` + `npm run build -w @multitenant/site` from the monorepo root).

Deploy by connecting this repo in **Vercel** (Git integration); **Root Directory** `apps/site` picks up [`vercel.json`](./vercel.json).
