import { lstat, mkdir, readdir, symlink, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  ALL_TASKS_DIR,
  COMPLETE_TASKS_DIR,
  DEFAULT_STATUSES,
  NON_STATUS_DIRS,
} from "../constants.ts";
import type { OutputFn } from "../types.ts";
import { toSlug } from "../utils/slug.ts";
import { Task } from "./task.ts";

/**
 * Filter options accepted by {@link Project.listTasks}.
 */
export interface ListFilter {
  /** Only include tasks currently in this status directory. */
  status?: string;
  /** Only include tasks containing all provided labels. */
  labels?: string[];
  /** Only include tasks updated strictly before this timestamp. */
  updatedBefore?: Date;
  /** Only include tasks updated strictly after this timestamp. */
  updatedAfter?: Date;
}

interface ProjectParams {
  /** Absolute path to the project directory (e.g. `/…/.tasks`). */
  path: string;
}

/**
 * Domain model representing a taskdb project root (`.tasks/`).
 *
 * Handles filesystem layout, symlink-based status transitions, and task lookup.
 */
export class Project {
  /** Absolute path to the project root directory. */
  path: string;

  /**
   * Create a project model bound to a filesystem path.
   *
   * @param params Project constructor params.
   */
  constructor(params: ProjectParams) {
    this.path = params.path;
  }

  // ── Scaffold ─────────────────────────────────────────────────────────────────

  /**
   * Create the initial directory structure:
   * - `<ALL_TASKS_DIR>/00000/`
   * - `<COMPLETE_TASKS_DIR>/00000/`
   * - one directory per default status (`<status>/00000/`)
   */
  async scaffold(): Promise<void> {
    const dirs = [ALL_TASKS_DIR, COMPLETE_TASKS_DIR, ...DEFAULT_STATUSES];
    for (const dir of dirs) {
      await mkdir(join(this.path, dir, "00000"), { recursive: true });
    }
  }

  /**
   * Returns whether the project appears initialized.
   *
   * A project is considered initialized once the canonical tasks directory exists.
   *
   * @returns `true` when `<project>/<ALL_TASKS_DIR>` exists, otherwise `false`.
   */
  async isInitialized(): Promise<boolean> {
    try {
      await lstat(join(this.path, ALL_TASKS_DIR));
      return true;
    } catch {
      return false;
    }
  }

  // ── Status directory helpers ──────────────────────────────────────────────────

