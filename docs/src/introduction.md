# Introduction

**taskdb** is a zero-config task tracker that lives entirely in plain Markdown files. No database, no server, no account required — just a `.tasks/` folder sitting right inside your project.

It's designed to be fast to pick up, impossible to vendor-lock, and friendly to both humans _and_ LLMs.

---

## Why taskdb?

- **Human-readable files.** Every task is a `.md` file with YAML frontmatter. Open it in any editor, read it in any diff tool, commit it to git.
- **Statuses as directories.** A task's status is determined by which directory holds its symlink — no magic fields, no migrations.
- **LLM-native.** Agents can create, update, comment on, and complete tasks using a dead-simple CLI. Great for planning and tracking work mid-session.
- **Truly zero-config.** Run `taskdb init` once and you're done. No config file needed.

---

## Quickstart

### 1. Install

```bash
# with bun (recommended)
bun add -g @taskdb/cli

# or run directly from source
bun taskdb.ts <command>
```

> See the [Installation](./installation.md) page for full details.

### 2. Initialise a project

Run this once inside your project directory:

```bash
$ taskdb init
Initialised project at: .tasks
```

This creates a `.tasks/` directory with the standard status folders (`ready`, `in-progress`, `done`, `complete`).

### 3. Create your first task

```bash
$ taskdb create "Write the README"
[00001] Write the README (ready)
Created: 2026-05-16T09:00:00.000-05:00
Updated: 2026-05-16T09:00:00.000-05:00
```

### 4. Move it along

```bash
$ taskdb update 1 --status=in-progress
[00001] Write the README (in-progress)
...

$ taskdb comment 1 "Drafted the installation section"
$ taskdb complete 1
[00001] Write the README (complete)
```

### 5. See what's going on

```bash
# list everything
$ taskdb list

# filter by status
$ taskdb list --status=in-progress

# full-text search
$ taskdb search "README"
```

That's the core loop. Head over to the [Guides](./guides/todo-list.md) for more realistic walkthroughs, or jump straight to the [CLI Reference](./cli.md) for every flag and option.
