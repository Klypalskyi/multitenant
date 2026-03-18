#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

# Require NPM_TOKEN so we can use a project-scoped .npmrc with ${NPM_TOKEN}
if [[ -z "${NPM_TOKEN:-}" ]]; then
  echo "Error: NPM_TOKEN is not set." >&2
  echo "Export NPM_TOKEN to an npm automation/publish token before running this script." >&2
  exit 1
fi

echo "===> Building all workspaces with turbo"
npm run build

echo "===> Verifying clean git status (no uncommitted changes)"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree is not clean. Commit or stash changes before publishing." >&2
  exit 1
fi

PACKAGES=(
  "@multitenant/core"
  "@multitenant/config"
  "@multitenant/identity"
  "@multitenant/dev-proxy"
  "@multitenant/react"
  "@multitenant/next-app"
  "@multitenant/next-pages"
  "@multitenant/express"
  "@multitenant/nest"
  "@multitenant/cli"
)

echo "===> About to publish the following workspaces to npm:"
printf '  - %s\n' "${PACKAGES[@]}"
echo
read -r -p "Continue? [y/N] " REPLY
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
  echo "Aborting."
  exit 1
fi

for pkg in "${PACKAGES[@]}"; do
  echo "===> Publishing $pkg"
  npm publish --workspace "$pkg"
done

echo "===> Done."

