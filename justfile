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
    just compile "bun-linux-x64" "./dist/taskdb-linux-x64"
    just compile "bun-linux-arm64" "./dist/taskdb-linux-arm64"
    just compile "bun-darwin-x64" "./dist/taskdb-darwin-x64"
    just compile "bun-darwin-arm64" "./dist/taskdb-darwin-arm64"

@build-docs:
    cd docs && mdbook build

publish-docs branch="gh-pages":
    ./scripts/publish-docs.sh "{{branch}}"

publish-release version:
    echo "Did you bump `VERSION`?"
    echo "Did you bump `package.json`'s `version`?"
    exit 1
    git tag v{{version}}
    git push origin --tags
    bun publish --dry-run
    bun publish --access public
    echo "Go test the binary install, dummy."
