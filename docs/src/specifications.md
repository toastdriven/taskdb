# Specifications

This page defines the behavioral/data contract for taskdb.

## Filestructure Layout

The tasks for a project are stored by convention under `.tasks/` in the current working directory. This can be overridden with either:

- `--project=<path>`
- `TASKDB_PROJECT_PATH`

Within this directory are two mandatory subdirectories:

- `all/`
- `complete/`

The `all/` directory holds **all** task files, grouped into zero-padded subdirectories. Each task gets an auto-incrementing integer ID, zero-padded to preserve lexicographic ordering (`0001` → `0009`, then `0010`).

> This nested layout avoids common filesystem limits around large single-directory file counts (~32,768). By splitting into `<NNNNN>/<NNNNN>-<slug>.md` (for example `00000/00001-initial-setup.md`), taskdb can scale to `32768 * 32768` tasks (over 1 billion).

The `complete/` directory mirrors `all/`, but contains symlinks to completed tasks.

A representative layout:

```text
.tasks/
|   # Required, where all the task files actually live
├── all/
|   └── <NNNNN>/
|       ├── <NNNNN-task-slug>.md
|       ├── <NNNNN-task-slug>.md
|       └── <NNNNN-task-slug>.md
|   # Required, symlinks to all the completed tasks
├── complete/
|   └── <NNNNN>/
|       |   # ... & are just symlinks back to `all/`.
|       └── <NNNNN-task-slug>.md
|   # Task statuses are sibling subdirectories, ...
├── needs-definition/
|   └── <NNNNN>/
|       |   # ... & are just symlinks back to `all/`.
|       └── <NNNNN-task-slug>.md
├── ready/
├── in-progress/
├── on-hold/
├── done/
└── wontfix/
```

Any sibling directory besides `all/` acts as a status directory. These directories are arbitrary and user-definable.

---

## Status Model

Status is **not** stored in task frontmatter.

A task's current status is determined by which status directory contains its symlink. Status transitions remove the old symlink and create a new one in the target status directory.

---

## Task File Format

Each task is a Markdown file with YAML frontmatter for structured metadata.

Required frontmatter fields:

- `id`: zero-padded 10-digit string (auto-incrementing integer ID)
- `slug`: generated from title at creation time; immutable and non-unique
- `title`: human-readable task title
- `labels`: YAML string array (arbitrary tags)
- `created`: RFC 3339 datetime of creation (immutable)
- `updated`: RFC 3339 datetime of last update (changes on every mutation)

The Markdown body contains:

1. `## Description` section (free-form task details)
2. horizontal rule (`---`)
3. `## Task Comments` table with columns `Commented At` and `Comment`

### Example Task File

```markdown
---
id: "0000000001"
slug: "initial-setup"
title: "Initial Setup"
labels: ["feat"]
created: "2026-05-14T18:26:13.246-05:00"
updated: "2026-05-14T18:28:54.123-05:00"
---

## Description

Perform the initial setup steps on the codebase. This includes scaffolding out a `src/` directory, a `tests/` directory, creating all the project files, adding a `.gitignore` & a `README.md`, etc. Also run `git init .`.

---

## Task Comments

| Commented At                  | Comment                                  |
| ----------------------------- | ---------------------------------------- |
| 2026-05-14T18:27:10.246-05:00 | Status changed from ready to in-progress |
```

---

## Task Identifiers

Commands that accept `<task-identifier>` support:

- integer ID (`1` or `00001`)
- full basename (`00001-my-task`)
- path fragment (`00000/00001-my-task.md`), with or without status/project prefix
