# API Reference

This document covers the internal TypeScript API used by the CLI.

## Entry points

- `taskdb.ts`: executable entrypoint (`#!/usr/bin/env bun`), calls `run(process.argv.slice(2))`.
- `src/cli.ts`: creates Commander program and runs argument parsing.

## CLI layer

### `createProgram(output?)`
Builds configured Commander instance:

- global `--project <path>` option
- `help` command
- registers all subcommands via `registerAllCommands`

### `run(args, output?)`
Runs the CLI and returns numeric exit code.

## Command registration

`src/commands/index.ts` exports `registerAllCommands(program, output)`.

Registered commands:
`init`, `create`, `update`, `view`, `complete`, `delete`, `comment`, `list`, `search`.

## Core models

## `Task` (`src/models/task.ts`)
Represents one task Markdown file.

Key responsibilities:

- ID/filename helpers (`idString`, `idPad`, `groupDir`)
- Markdown/YAML serialization (`buildBody`, `buildFileContent`)
- parsing (`parseBody`, `parseComments`, `read`)
- persistence (`write`, `deleteFile`)
- lifecycle mutations (`create`, `addComment`, `updateTitle`, `updateDescription`, `updateLabels`)

## `Project` (`src/models/project.ts`)
Represents a `.tasks` project root.

Key responsibilities:

- scaffold/init checks (`scaffold`, `isInitialized`)
- status dir handling (`getStatusDirs`, `ensureStatusDir`, `transitionStatus`)
- task resolution (`resolveTask`, `findTaskById`)
- listing/search (`listTasks`, `searchTasks`)
- creation/deletion (`createTask`, `deleteTask`)

## Utility modules

- `src/utils/datetime.ts`: `makeRfc3339(date?)`
- `src/utils/slug.ts`: `toSlug(text)`

## Shared types (`src/types.ts`)

- `OutputFn`
- `OutputFormat`
- `ViewFormat`
- `TaskComment`
