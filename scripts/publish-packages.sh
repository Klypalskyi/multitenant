#!/usr/bin/env bash
# Publish @multitenant/* in dependency order. Run from repo root after npm run build.
set -euo pipefail

pkgs=(
  @multitenant/core
  @multitenant/config
  @multitenant/identity
  @multitenant/dev-proxy
  @multitenant/react
  @multitenant/next-app
  @multitenant/next-pages
  @multitenant/express
  @multitenant/nest
  @multitenant/cli
)

for p in "${pkgs[@]}"; do
  echo "Publishing $p ..."
  npm publish -w "$p" --access public
done

echo "Done."
