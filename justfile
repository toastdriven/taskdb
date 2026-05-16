# https://just.systems/
set dotenv-load := false

@_default:
    just --list

setup:
    bun install

lint:
    bunx tsc --noEmit -p tsconfig.lint.json

format:
    bunx prettier "**/*.ts" --write

format-check:
    bunx prettier "**/*.ts" --check

@test:
    bun test

compile target="bun-darwin-arm64" out="./dist/taskdb":
    mkdir -p ./dist
    bun build ./taskdb.ts --compile --target {{target}} --outfile {{out}}

compile-all:
    just compile target="bun-linux-x64" out="./dist/taskdb-linux-x64"
    just compile target="bun-linux-arm64" out="./dist/taskdb-linux-arm64"
    just compile target="bun-darwin-x64" out="./dist/taskdb-darwin-x64"
    just compile target="bun-darwin-arm64" out="./dist/taskdb-darwin-arm64"

@build-docs:
    cd docs && mdbook build

publish-docs branch="gh-pages":
    just build-docs
    tmp_dir=$(mktemp -d)
    git worktree add --detach "$tmp_dir" "{{branch}}" || git worktree add -b "{{branch}}" "$tmp_dir"
    rsync -a --delete docs/book/ "$tmp_dir"/
    cd "$tmp_dir"
    if [ -n "$(git status --porcelain)" ]; then git add -A; git commit -m "docs: publish $(date -u +%Y-%m-%dT%H:%M:%SZ)"; git push origin "{{branch}}"; else echo "No docs changes to publish."; fi
    cd - >/dev/null
    git worktree remove "$tmp_dir" --force
