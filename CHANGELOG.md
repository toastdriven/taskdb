# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Project-wide lockfile support via `PROJECT_LOCK_FILE` (`project.lock`).
- `Project.lock()`, `Project.unlock(force?)`, and `Project.isLocked()` APIs.
- Project lock coverage for `Project.createTask()` and `Project.deleteTask()` to serialize critical sections (including ID allocation).
- Per-task lockfile support using `<taskfile>.lock`.
- `Task.lock()`, `Task.unlock(force?)`, and `Task.isLocked()` APIs.
- Per-task lock wrapping for all task-mutating operations: `write`, `create`, `addComment`, `updateTitle`, `updateDescription`, `updateLabels`, and `deleteFile`.
- Unit tests for project/task lock lifecycle, PID ownership checks, forced unlock behavior, and lock cleanup.
- Reference docs updates for constants/model APIs to document locking semantics.

## [v0.9.0] - 2026-05-16

### Added

- Initial public release of `taskdb`.
- Core task lifecycle commands: `init`, `create`, `update`, `view`, `comment`, `complete`, `delete`.
- Task discovery commands: `list` and full-text `search`.
- Flat-file project/task model with symlink-based status directories.
- Multi-format CLI output support (`plain`, `json`, `quiet`).
- Documentation via mdBook.
