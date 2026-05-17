import { parseCsvEnv } from "./utils/env.ts";

/**
 * Shared taskdb constants, with optional environment-variable overrides.
 */

/** CLI version string used for `taskdb --version`. */
export const VERSION = "0.9.0";

/** Default project directory name when no explicit project path is provided. */
export const DEFAULT_PROJECT_PATH =
  process.env.TASKDB_DEFAULT_PROJECT_PATH ?? ".tasks";

/** Directory name that stores canonical task files (under the project root). */
export const ALL_TASKS_DIR = process.env.TASKDB_ALL_TASKS_DIR ?? "all";

/** Directory name that stores completed task files (under the project root). */
export const COMPLETE_TASKS_DIR =
  process.env.TASKDB_DONE_TASKS_DIR ?? "complete";

/** Default statuses scaffolded by `taskdb init` (comma-separated override). */
export const DEFAULT_STATUSES = parseCsvEnv(
  process.env.TASKDB_DEFAULT_STATUSES,
  ["ready", "in-progress", "done"],
);

/** Directory names that are never treated as status directories. */
export const NON_STATUS_DIRS = new Set(
  parseCsvEnv(process.env.TASKDB_NON_STATUS_DIRS, [ALL_TASKS_DIR]),
);

/** Markdown heading used for the task description section. */
export const DESCRIPTION_HEADER =
  process.env.TASKDB_DESCRIPTION_HEADER ?? "## Description";

/** Markdown heading used for the task comments section. */
export const COMMENTS_HEADER =
  process.env.TASKDB_COMMENTS_HEADER ?? "## Task Comments";

export const MAX_FILES_PER_DIR = 32768;
