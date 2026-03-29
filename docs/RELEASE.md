# Release: tag, git push, npm publish

**Version bumps:** Only `packages/<name>/package.json` for packages whose `src/` changed (plus `packages/cli/src/cli.ts` `.version(...)` when the CLI ships). The **root** `package.json` is private and has no publishable version — do not add a root version for releases.

Per-package semver values can **diverge** (e.g. `@multitenant/core` still `0.4.0` while `@multitenant/express` is `0.5.0`) until each package is bumped again; see root `CHANGELOG.md` for the release narrative.

## Prerequisites

- Clean tree: `git status` (commit changelog + version bumps first).
- **Auth (pick one):**
  - **Interactive:** `npm login` (account with publish rights to `@multitenant/*`), then `npm whoami`.
  - **Token (CI / scripts):** Create an **Automation** (or granular **Publish**) token at [npm → Access Tokens](https://www.npmjs.com/settings/~/tokens). Export it as `NPM_TOKEN` and wire the registry **before** `npm publish`:

    ```bash
    export NPM_TOKEN=npm_xxxxx   # never commit the raw value
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
    ```

    Or add a **gitignored** root `.npmrc` containing only:

    ```
    //registry.npmjs.org/:_authToken=${NPM_TOKEN}
    ```

    npm substitutes `${NPM_TOKEN}` from the environment (npm 7+). Do **not** commit a file with a literal token.

    In **GitHub Actions**, set secret `NPM_TOKEN` and run the same `echo` line (or `npm config set`) in the publish job step.

## 1. Build

From repo root:

```bash
npm install
npm run build
```

## 2. Version

**Important:** Only bump versions for packages with source code changes (modified `src/` directory). This prevents spurious npm updates for unchanged packages.

### Identify changed packages

```bash
# Show which packages have src/ changes since last release
git diff v0.4.0..HEAD --name-only | grep 'packages/.*/src/'

# If output is empty or limited, only those packages need version bumps
```

### Version bump strategy

1. Bump `packages/<name>/package.json` **only if** `packages/<name>/src/` changed
2. Do NOT bump if only tests (`.test.ts`), docs, or config changed
3. All bumped packages use the **same new version number** (e.g., all go to `0.5.0`)
4. Update `CHANGELOG.md` grouped by package with new versions
5. Update `packages/cli/src/cli.ts` `.version(...)` to the highest version number in the release

### Example

**If only `packages/core/src/` and `packages/react/src/` changed:**
- Bump `packages/core/package.json` → `0.5.0`
- Bump `packages/react/package.json` → `0.5.0`
- Keep all other packages at `0.4.0` (no version change, no republish)
- Update CLI version to `0.5.0`
- Update `CHANGELOG.md` with changes grouped by `@multitenant/core` and `@multitenant/react`

## 3. Git tag

Replace `v0.4.0` with the release version:

```bash
git add -A
git commit -m "chore: release v0.4.0"
git tag -a v0.4.0 -m "v0.4.0"
```

## 4. Push

```bash
git push origin main
git push origin v0.4.0
```

(Use your default branch name if not `main`.)

## 5. Publish to npm

**Only publish packages with version bumps** (i.e., packages with `src/` changes). Publish **in dependency order** so dependents resolve published tarballs.

### Dependency order

```
core
  ├── config
  ├── database  (depends on core)
  ├── identity
  ├── dev-proxy
  └── (cli depends on all of the above)

Adapters (all depend on core):
  ├── react
  ├── next-app  (also depends on config for auto-node)
  ├── next      (meta: core + config + react + next-app)
  ├── next-pages
  ├── express
  ├── nest
  └── cli
```

### Example: only core and react changed

```bash
npm publish -w @multitenant/core --access public
npm publish -w @multitenant/react --access public
# All other packages skip publish (no version change)
```

### Full dependency-order publish (if many packages changed)

```bash
npm publish -w @multitenant/core --access public
npm publish -w @multitenant/config --access public
npm publish -w @multitenant/database --access public
npm publish -w @multitenant/identity --access public
npm publish -w @multitenant/dev-proxy --access public
npm publish -w @multitenant/react --access public
npm publish -w @multitenant/next-app --access public
npm publish -w @multitenant/next --access public
npm publish -w @multitenant/next-pages --access public
npm publish -w @multitenant/express --access public
npm publish -w @multitenant/nest --access public
npm publish -w @multitenant/cli --access public
```

Or run the helper script (walks packages in order; **skips** any workspace whose `version` already exists on npm — only newly bumped packages are published):

```bash
bash scripts/publish-packages.sh
```

**Note:** `@multitenant/next-pages` package folder is `packages/next-paages` (typo in repo); npm package name is `@multitenant/next-pages`.

### OTP / 2FA

Automation tokens usually skip OTP. If you publish with a **user** token or `npm login` and npm prompts for OTP, run each `npm publish` interactively or pass `--otp=<code>` per command.

## 6. Post-release

- Confirm versions on https://www.npmjs.com/package/@multitenant/core
- Open GitHub **Releases** and attach release notes from `CHANGELOG.md` for `v0.4.0`.

## 7. GitHub Actions (npm + docs site)

### Publish to npm (`.github/workflows/publish-npm.yml`)

- **Triggers:** push of a version tag matching `v*` (e.g. `v0.7.0`), or **workflow_dispatch**.
- **Secret:** `NPM_TOKEN` — npm **Automation** token with publish access to the `@multitenant` scope.
- **Behaviour:** `npm ci` → `npm run build` → `bash scripts/publish-packages.sh` (same as local **`release:publish`**; only workspaces whose version is **not** already on npm are published).

### Deploy site to Vercel

- Connect the GitHub repo in Vercel, set **Root Directory** to **`apps/site`**. **`apps/site/vercel.json`** runs **`npm ci`** and **`npm run build -w @multitenant/site`** from the monorepo root so the install graph is correct.
