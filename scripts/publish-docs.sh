#!/usr/bin/env bash
set -euo pipefail

branch="${1:-gh-pages}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$repo_root"

# Build static docs output.
just build-docs

tmp_dir="$(mktemp -d)"
cleanup() {
  git worktree remove "$tmp_dir" --force >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

# Use existing branch if it exists; otherwise create it.
git worktree prune
git worktree add --force "$tmp_dir" "$branch" || git worktree add -B "$branch" "$tmp_dir"

# Sync built docs into publish branch worktree.
rsync -a --delete --exclude='.git' docs/book/ "$tmp_dir"/

cd "$tmp_dir"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "docs: publish $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git push origin "$branch"
else
  echo "No docs changes to publish."
fi
