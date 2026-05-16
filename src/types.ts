/** Output function signature — defaults to console.log in production, injectable for tests. */
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
