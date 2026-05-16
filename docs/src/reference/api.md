# API Overview

This page summarizes internal module boundaries. Detailed API docs are split per source file.

## Entry points

- `taskdb.ts`: executable entrypoint (`#!/usr/bin/env bun`), calls `run(process.argv.slice(2))`.
- `src/cli.ts`: creates Commander program and runs argument parsing.

## CLI layer

- `createProgram(output?)`: builds configured Commander instance and registers commands.
- `run(args, output?)`: runs CLI and returns process-like exit code.

## Command registration

- `src/commands/index.ts`: `registerAllCommands(program, output)`
- Commands: `init`, `create`, `update`, `view`, `complete`, `delete`, `comment`, `list`, `search`.

## Detailed module API docs

- [Constants API (`src/constants.ts`)](./constants.md)
- [Task Model API (`src/models/task.ts`)](./model-task.md)
- [Project Model API (`src/models/project.ts`)](./model-project.md)
- [Datetime Utility API (`src/utils/datetime.ts`)](./util-datetime.md)
- [Env Utility API (`src/utils/env.ts`)](./util-env.md)
- [Slug Utility API (`src/utils/slug.ts`)](./util-slug.md)
