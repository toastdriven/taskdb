# `src/constants.ts`

Shared constants used across `taskdb`, with optional environment-variable overrides.

## Exports

### `DEFAULT_PROJECT_PATH: string`

- Default: `.tasks`
- Env override: `TASKDB_DEFAULT_PROJECT_PATH`
- Used when `--project` is not provided.

### `ALL_TASKS_DIR: string`

- Default: `all`
- Env override: `TASKDB_ALL_TASKS_DIR`
- Canonical task file directory.

### `COMPLETE_TASKS_DIR: string`

- Default: `complete`
- Env override: `TASKDB_DONE_TASKS_DIR`
- Conventional completed-task status directory.

### `DEFAULT_STATUSES: string[]`

- Default: `["ready", "in-progress", "done"]`
- Env override: `TASKDB_DEFAULT_STATUSES` (CSV)
- Parsed via `parseCsvEnv`.

### `NON_STATUS_DIRS: Set<string>`

- Default contents: `ALL_TASKS_DIR`
- Env override: `TASKDB_NON_STATUS_DIRS` (CSV)
- Directories excluded from status detection.

### `DESCRIPTION_HEADER: string`

- Default: `## Description`
- Env override: `TASKDB_DESCRIPTION_HEADER`
- Markdown heading used when serializing/parsing description sections.

### `COMMENTS_HEADER: string`

- Default: `## Task Comments`
- Env override: `TASKDB_COMMENTS_HEADER`
- Markdown heading used when serializing/parsing comments sections.

### `MAX_FILES_PER_DIR: number`

- Value: `32768`
- Used for grouped task directory computation (`Task.groupDir`).

### `PROJECT_LOCK_FILE: string`

- Value: `project.lock`
- Project-wide lockfile name used by `Project.lock` / `Project.unlock` / `Project.isLocked`.
- Resolved relative to project root (`<projectPath>/project.lock`).
