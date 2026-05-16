import { DEFAULT_PROJECT_PATH } from "../constants.ts";
import { Project } from "../models/project.ts";
import { Task } from "../models/task.ts";
import type { OutputFn } from "../types.ts";
import { capitalizeFirst } from "../utils/strings.ts";

/**
 * Resolve the taskdb project path from global CLI options and environment.
 *
 * Precedence:
 * 1. `--project <path>`
 * 2. `TASKDB_PROJECT_PATH`
 * 3. `.tasks` (default)
 *
 * @param globalOpts Global Commander options object.
 * @returns Absolute or relative project path to use for this invocation.
 */
export function getProjectPath(globalOpts: { project?: string }): string {
  return (
    globalOpts.project ??
    process.env.TASKDB_PROJECT_PATH ??
    DEFAULT_PROJECT_PATH
  );
}

/**
 * Parse the `--labels` option value.
 *
 * Expected input is a JSON array string, e.g. `"[\"feat\",\"docs\"]"`.
 * Returns `null` and emits an error if parsing fails.
 *
 * @param labelsRaw Raw CLI argument passed to `--labels`.
 * @param output Output function for user-facing error messages.
 * @returns Parsed label array, or `null` when invalid.
 */
export function parseLabelsOption(
  labelsRaw: string,
  output: OutputFn,
): string[] | null {
  try {
    const labels = JSON.parse(labelsRaw);
    if (!Array.isArray(labels)) throw new Error("labels must be a JSON array");
    return labels;
  } catch (e: any) {
    output(`Error: --labels must be a JSON array string. ${e.message}`);
    return null;
  }
}

/**
 * Render one task as JSON for command output.
 *
 * @param task Task to render.
 * @param output Output sink.
 */
export function formatTaskJSON(task: Task, output: OutputFn): void {
  output(JSON.stringify(task.toJSON(), null, 2));
  return;
}

/**
 * Render one task as a single terse line for command output.
 *
 * @param task Task to render.
 * @param output Output sink.
 */
export function formatTask(task: Task, output: OutputFn): void {
  const idPad = Task.idPad(task.id);
  const statusStr = task.status ? ` - (${capitalizeFirst(task.status)})` : "";
  const labelsStr =
    task.labels.length > 0 ? ` - [${task.labels.join(", ")}]` : "";
  output(`#${task.id}: ${task.title}${statusStr}${labelsStr}`);
}

/**
 * Render one task in full for command output.
 *
 * @param task Task to render.
 * @param output Output sink.
 */
export function formatFullTask(task: Task, output: OutputFn): void {
  const idPad = Task.idPad(task.id);
  const statusStr = task.status ? `${task.status}` : "";
  output(`Id: #${task.id}`);
  output(`Title: ${task.title}`);
  output(`Slug: ${task.slug}`);
  output(`Status: ${statusStr}`);

  if (task.labels.length > 0) {
    output(`Labels:  ${task.labels.join(", ")}`);
  }
  output(`Created: ${task.created}`);
  output(`Updated: ${task.updated}`);
  output(`Full Path: ${task.filePath}`);

  if (task.description.trim()) {
    output("");
    output(task.description.trim());
  }

  if (task.comments.length > 0) {
    output("");
    output("Comments:");
    for (const c of task.comments) {
      output(`  ${c.commentedAt}: ${c.comment}`);
    }
  }
}

/**
 * Render a list of tasks as JSON for command output.
 *
 * @param tasks Tasks to render.
 * @param output Output sink.
 */
export function formatTaskListJSON(tasks: Task[], output: OutputFn): void {
  output(
    JSON.stringify(
      tasks.map((t) => t.toJSON()),
      null,
      2,
    ),
  );
  return;
}

/**
 * Render a list of tasks for command output.
 *
 * @param tasks Tasks to render.
 * @param output Output sink.
 */
export function formatTaskList(tasks: Task[], output: OutputFn): void {
  if (tasks.length === 0) {
    output("No tasks found.");
    return;
  }

  for (const task of tasks) {
    formatTask(task, output);
  }
}

/**
 * Resolve a task identifier to a task instance.
 *
 * Emits a consistent not-found error and returns `null` when resolution fails.
 *
 * @param project Project instance used to resolve identifiers.
 * @param identifier User-provided task identifier.
 * @param output Output sink for not-found errors.
 * @returns Resolved task, or `null` if not found.
 */
export async function requireTask(
  project: Project,
  identifier: string,
  output: OutputFn,
): Promise<Task | null> {
  const task = await project.resolveTask(identifier);
  if (!task) {
    output(`Error: task "${identifier}" not found.`);
  }
  return task;
}
