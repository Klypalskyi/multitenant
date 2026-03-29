# @multitenant/next

Thin **meta-package** that re-exports:

- `@multitenant/core`
- `@multitenant/config`
- `@multitenant/react`
- `@multitenant/next-app`

Install one line plus `next` and `react`:

```bash
npm install @multitenant/next next react
```

Subpaths such as `@multitenant/next-app/auto` are available via this package’s dependencies (import from `@multitenant/next-app/auto` or add a direct dependency if your bundler requires it).

See [docs/FRAMEWORKS/overview.md](../../docs/FRAMEWORKS/overview.md) and [PLAN.md](../../PLAN.md) Phase 2.2.
