# https://just.systems/
set dotenv-load := false

@_default:
    just --list

setup:
    bun install

lint:
    bunx tsc --noEmit -p tsconfig.lint.json

format:
    bunx prettier . --write

format-check:
    bunx prettier . --check

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
