# `src/models/task.ts` (`Task`)

Represents one canonical task markdown file.

## Constructor

### `new Task(params)`

Creates an in-memory task instance.

`params` fields:

- `id: number`
- `slug: string`
- `title: string`
- `labels: string[]`
- `created: string`
- `updated: string`
- `description: string`
- `comments: TaskComment[]`
- `projectPath: string`
- `status?: string`

## Static helpers

### `Task.idString(id: number): string`

Returns 10-digit id string used in frontmatter (example: `1` -> `0000000001`).

### `Task.idPad(id: number): string`

Returns 5-digit id string used in filenames/group paths (example: `1` -> `00001`).

### `Task.groupDir(id: number): string`

Returns group directory name by bucket (`Math.floor((id - 1) / MAX_FILES_PER_DIR)`, zero-padded to 5).

### `Task.buildCommentsSeparator(): string`

Returns computed markdown separator between description/comments:

```text
\n---\n\n${COMMENTS_HEADER}\n\n
```

### `Task.parseBody(content: string): { description: string; comments: TaskComment[] }`

Parses markdown body (post-frontmatter) into normalized description + comments.

### `Task.parseComments(tableText: string): TaskComment[]`

Parses comments markdown table rows into `TaskComment[]`.

### `Task.read(filePath: string, projectPath: string, status?: string): Promise<Task>`

Reads markdown file, parses frontmatter/body, and returns hydrated `Task`.

## Instance properties/getters

### `filename: string` (getter)

`<idPad>-<slug>.md`

### `filePath: string` (getter)

Absolute path: `<projectPath>/<ALL_TASKS_DIR>/<groupDir>/<filename>`.

### `groupDirPath: string` (getter)

Absolute group directory path for this task.

### `lockFilePath: string` (getter)

Absolute task lockfile path (`<taskfile>.lock`, colocated with canonical task file).

## Locking methods

### `lock(): Promise<void>`

Acquires per-task lock:

1. creates lockfile atomically (`wx`)
2. writes current `process.pid` into lockfile

Throws when lock already exists or filesystem operations fail.

### `unlock(force = false): Promise<void>`

Releases per-task lock.

Behavior:

- missing lockfile -> no-op
- `force = true` -> remove lockfile regardless of PID
- `force = false` -> remove only when lockfile PID matches current `process.pid`; otherwise throws

### `isLocked(): Promise<boolean>`

Returns whether the task lockfile exists.

## Instance methods

### `buildBody(): string`

Builds markdown body (`Description` section + comments table).

### `buildFileContent(): string`

Builds full file text via `gray-matter.stringify` (frontmatter + body).

### `write(): Promise<void>`

Ensures group dir exists and writes file content.

This method acquires the per-task lock before writing.

### `create(): Promise<void>`

First-write lifecycle:

1. slug from title (`toSlug`)
2. set `created` and `updated` (`makeRfc3339`)
3. write file

This method runs under the per-task lock.

### `addComment(comment: string): Promise<void>`

Appends comment row, bumps `updated`, writes.

This method runs under the per-task lock.

### `updateTitle(title: string): Promise<void>`

Updates title, bumps `updated`, writes.

This method runs under the per-task lock.

### `updateDescription(description: string): Promise<void>`

Updates description, bumps `updated`, writes.

This method runs under the per-task lock.

### `updateLabels(labels: string[]): Promise<void>`

Replaces labels, bumps `updated`, writes.

This method runs under the per-task lock.

### `deleteFile(): Promise<void>`

Deletes canonical task file only (does not remove status symlinks).

This method runs under the per-task lock.

### `toJSON(): object`

Returns plain object for CLI JSON output.
