# taskdb

A zero-config task tracker CLI, powered by human-readable & machine-friendly Markdown files.

Ideal for:

- personal task tracking
- LLM integration
- small projects

---

## Why taskdb?

- **Human-readable files:** Every task is a `.md` file with YAML frontmatter. Open it in any editor, read it in any diff tool, commit it to git.
- **Statuses as directories:** A task's status is determined by which directory holds its symlink — no magic fields, no migrations.
- **LLM-native:** Agents can create, update, comment on, and complete tasks using a dead-simple CLI. Great for planning and tracking work mid-session.
- **Truly zero-config:** Run `taskdb init` once and you're done. No config file needed, though there are plenty of override capabilities built-in w/ environment variables.

---

## Quickstart

```bash
# One-time, at the beginning of tracking.
$ taskdb init
Initialised project at: .tasks

# Create your first task. You get back the task id & a quick view of the created task.
$ taskdb create "Write the README"
\#1: Write the README (ready)

# You can view the whole task.
$ taskdb view 1

# You can get a list of all your tasks, filter them, & search through them.
$ taskdb list
$ taskdb list --status="ready"
$ taskdb search "README"

# Make updates & change status.
$ taskdb update 1 --description="Flesh out the README.md file" --status="in-progress"
\#1: Write the README (in-progress)

# Make comments.
$ taskdb comment 1 "Drafted the installation section"

# And complete tasks when you're done.
$ taskdb complete 1
\#1: Write the README (complete)
```

---

### Install

Option A: release binary install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/toastdriven/taskdb/main/scripts/install.sh | bash
```

Option B: global package install

```bash
bun add -g taskdb
```

See the [Installation](./docs/src/installation.md) documentation for full details.

---

## Usage

All commands support the following shared flags/options:

- `--project=</path/to/project>`: For overriding where the project root is. This defaults to `.tasks` (also overridable via `TASKDB_PROJECT_PATH` environment variable).
- `--help`: An explanation of what the subcommand does, what flags/options it accepts, etc.

Many commands accept a `<task-identifier>`. This can be:

- The integer `id` of the task
  - with or without zero-padding
- The full basename (`<integer>-<slug>`) of the task
- A path fragment (`<NNNNN>/<NNNNN>-<slug>.md`) of the task
  - with or without the status subdirectory
  - with or without the project root

Many commands, where relevant/documented, also support a `--format=<output-format>` flag. This defaults to `plain` (plain-text, typical CLI behavior). Valid options include:

- `quiet` - No **non-error** output
- `plain` - Plain text output
- `json` - The output, structured as JSON

### Available Commands

| Command                                                                                                                                                                      | Purpose                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `taskdb --help`                                                                                                                                                              | Shows help for all subcommands & usage instructions |
| `taskdb init [--format=(quiet|plain|json)]`                                                                                                                                  | Creates the filestructure to support the tasks      |
| `taskdb create "<title>" [--description="..."] [--status=<status>] [--labels="<JSON-string-of-array-of-labels>"] [--format=(quiet|plain|json)]`                              | Creates a new task                                  |
| `taskdb update <task-identifier> [--title="..."] [--description="..."] [--status=<status>] [--labels="<JSON-string-of-array-of-labels>"] [--format=(quiet|plain|json)]`      | Updates an existing task                            |
| `taskdb view <task-identifier> [--format=(plain|raw|json)]`                                                                                                                  | Views an existing task                              |
| `taskdb complete <task-identifier> [--format=(quiet|plain|json)]`                                                                                                            | Marks the task as completed                         |
| `taskdb delete <task-identifier> [--format=(quiet|plain|json)]`                                                                                                              | Deletes a task permanently                          |
| `taskdb comment <task-identifier> "<comment>" [--format=(quiet|plain|json)]`                                                                                                 | Adds a comment to an existing task                  |
| `taskdb list [--status=<status>] [--labels="<JSON-string-of-array-of-labels>"] [--updated-before="<date-string>"] [--updated-after="<date-string>"] [--format=(plain|json)]` | Lists all tasks that match the criteria             |
| `taskdb search "<text>" [--format=(plain|json)]`                                                                                                                             | Lists all tasks for the provided text               |

---

## Development & Running Tests

Requires [Bun](https://bun.com/) & [`just`](https://just.systems/).

```bash
# Install dependencies
$ just setup

# Lint
$ just lint

# Check formatting
$ just format-check

# Format code
$ just format

# Run tests
$ just test

# Build docs
$ just build-docs
```

---

## Dependencies

`taskdb` is designed to be relatively lightweight, & to use few dependencies. That said, we do lean on the following libraries at run-time:

| Package                                                     | Purpose                                |
| ----------------------------------------------------------- | -------------------------------------- |
| [commander](https://tj.github.io/commander.js/)             | CLI argument parsing & subcommands     |
| [gray-matter](https://github.com/jonschlinkert/gray-matter) | YAML frontmatter handling for Markdown |

---

## Author

Daniel Lindsley

---

## License

New BSD
