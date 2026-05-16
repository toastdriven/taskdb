# Introduction

**`taskdb`** is a zero-config task tracker that lives entirely in plain Markdown files. No database, no server, no account required — just a `.tasks/` folder sitting right inside your project.

It's designed to be fast to pick up, impossible to vendor-lock, and friendly to both humans _and_ LLMs.

---

## Why `taskdb`?

- **Human-readable files:** Every task is a `.md` file with YAML frontmatter. Open it in any editor, read it in any diff tool, commit it to git.
- **Statuses as directories:** A task's status is determined by which directory holds its symlink — no magic fields, no migrations.
- **LLM-native:** Agents can create, update, comment on, and complete tasks using a dead-simple CLI. Great for planning and tracking work mid-session.
- **Truly zero-config:** Run `taskdb init` once and you're done. No config file needed, though there are plenty of override capabilities built-in w/ environment variables.

---

## Quickstart

### 1. Install

Option A: release binary install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/toastdriven/taskdb/main/scripts/install.sh | bash
```

Option B: global package install

```bash
bun add -g taskdb
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
#1: Write the README - (Ready)
```

### 4. Move it along

```bash
$ taskdb update 1 --status=in-progress
#1: Write the README - (In-progress)

$ taskdb comment 1 "Drafted the installation section"
$ taskdb complete 1
#1: Write the README - (Complete)
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
