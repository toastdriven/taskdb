# Specifications

This page defines the behavioral/data contract for `taskdb`.

## Filestructure Layout

The tasks for the project are stored by convention under `.tasks/` in the _current working directory_. This is overridable using either the `--project=...` or `TASKDB_PROJECT_PATH` environment variable to specify a different path.

Within this directory are two mandatory subdirectories: `all` & `complete`.

The `all` directory holds **all** of the task files within set of zero-padded subdirectories. Each task file gets an auto-incrementing/unique integer, which is zero-padded to retain ordering under normal lexicographical conditions (e.g. `0001` -> `0009`, _then_ `0010`).

> **Note:** This structure of nested subdirectories was chosen due to common filesystem limitations, preventing more than ~32,768 files in a single directory. By computing the integer, splitting up the numbering across multiple subdirectories (`<NNNNN>/<NNNNN>-<slug>.md`, e.g. `00000/00001-initial-setup.md`), this allows for `32768 * 32768`, or over **1 BILLION** tasks.
>
> If you need more than 1B tasks for a single project, you may want to investigate a different solution...

The `complete` directory holds **symlinks** to **all** of the completed task files. It mirrors the `all` layout/filepaths.

The filestructure layout ends up looking like:

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

Other subdirectories live alongside `all`/`complete`, and make up task **statuses**. These status subdirectories have an identical internal structure to the `all/` directory. Inside each are symlinks back to the task file's original location in `all/`.

Status directory names are arbitrary. You can rename these directories, remove them, or add others. In this way, `taskdb` adapts to your desired set of statuses without code changes/configuration.

---

## Status Model

Status is **not** stored in task frontmatter.

A task's current status is determined by which status directory contains its symlink. Status transitions remove the old symlink and create a new one in the target status directory.

---

## Task File Format

Each task is stored as a Markdown file, with [YAML frontmatter](https://www.markdownlang.com/advanced/frontmatter.html) fields for structured metadata.

Required frontmatter fields:

- `id` - The task id. Integer, but expressed as a zero-padded string, for easy splitting. Auto-incrementing & unique.
- `slug` - The slug is computed from the `title` **one-time** (at creation). It's immutable, & is **non-unique**.
- `title` - The human-readable task title. What needs to be done.
- `labels` - A YAML array of string labels/tags (e.g. `['feat']`, or `['chore', 'easy']`). Can be empty. Labels are arbitrary.
- `created` - An RFC 3339-formatted datetime string of when the task was created. Computed one-time (at creation) & immutable.
- `updated` - An RFC 3339-formatted datetime string of when the task was last updated. Computed **every time** there's an update made to the task.

The Markdown body contains:

1. `## Description` section (free-form task details)
2. horizontal rule (`---`)
3. `## Task Comments` table with columns `Commented At` and `Comment`

### Example Task File

For example, the first task of a project (e.g. _"Initial Setup"_) would live at `.tasks/all/00000/00001-initial-setup.md`, & might look like:

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

## Slug Generation

Task slugs are generated from the task title at creation time, then treated as immutable.

Rules (in order):

1. Trim surrounding whitespace.
2. Lowercase the string.
3. Remove any character that is not `a-z`, `0-9`, whitespace, or `-`.
4. Replace runs of whitespace with a single `-`.
5. Collapse repeated hyphens (`---` → `-`).
6. Remove leading/trailing hyphens.

Examples:

- `"My Cool Project!"` → `"my-cool-project"`
- `"  Hello   World  "` → `"hello-world"`

Notes:

- Slugs are **not unique**; task identity comes from the numeric `id`.
- Updating a task title does **not** change its slug or filename.

---

## Task Identifiers

Commands that accept `<task-identifier>` support:

- integer ID (`1` or `00001`)
- full basename (`00001-my-task`)
- path fragment (`00000/00001-my-task.md`), with or without status/project prefix
