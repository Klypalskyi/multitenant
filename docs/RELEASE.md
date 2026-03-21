# Release: tag, git push, npm publish

All workspace packages use the **same version** (see root `CHANGELOG.md`).

## Prerequisites

- Clean tree: `git status` (commit changelog + version bumps first).
- One-time: `npm login` (npm account with publish rights to `@multitenant/*`).
- `npm whoami` to confirm.

## 1. Build

From repo root:

```bash
npm install
npm run build
```

## 2. Version

Version is already set in each `packages/*/package.json` (e.g. `0.3.0`). For the next release, bump all packages together and update `CHANGELOG.md`, `packages/cli/src/cli.ts` `.version(...)`, then repeat the steps below.

## 3. Git tag

Replace `v0.3.0` with the release version:

```bash
git add -A
git commit -m "chore: release v0.3.0"
git tag -a v0.3.0 -m "v0.3.0"
```

## 4. Push

```bash
git push origin main
git push origin v0.3.0
```

(Use your default branch name if not `main`.)

## 5. Publish to npm

Publish **in dependency order** so dependents resolve published tarballs:

```bash
npm publish -w @multitenant/core --access public
npm publish -w @multitenant/config --access public
npm publish -w @multitenant/identity --access public
npm publish -w @multitenant/dev-proxy --access public
npm publish -w @multitenant/react --access public
npm publish -w @multitenant/next-app --access public
npm publish -w @multitenant/next-pages --access public
npm publish -w @multitenant/express --access public
npm publish -w @multitenant/nest --access public
npm publish -w @multitenant/cli --access public
```

Or run the helper script:

```bash
bash scripts/publish-packages.sh
```

**Note:** `@multitenant/next-pages` package folder is `packages/next-paages` (typo in repo); npm package name is `@multitenant/next-pages`.

### OTP / 2FA

If npm requires OTP, run each `npm publish` interactively or use `--otp=<code>` once per command.

## 6. Post-release

- Confirm versions on https://www.npmjs.com/package/@multitenant/core
- Open GitHub **Releases** and attach release notes from `CHANGELOG.md` for `v0.3.0`.
