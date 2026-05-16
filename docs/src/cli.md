# CLI Reference

## Usage

All commands support the following shared flags/options:

- `--project <path>`: override where the project root is. Defaults to `.tasks` (also overridable via `TASKDB_PROJECT_PATH`).
- `--help`: show command usage, flags, and options.

Many commands, where relevant, also support `--format <output-format>`. This defaults to `plain`.

Valid formats:

- `quiet` - no non-error output
- `plain` - plain text CLI output
- `json` - structured JSON output

## Task identifiers

Many commands accept a `<task-identifier>`. This can be:

- The integer `id` of the task (with or without zero-padding)
- The full basename (`<integer>-<slug>`) of the task
- A path fragment (`<NNNNN>/<NNNNN>-<slug>.md`) of the task
  - with or without the status subdirectory
  - with or without the project root

## Commands

### `init`
Create `taskdb` directory structure.

```bash
taskdb init [--format quiet|plain|json]
```

### `create <title>`
Create a task.

```bash
taskdb create "Title" [--description <text>] [--status <status>] [--labels <json>] [--format quiet|plain|json]
```

### `update <task-identifier>`
Update title, description, status, or labels.

```bash
taskdb update <task-identifier> [--title <text>] [--description <text>] [--status <status>] [--labels <json>] [--format quiet|plain|json]
```

### `view <task-identifier>`
View a task.

```bash
taskdb view <task-identifier> [--format plain|raw|json]
```

### `complete <task-identifier>`
Move task to `complete` status.

```bash
taskdb complete <task-identifier> [--format quiet|plain|json]
```

### `delete <task-identifier>`
Permanently delete task and symlinks.

```bash
taskdb delete <task-identifier> [--format quiet|plain|json]
```

### `comment <task-identifier> <comment>`
Append a task comment.

```bash
taskdb comment <task-identifier> "comment text" [--format quiet|plain|json]
```

### `list`
List tasks, optionally filtered.

```bash
taskdb list [--status <status>] [--labels <json>] [--updated-before <date>] [--updated-after <date>] [--format plain|json]
```

### `search <query>`
Full-text search task files (`rg` preferred, `grep` fallback).

```bash
taskdb search "query" [--format plain|json]
```
