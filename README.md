# taskdb

A task tracker CLI, powered by (human-readable) flatfiles.

Ideal for:
* small projects
* personal task tracking
* LLM integration

## Usage

```bash
bun taskdb.ts <command> [options]
```

## Commands

| Command             | Description                    |
|---------------------|--------------------------------|
| `help`              | Show help information          |
| `project create`    | Create a new project           |
| `project view`      | View project details           |
| `project status`    | Change project status          |
| `project delete`    | Delete a project               |
| `task create`       | Create a task _(coming soon)_  |
| `task update`       | Update a task _(coming soon)_  |
| `task status`       | Change task status _(coming soon)_ |
| `task delete`       | Delete a task _(coming soon)_  |

## Data Layout

Projects are stored under `.tasks/` in the current working directory:

```
.tasks/
└── <project-slug>/
    ├── metadata.json
    └── tasks/
        └── <NNNNN-task-slug>.toml
```

## Task File Format

Each task is stored as a TOML file with Markdown content fields:

```toml
name = "Implement Method A"
label = "feat"
status = "in-progress"
description = """
## Problem

Describe the problem here.

## Solution

Describe the solution here.
"""

[metadata]
number = 2
slug = "implement-method-a"
created = "2026-05-14T18:26:13.246-05:00"
updated = "2026-05-14T18:28:54.123-05:00"

[[updates]]
created = "2026-05-14T18:27:10.246-05:00"
comment = "Status changed from ready to in-progress"
```

**Valid labels:** `feat` · `chore` · `bug` · `docs` · `research` · `other`

**Valid statuses:** `needs-definition` · `ready` · `in-progress` · `blocked` · `on-hold` · `done` · `wontfix`

## Development

```bash
bun install       # install dependencies
bun test          # run tests
bun taskdb.ts     # run the CLI
```

## Dependencies

| Package | Purpose |
|---------|---------|
| [commander](https://tj.github.io/commander.js/) | CLI argument parsing & subcommands |
| [smol-toml](https://github.com/squirrelchat/smol-toml) | TOML parsing & serialization for task files |

## Author

Daniel Lindsley

## License

New BSD
