/** Output function signature — defaults to console.log in production, injectable for tests. */
export type OutputFn = (line: string) => void;

// ---------------------------------------------------------------------------
// Project types
// ---------------------------------------------------------------------------

/** Lifecycle status of a project. */
export type ProjectStatus = "ready" | "in-progress" | "blocked" | "on-hold" | "done";

/** All valid ProjectStatus values (useful for runtime validation). */
export const PROJECT_STATUSES: ProjectStatus[] = [
  "ready",
  "in-progress",
  "blocked",
  "on-hold",
  "done",
];

// ---------------------------------------------------------------------------
// Task types
// ---------------------------------------------------------------------------

/** Classification label for a task. */
export type TaskLabel = "feat" | "chore" | "bug" | "docs" | "research" | "other";

/** All valid TaskLabel values (useful for runtime validation). */
export const TASK_LABELS: TaskLabel[] = ["feat", "chore", "bug", "docs", "research", "other"];

/** Lifecycle status of a task. */
export type TaskLifecycleStatus =
  | "needs-definition"
  | "ready"
  | "in-progress"
  | "blocked"
  | "on-hold"
  | "done"
  | "wontfix";

/** All valid TaskLifecycleStatus values (useful for runtime validation). */
export const TASK_LIFECYCLE_STATUSES: TaskLifecycleStatus[] = [
  "needs-definition",
  "ready",
  "in-progress",
  "blocked",
  "on-hold",
  "done",
  "wontfix",
];

/** A single timestamped update/comment on a task. */
export interface TaskUpdate {
  /** RFC 3339 datetime when this update was created. */
  created: string;
  /** Markdown text describing the update. */
  comment: string;
}

/**
 * Lightweight reference to a task stored in project metadata.
 * The full Task class (with file content) is not yet implemented;
 * this acts as a summary row in the project's task list.
 */
export interface TaskStatus {
  /** Sequential task number (1-based, zero-padded in filenames). */
  number: number;
  /** Filename-safe slug, e.g. "00001-fix-the-bug". */
  slug: string;
  /** Human-readable task name. */
  name: string;
  /** Current status string (e.g. "open", "done"). */
  status: string;
}
