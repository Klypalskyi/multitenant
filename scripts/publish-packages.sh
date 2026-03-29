#!/usr/bin/env bash
# Publish @multitenant/* in dependency order. Run from repo root after npm run build.
# Only publishes a workspace when its package.json "version" is not already on npm
# (supports selective version bumps — see docs/RELEASE.md).
set -euo pipefail

pkgs=(
  @multitenant/core
  @multitenant/config
  @multitenant/database
  @multitenant/identity
  @multitenant/dev-proxy
  @multitenant/react
  @multitenant/next-app
  @multitenant/next
  @multitenant/next-pages
  @multitenant/express
  @multitenant/nest
  @multitenant/cli
)

local_ver() {
  npm pkg get version -w "$1" | node -e "
    const j = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    console.log(Object.values(j)[0]);
  "
}

for p in "${pkgs[@]}"; do
  lv="$(local_ver "$p")"
  rv="$(npm view "$p" version 2>/dev/null || true)"
  if [[ -n "$rv" && "$lv" == "$rv" ]]; then
    echo "Skip $p (already on npm at $lv)"
    continue
  fi
  if [[ -n "$rv" && "$(printf '%s\n' "$rv" "$lv" | sort -V | head -n1)" == "$lv" && "$lv" != "$rv" ]]; then
    echo "Refusing $p: local version $lv is older than npm $rv" >&2
    exit 1
  fi
  echo "Publishing $p @ $lv ..."
  npm publish -w "$p" --access public
done

echo "Done."
