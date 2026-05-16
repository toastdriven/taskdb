/**
 * Output function signature used throughout CLI/commands.
 *
 * Defaults to `console.log` in production and is injectable in tests.
 */
export type OutputFn = (line: string) => void;

/** Output format options for most commands. */
export type OutputFormat = "quiet" | "plain" | "json";

/** Output format options for the `view` command. */
export type ViewFormat = "plain" | "raw" | "json";

/** A single comment entry in the task's comments table. */
export interface TaskComment {
  /** RFC 3339 datetime string of when the comment was made. */
  commentedAt: string;
  /** The comment text. */
  comment: string;
}
