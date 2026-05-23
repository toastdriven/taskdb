
# taskdb — Agent Notes

## Project Overview

`taskdb` is a flatfile-powered task tracker implemented as a CLI application.
The entry point is `taskdb.ts` (shebang: `#!/usr/bin/env bun`), run with `bun taskdb.ts`.

### Data Layout

All data lives in `.tasks/` in the current working directory (overridable via `--project=<path>` or `TASKDB_PROJECT_PATH` env var):

```
.tasks/
├── all/                          # Every task file lives here
│   └── <NNNNN>/                  # Group dir: floor((id-1) / 32768), zero-padded 5 digits
│       └── <NNNNN>-<slug>.md     # Task file: id zero-padded 5 digits + slug
├── complete/                     # Required: symlinks to all completed tasks
│   └── <NNNNN>/
│       └── <NNNNN>-<slug>.md    # symlink → ../../all/<NNNNN>/<NNNNN>-<slug>.md
├── ready/                        # Conventional status dirs (arbitrary, user-definable)
├── in-progress/
└── done/
```

Status directories (everything except `all/`) contain **symlinks** back to the real file in `all/`. A task's current status is determined by which status directory holds its symlink — there is no `status` field in the task file itself.

### Task File Format

Markdown with YAML frontmatter (parsed via `gray-matter`):

```markdown
---
id: '0000000001'       # 10-digit zero-padded string
slug: 'initial-setup'  # immutable after creation
title: 'Initial Setup'
labels: ['feat']
created: '2026-05-14T18:26:13.246-05:00'
updated: '2026-05-14T18:28:54.123-05:00'
---

## Description

Prose description here.

---

## Task Comments

| Commented At                  | Comment                                  |
| ----------------------------- | ---------------------------------------- |
| 2026-05-14T18:27:10.246-05:00 | Status changed from ready to in-progress |
```

### Source Layout

```
taskdb.ts           # executable CLI entry point (shebang)
index.ts            # package/module entrypoint
src/
  cli.ts            # Commander program factory / run(args)
  constants.ts      # shared constants + env overrides
  types.ts          # OutputFn, TaskComment, OutputFormat, etc.
  commands/
    index.ts        # registerAllCommands() — wires all Commander subcommands
    *.ts            # per-command handlers (init/create/update/view/…)
    helpers.ts      # shared output/lookup/parse helpers
  models/
    project.ts      # Project class — filesystem ops, symlink mgmt, task CRUD
    task.ts         # Task class — read/write Markdown+YAML, comments
  utils/
    datetime.ts     # makeRfc3339(date?)
    env.ts          # parseCsvEnv(...)
    slug.ts         # toSlug(...)
    strings.ts      # capitalizeFirst(...)
tests/
  cli.test.ts                 # CLI smoke coverage
  commands/                   # command-handler level tests
    helpers.test.ts
    init-create-update-view.test.ts
    comment-complete-delete.test.ts
    list-search.test.ts
  models/
    task.test.ts
    project.test.ts
  utils/
    datetime.test.ts
    env.test.ts
    slug.test.ts
    strings.test.ts
```

### Supported Commands

| Command | Description |
|---------|-------------|
| `taskdb init` | Scaffold the `.tasks/` directory structure |
| `taskdb create "<title>"` | Create a new task |
| `taskdb update <task-identifier>` | Update task fields |
| `taskdb view <task-identifier>` | View a task |
| `taskdb complete <task-identifier>` | Mark task as complete (moves to `complete/` status) |
| `taskdb delete <task-identifier>` | Permanently delete a task |
| `taskdb comment <task-identifier> "<text>"` | Append a comment to a task |
| `taskdb list` | List tasks with optional filters |
| `taskdb search "<text>"` | Full-text search via `rg` |

All commands accept `--project=<path>` (global) and most accept `--format=(quiet|plain|json)`.

### Output Format Behavior

Current CLI output conventions:

- `plain`:
  - most mutating/list/search commands use terse one-line output:
    - `#<id>: <title> - (<Status>) - [label1, label2]`
  - `view --format plain` uses full multi-line task detail output
- `json`: structured JSON output (`task.toJSON()` / array of `toJSON()` objects)
- `quiet`: suppresses non-error output

### Locking Model

Two lock layers now exist:

- **Project lock** (`<projectPath>/project.lock` via `PROJECT_LOCK_FILE`):
  - Used in `Project.createTask` and `Project.deleteTask`.
  - Purpose: serialize project-wide critical sections, especially next-ID allocation.
  - API: `Project.lock()`, `Project.unlock(force=false)`, `Project.isLocked()`.
  - `unlock()` is a no-op if missing; PID must match unless `force=true`.

- **Per-task lock** (`<task-file>.lock`):
  - Used around all task-mutating operations:
    - `write`, `create`, `addComment`, `updateTitle`, `updateDescription`, `updateLabels`, `deleteFile`.
  - API: `Task.lock()`, `Task.unlock(force=false)`, `Task.isLocked()`.
  - Same PID ownership semantics as project lock.

Implementation notes:

- Locks are acquired via atomic lockfile creation (`writeFile(..., { flag: "wx" })`) then PID write.
- Mutating flows release locks in `finally` using `unlock(true)` to avoid stale lockfiles on failure.
- Read paths (`view`, `list`, `search`, `Task.read`) remain lock-free.

### Task Identifier Formats

Commands accepting `<task-identifier>` support:
- Integer id: `1` or `00001`
- Full basename: `00001-my-task` (without `.md`)
- Path fragment: `00000/00001-my-task.md` (with or without status/project prefix)

### Documentation Layout

`mdBook` source files live in `docs/src/`.

Key pages:
- `introduction.md`
- `installation.md`
- `cli.md`
- `specifications.md`
- `guides/`
- `reference/`
  - module-level API pages (`constants`, `models/*`, `utils/*`)
- `SUMMARY.md`

Build docs with:

```bash
mdbook build docs
```

### Agent Workflow Convention

For multi-step work, prefer dogfooding `taskdb` itself:

1. Create/confirm tasks in `ready`.
2. Move one task to `in-progress` while actively working.
3. Add comments for notable progress/decisions.
4. Mark completed work with `taskdb complete <task-identifier>`.
5. Show the `taskdb` commands and outputs when updating/closing those tasks.

### CLI Framework

Uses [Commander.js](https://tj.github.io/commander.js/).
Import `Command` from `commander`.

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.
- `Bun.Glob` for glob patterns (scan with `{ cwd, followSymlinks }`)

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