  /**
   * List current status directories under the project root.
   *
   * Any directory that is not in {@link NON_STATUS_DIRS} is treated as a status directory.
   *
   * @returns Directory names for known statuses.
   */
  async getStatusDirs(): Promise<string[]> {
    try {
      const entries = await readdir(this.path, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && !NON_STATUS_DIRS.has(e.name))
        .map((e) => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Ensure `<status>/<groupDir>/` exists.
   * Returns `true` if this status is new (not a known status directory yet).
   */
  async ensureStatusDir(status: string, groupDir: string): Promise<boolean> {
    const existing = await this.getStatusDirs();
    const isNew = !existing.includes(status);
    await mkdir(join(this.path, status, groupDir), { recursive: true });
    return isNew;
  }

  // ── Max task ID ───────────────────────────────────────────────────────────────

  /**
   * The highest task id currently stored in `all/`, or `0` if there are no tasks.
   * Use `maxTaskId() + 1` to get the next id.
   */
  async maxTaskId(): Promise<number> {
    const glob = new Bun.Glob("*/*.md");
    let max = 0;
    try {
      for await (const file of glob.scan({
        cwd: join(this.path, ALL_TASKS_DIR),
        followSymlinks: false,
      })) {
        const basename = file.split("/").pop() ?? "";
        const id = parseInt(basename, 10);
        if (!isNaN(id) && id > max) max = id;
      }
    } catch {
      // all/ doesn't exist yet
    }
    return max;
  }

  // ── Symlink management ────────────────────────────────────────────────────────

  /**
   * Create a symlink at `<projectPath>/<status>/<groupDir>/<filename>`
   * pointing to `../../all/<groupDir>/<filename>` (relative path for portability).
   */
  async createStatusSymlink(
    status: string,
    id: number,
    filename: string,
  ): Promise<void> {
    const groupDir = Task.groupDir(id);
    await mkdir(join(this.path, status, groupDir), { recursive: true });
    const symlinkPath = join(this.path, status, groupDir, filename);
    const target = join("..", "..", ALL_TASKS_DIR, groupDir, filename);
    await symlink(target, symlinkPath);
  }

  /**
   * Remove the symlink at `<projectPath>/<status>/<groupDir>/<filename>`.
   * Silently ignores a missing symlink.
   */
  async removeStatusSymlink(
    status: string,
    id: number,
    filename: string,
  ): Promise<void> {
    const groupDir = Task.groupDir(id);
    const symlinkPath = join(this.path, status, groupDir, filename);
    try {
      await unlink(symlinkPath);
    } catch {
      // Ignore if already gone
    }
  }

  /**
   * Scan all status directories to find which one currently holds a symlink
   * for the given task. Returns the directory name, or `null` if not found.
   */
  async getTaskStatus(id: number, filename: string): Promise<string | null> {
    const statusDirs = await this.getStatusDirs();
    const groupDir = Task.groupDir(id);
    for (const dir of statusDirs) {
      const symlinkPath = join(this.path, dir, groupDir, filename);
      try {
        await lstat(symlinkPath);
        return dir;
      } catch {
        // Not in this directory
      }
    }
    return null;
  }

  /**
   * Move a task from its current status directory to `newStatus`:
   * 1. Removes the symlink from the old status dir.
   * 2. Creates a symlink in the new status dir.
   * 3. If `newStatus` is a new (previously unknown) directory, calls `warn` if provided.
   *
   * Also updates the task's `.status` field in memory.
   */
  async transitionStatus(
    task: Task,
    newStatus: string,
    warn?: OutputFn,
  ): Promise<void> {
    const isNew = await this.ensureStatusDir(newStatus, Task.groupDir(task.id));
    if (isNew && warn) {
      warn(
        `Warning: "${newStatus}" is a new status directory (not previously known).`,
      );
    }

    const oldStatus =
      task.status ?? (await this.getTaskStatus(task.id, task.filename));
    if (oldStatus && oldStatus !== newStatus) {
      await this.removeStatusSymlink(oldStatus, task.id, task.filename);
    }
    await this.createStatusSymlink(newStatus, task.id, task.filename);
    task.status = newStatus;
  }

  // ── Task resolution ───────────────────────────────────────────────────────────

  /**
   * Resolve a task identifier to a `Task` instance, or `null` if not found.
   *
   * Supported identifier formats (all following the README spec):
   * - `"1"` or `"00001"` — numeric or zero-padded integer id
   * - `"00001-my-task"` — full basename (without `.md`)
   * - `"00000/00001-my-task.md"` — path fragment (with or without status/project prefix)
   */
  async resolveTask(identifier: string): Promise<Task | null> {
    let normalized = identifier.trim();

    // Strip project root prefix if present
    if (normalized.startsWith(this.path)) {
      normalized = normalized.slice(this.path.length).replace(/^\/+/, "");
    }

    let id: number | null = null;

    // Case 1: pure integer (with or without zero-padding)
    if (/^\d+$/.test(normalized)) {
      id = parseInt(normalized, 10);
    } else {
      // Case 2 & 3: extract leading digits from the basename
      const basename = normalized.split("/").pop()?.replace(/\.md$/, "") ?? "";
      const match = basename.match(/^(\d+)/);
      const idText = match?.[1];
      if (idText) {
        id = parseInt(idText, 10);
      }
    }

    if (id === null || id <= 0) return null;
    return this.findTaskById(id);
  }

  /**
   * Locate a task file by numeric id and hydrate a {@link Task}.
   *
   * @param id Integer task id.
   * @returns The hydrated task when found, otherwise `null`.
   */
  async findTaskById(id: number): Promise<Task | null> {
    const groupDir = Task.groupDir(id);
    const prefix = Task.idPad(id);
    const glob = new Bun.Glob(`${prefix}-*.md`);
    try {
      for await (const filename of glob.scan({
        cwd: join(this.path, ALL_TASKS_DIR, groupDir),
        followSymlinks: false,
      })) {
        const filePath = join(this.path, ALL_TASKS_DIR, groupDir, filename);
        const status = (await this.getTaskStatus(id, filename)) ?? undefined;
        return Task.read(filePath, this.path, status);
      }
    } catch {
      // Group directory doesn't exist
    }
    return null;
  }

  // ── Listing & search ──────────────────────────────────────────────────────────

  /**
   * Return all tasks matching the provided filters, sorted by id ascending.
   *
   * When `filters.status` is set, only tasks in that status directory are returned.
   * Otherwise all tasks in `all/` are scanned.
   */
  async listTasks(filters: ListFilter = {}): Promise<Task[]> {
    const tasks: Task[] = [];
    const baseDir = filters.status
      ? join(this.path, filters.status)
      : join(this.path, ALL_TASKS_DIR);

    const glob = new Bun.Glob("*/*.md");
    try {
      for await (const file of glob.scan({
        cwd: baseDir,
        followSymlinks: true,
      })) {
        const filename = file.split("/").pop() ?? "";
        const id = parseInt(filename, 10);
        if (isNaN(id) || id <= 0) continue;

        // Always read from `all/` (the canonical source), even when filtering by status
        const realPath = join(
          this.path,
          ALL_TASKS_DIR,
          Task.groupDir(id),
          filename,
        );

        let task: Task;
        try {
          const status =
            filters.status ??
            (await this.getTaskStatus(id, filename)) ??
            undefined;
          task = await Task.read(realPath, this.path, status);
        } catch {
          continue;
        }

        // Label filter: all requested labels must be present
        if (filters.labels && filters.labels.length > 0) {
          if (!filters.labels.every((l) => task.labels.includes(l))) continue;
        }

        // Date filters
        if (filters.updatedBefore) {
          if (new Date(task.updated) >= filters.updatedBefore) continue;
        }
        if (filters.updatedAfter) {
          if (new Date(task.updated) <= filters.updatedAfter) continue;
        }

        tasks.push(task);
      }
    } catch {
      // Directory doesn't exist (e.g. unknown status filter)
    }

    tasks.sort((a, b) => a.id - b.id);
    return tasks;
  }

  /**
   * Returns `true` when `rg` (ripgrep) is found on `$PATH`.
   *
   * Extracted as an overridable instance method so tests can spy on it
   * and exercise both the rg and grep code-paths without needing to
   * actually install/uninstall ripgrep.
   */
  async _isRipgrepAvailable(): Promise<boolean> {
    const result = await Bun.$`which rg`.quiet().nothrow();
    return result.exitCode === 0;
  }

  /**
   * Full-text search across all task files.
   *
   * Uses `rg -l` when ripgrep is available on PATH; falls back to
   * `grep -rl` otherwise.  Returns tasks whose file content matches
   * `query`, sorted by id ascending.
   */
  async searchTasks(query: string): Promise<Task[]> {
    const allDir = join(this.path, ALL_TASKS_DIR);

    const useRg = await this._isRipgrepAvailable();
    let result = useRg
      ? await Bun.$`rg -l ${query} ${allDir}`.quiet().nothrow()
      : await Bun.$`grep -rl ${query} ${allDir}`.quiet().nothrow();

    // If rg was selected but fails at runtime (e.g. missing binary on CI),
    // fall back to grep.
    if (useRg && result.exitCode !== 0) {
      result = await Bun.$`grep -rl ${query} ${allDir}`.quiet().nothrow();
    }

    const files = result.stdout
      .toString()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const tasks: Task[] = [];
    for (const file of files) {
      const filename = file.split("/").pop() ?? "";
      const id = parseInt(filename, 10);
      if (isNaN(id) || id <= 0) continue;
      try {
        const status = (await this.getTaskStatus(id, filename)) ?? undefined;
        const task = await Task.read(file, this.path, status);
        tasks.push(task);
      } catch {
        continue;
      }
    }

    tasks.sort((a, b) => a.id - b.id);
    return tasks;
  }

  // ── High-level task operations ────────────────────────────────────────────────

  /**
   * Create a new task with the next auto-incremented id:
   * 1. Determine the next id.
   * 2. Write the task file into `all/`.
   * 3. Create a symlink in `<status>/` (default: `"ready"`).
   *
   * @param warn  Optional function called if `status` is a new/unknown directory.
   */
  async createTask(
    title: string,
    description: string = "",
    status: string = "ready",
    labels: string[] = [],
    warn?: OutputFn,
  ): Promise<Task> {
    const nextId = (await this.maxTaskId()) + 1;
    const slug = toSlug(title);

    const task = new Task({
      id: nextId,
      slug,
      title,
      labels,
      created: "",
      updated: "",
      description,
      comments: [],
      projectPath: this.path,
      status,
    });

    await task.create(); // stamps created/updated and writes the file

    const isNew = await this.ensureStatusDir(status, Task.groupDir(task.id));
    if (isNew && warn) {
      warn(
        `Warning: "${status}" is a new status directory (not previously known).`,
      );
    }
    await this.createStatusSymlink(status, task.id, task.filename);

    return task;
  }

  /**
   * Permanently delete a task.
   *
   * Steps:
   * 1. Remove symlinks from every status directory.
   * 2. Delete the canonical task file from `<ALL_TASKS_DIR>/`.
   *
   * @param task Task instance to delete.
   */
  async deleteTask(task: Task): Promise<void> {
    const statusDirs = await this.getStatusDirs();
    for (const dir of statusDirs) {
      await this.removeStatusSymlink(dir, task.id, task.filename);
    }
    await task.deleteFile();
  }
}
