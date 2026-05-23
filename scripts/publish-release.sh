#!/usr/bin/env bash
set -euo pipefail

version="${1:?Usage: ./scripts/publish-release.sh <version>}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$repo_root"

confirm() {
  local prompt="$1"
  local response
  read -r -p "$prompt [y/N] " response
  case "$response" in
    y|Y|yes|YES)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

confirm "Did you bump src/constants.ts VERSION?" || {
  echo "Aborting publish-release."
  exit 1
}

confirm "Did you bump package.json version?" || {
  echo "Aborting publish-release."
  exit 1
}

confirm "Did you update CHANGELOG.md?" || {
  echo "Aborting publish-release."
  exit 1
}

git tag "v${version}"
git push origin --tags
bunx npm login
bun publish --dry-run
bun publish --access public
echo "Go test the binary install, dummy."
