# CLI Reference

## Usage

All commands support shared global options:

- `--project <path>`: override project root path (default: `.tasks`, or `TASKDB_PROJECT_PATH`)
- `--help`: show usage and options

Many commands also support `--format <output-format>`.

Valid formats:

- `quiet`: suppress non-error output
- `plain`: human-readable output (terse one-line summaries for most commands; full multi-line details for `view`)
- `json`: machine-readable JSON output

---

## Task identifiers

Commands that accept `<task-identifier>` support:

- integer id (`1`, `00001`)
- basename (`00001-my-task`)
- path fragment (`00000/00001-my-task.md`), with or without project/status prefix

---

## Commands

### `init`
Initialise a project directory structure.

```bash
taskdb init [--format quiet|plain|json]
```

Options:

- `--format <quiet|plain|json>`: output style

Example:

```bash
$ taskdb init
Initialised project at: .tasks
```

---

### `create <title>`
Create a new task.

```bash
taskdb create "Title" [--description <text>] [--status <status>] [--labels <json-array>] [--format quiet|plain|json]
```

Options:

- `--description <text>`: initial description body
- `--status <status>`: initial status directory (default: `ready`)
- `--labels <json-array>`: labels as JSON array string (example: `'["feat","p1"]'`)
- `--format <quiet|plain|json>`: output style

Example:

```bash
$ taskdb create "Write README" --status in-progress --labels='["docs","p1"]'
#1: Write README - (In-progress) - [docs, p1]
```

---

### `update <task-identifier>`
Update one or more task fields.

```bash
taskdb update <task-identifier> [--title <text>] [--description <text>] [--status <status>] [--labels <json-array>] [--format quiet|plain|json]
```

Options:

- `--title <text>`: replace title
- `--description <text>`: replace description body
- `--status <status>`: transition to another status
- `--labels <json-array>`: replace labels with JSON array string
- `--format <quiet|plain|json>`: output style

Example:

```bash
$ taskdb update 1 --status done --labels='["docs"]'
#1: Write README - (Done) - [docs]
```

---

### `view <task-identifier>`
View a task in plain, raw markdown, or JSON format.

```bash
taskdb view <task-identifier> [--format plain|raw|json]
```

Options:

- `--format <plain|raw|json>`:
  - `plain`: full multi-line task details
  - `raw`: markdown file content (frontmatter + body)
  - `json`: serialized task object

Example (`plain`):

```bash
$ taskdb view 1
Id: #1
Title: Write README
Slug: write-readme
Status: done
Labels:  docs
Created: 2026-05-16T10:00:00.000-05:00
Updated: 2026-05-16T10:05:00.000-05:00
Full Path: .tasks/all/00000/00001-write-readme.md
```

---

### `complete <task-identifier>`
Transition a task to `complete` status and append a status-change comment.

```bash
taskdb complete <task-identifier> [--format quiet|plain|json]
```

Options:

- `--format <quiet|plain|json>`: output style

Example:

```bash
$ taskdb complete 1
#1: Write README - (Complete) - [docs]
```

---

### `delete <task-identifier>`
Permanently delete task file and status symlinks.

```bash
taskdb delete <task-identifier> [--format quiet|plain|json]
```

Options:

- `--format <quiet|plain|json>`: output style

Example:

```bash
$ taskdb delete 1
Deleted task [00001] Write README
```

---

### `comment <task-identifier> <comment>`
Append a task comment.

```bash
taskdb comment <task-identifier> "comment text" [--format quiet|plain|json]
```

Options:

- `<comment>`: comment text to append
- `--format <quiet|plain|json>`: output style

Example:

```bash
$ taskdb comment 1 "Added installation notes"
#1: Write README - (In-progress) - [docs]
```

---

### `list`
List tasks, optionally filtered.

```bash
taskdb list [--status <status>] [--labels <json-array>] [--updated-before <date>] [--updated-after <date>] [--format plain|json]
```

Options:

- `--status <status>`: only include tasks in this status
- `--labels <json-array>`: include tasks containing all listed labels
- `--updated-before <date>`: include tasks updated strictly before this date
- `--updated-after <date>`: include tasks updated strictly after this date
- `--format <plain|json>`: output style

Example:

```bash
$ taskdb list --status in-progress
#2: Implement auth - (In-progress) - [feat, backend]
#4: Write README - (In-progress) - [docs]
```

---

### `search <query>`
Full-text search tasks (`rg` preferred, `grep` fallback).

```bash
taskdb search "query" [--format plain|json]
```

Options:

- `<query>`: text to search for in task files
- `--format <plain|json>`: output style

Example:

```bash
$ taskdb search "README"
#4: Write README - (In-progress) - [docs]
```
