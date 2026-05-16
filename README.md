# taskdb

A zero-config task tracker CLI, powered by (human-readable) flatfiles.

Ideal for:
* small projects
* personal task tracking
* LLM integration


## Usage

All commands support the following shared flags/options:

* `--project=</path/to/project>`: For overriding where the project root is. This defaults to `.tasks` (also overridable via `TASKDB_PROJECT_PATH` environment variable).
* `--help`: An explanation of what the subcommand does, what flags/options it accepts, etc.

Many commands accept a `<task-identifier>`. This can be:

* The integer `id` of the task
    * with or without zero-padding
* The full basename (`<integer>-<slug>`) of the task
* A path fragment (`<NNNNN>/<NNNNN>-<slug>.md`) of the task
    * with or without the status subdirectory
    * with or without the project root

Many commands, where relevant/documented, also support a `--format=<output-format>` flag. This defaults to `plain` (plain-text, typical CLI behavior). Valid options include:

* `quiet` - No **non-error** output
* `plain` - Plain text output
* `json` - The output, structured as JSON

### Available Commands

| Command          | Purpose        |
| ---------------- | -------------- |
| `taskdb init [--format=(quiet|plain|json)]`    | Creates the filestructure to support the tasks |
| `taskdb create "<title>" [--description="..."] [--status=<status>] [--format=(quiet|plain|json)]` | Creates a new task |
| `taskdb update <task-identifier> [--title="..."] [--description="..."] [--status=<status>] [--labels="<JSON-string-of-array-of-labels>"] [--format=(quiet|plain|json)]` | Updates an existing task |
| `taskdb view <task-identifier> [--format=(plain|raw|json)]` | Views an existing task |
| `taskdb complete <task-identifier> [--format=(quiet|plain|json)]` | Marks the task as completed |
| `taskdb delete <task-identifier> [--format=(quiet|plain|json)]` | Deletes a task permanently |
| `taskdb comment <task-identifier> "<comment>" [--format=(quiet|plain|json)]` | Adds a comment to an existing task |
| `taskdb list [--status=<status>] [--labels="<JSON-string-of-array-of-labels>"] [--updated-before="<date-string>"] [--updated-after="<date-string>"] [--format=(plain|json)]` | Lists all tasks that match the criteria |
| `taskdb search "<text>" [--format=(plain|json)]` | Lists all tasks for the provided text |


## Specifications

### Filestructure Layout

The tasks for the project are stored by convention under `.tasks/` in the _current working directory_. This is overridable using either the `--project=...` or `TASKDB_PROJECT_PATH` environment variable to specify a different path.

Within this directory are two mandatory subdirectories: `all` & `complete`.

The `all` directory holds **all** of the task files within set of a zero-padded subdirectories. Each task files gets an auto-incrementing/unique integer, which is zero-padded to retain ordering under normal lexicographical conditions (e.g. `0001` -> `0009`, _then_ `0010`).

> **Note:** This structure of nested subdirectories was chosen due to common filesystem limitations, preventing more than ~32,768 files in a single directory. By computing the integer, splitting up the numbering across multiple subdirectories (`<NNNNN>/<NNNNN>-<slug>.md`, e.g. `00000/00001-initial-setup.md`), this allows for `32768 * 32768`, or over **1 BILLION** tasks.
>
> If you need more than 1B tasks for a single project, you may want to investigate a different solution...

The `complete` directory holds **symlinks** to **all** of the completed task files. It mirrors the `all` layout/filepaths.

The filestructure layout ends up looking like:

```
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

Other subdirectories live alongside `all`/`complete`, to create make up the task file **statuses**. These _"status"_ subdirectories have an identical internal structure to the `all/` directory. Inside each are just symlinks back to the task file's original location in `all/`. The "status" subdirectories are also arbitrarily named (with the above included by convention). You can rename these directories, remove them, or add others; in this way, `taskdb` adapts to **any** desired set of statuses _without_ needing any code changes/configuration.


### Task File Format

Each task is stored as a Markdown file, with [YAML frontmatter](https://www.markdownlang.com/advanced/frontmatter.html) fields for the structured metadata. The following frontmatter fields are required:

* `id` - The task id. Integer, but expressed as a zero-padded string, for easy splitting. Auto-incrementing & unique.
* `slug` - The slug is computed from the `title` **one-time** (at creation). It's immutable, & is **non-unique**.
* `title` - The human-readable task title. What needs to be done.
* `labels` - A YAML array of string labels/tags (e.g. `['feat']`, or `['chore', 'easy']`). Can be empty. Labels are arbitrary.
* `created` - An RFC 3339-formatted datetime string of when the task was created. This should be computed one-time (at creation) & be immutable.
* `updated` - An RFC 3339-formatted datetime string of when the task was last updated. This should be computed **every time** there's an update made to the task.

Then, then body of the Markdown file is for the task **description**. If there's any associated information (problem statement, reproduction instructions, acceptance criteria, etc.), it goes here. Normal Markdown structures apply, & are simply by convention.

Finally, there's a horizontal separator that gets auto-added, followed by a `## Task Comments` section. This contains a two-column table (column headers `Commented At` & `Comment`). This is for any comments, status changes, further information, papertrail, etc.

#### Example Task File

For example, the first task of a project (e.g. _"Initial Setup"_) would live at `.tasks/all/00000/00001-initial-setup.md`, & might looks something like:

```markdown
---
id: '0000000001'
slug: 'initial-setup'
title: 'Initial Setup'
labels: ['feat']
created: '2026-05-14T18:26:13.246-05:00'
updated: '2026-05-14T18:28:54.123-05:00'
---

## Description

Perform the initial setup steps on the codebase. This includes scaffolding out a `src/` directory, a `tests/` directory, creating all the project files, adding a `.gitignore` & a `README.md`, etc. Also run `git init .`.

---

## Task Comments

| Commented At                  | Comment                                  |
| ----------------------------- | ---------------------------------------- |
| 2026-05-14T18:27:10.246-05:00 | Status changed from ready to in-progress |
```


## Development & Running Tests

```bash
# Install dependencies
$ bun install

# Run the tests
$ bun test
```


## Dependencies

| Package | Purpose |
|---------|---------|
| [commander](https://tj.github.io/commander.js/) | CLI argument parsing & subcommands |
| [gray-matter](https://github.com/jonschlinkert/gray-matter) | YAML frontmatter handling for Markdown |


## Author

Daniel Lindsley


## License

New BSD
