# `src/models/project.ts` (`Project`)

Represents a `taskdb` project root (`.tasks`) and manages filesystem/status operations.

## Types

### `ListFilter`

- `status?: string`
- `labels?: string[]`
- `updatedBefore?: Date`
- `updatedAfter?: Date`

Used by `listTasks`.

## Constructor

### `new Project({ path })`

- `path: string` absolute project path.

## Directory/status lifecycle

### `scaffold(): Promise<void>`

Creates grouped root directories for:

- `ALL_TASKS_DIR`
- `COMPLETE_TASKS_DIR`
- each entry in `DEFAULT_STATUSES`

### `isInitialized(): Promise<boolean>`

Returns true if canonical tasks directory exists.

### `getStatusDirs(): Promise<string[]>`

Lists project subdirs treated as status directories (directories not in `NON_STATUS_DIRS`).

### `ensureStatusDir(status: string, groupDir: string): Promise<boolean>`

Ensures `<status>/<groupDir>` exists. Returns `true` when the status directory is new.

## Task ID and symlink operations

### `maxTaskId(): Promise<number>`

Scans canonical task files and returns max numeric task id, or `0` if none.

### `createStatusSymlink(status: string, id: number, filename: string): Promise<void>`

Creates status symlink pointing to canonical task file.

### `removeStatusSymlink(status: string, id: number, filename: string): Promise<void>`

Removes status symlink; ignores missing link.

### `getTaskStatus(id: number, filename: string): Promise<string | null>`

Finds which status directory currently contains the symlink.

### `transitionStatus(task: Task, newStatus: string, warn?: OutputFn): Promise<void>`

Moves task symlink to `newStatus`, optionally warning when status dir is newly introduced.
Also updates `task.status` in memory.

## Task resolution and listing

### `resolveTask(identifier: string): Promise<Task | null>`

Supports:

- numeric id (`1`, `00001`)
- basename (`00001-my-task`)
- path fragment (`00000/00001-my-task.md`)

### `findTaskById(id: number): Promise<Task | null>`

Finds task by numeric id in canonical storage and hydrates `Task`.

### `listTasks(filters?: ListFilter): Promise<Task[]>`

Returns tasks sorted by id asc.

- If `filters.status` is set, scans that status directory.
- Always reads canonical files from `ALL_TASKS_DIR`.
- Applies label + updated-before/after filters.

## Search

### `_isRipgrepAvailable(): Promise<boolean>`

Checks if `rg` is available on PATH.

### `searchTasks(query: string): Promise<Task[]>`

Full-text search over task files:

- `rg -l` when available
- fallback: `grep -rl`

Returns hydrated tasks sorted by id asc.

## High-level mutations

### `createTask(title: string, description = "", status = "ready", labels: string[] = [], warn?: OutputFn): Promise<Task>`

Creates task with next id, writes canonical file, and creates status symlink.

### `deleteTask(task: Task): Promise<void>`

Removes all status symlinks and deletes canonical task file.
