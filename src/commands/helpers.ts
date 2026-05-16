import { Project } from "../models/project.ts";
import { Task } from "../models/task.ts";
import type { OutputFn } from "../types.ts";

/** Resolve the taskdb project path from global CLI options / env vars. */
export function getProjectPath(globalOpts: { project?: string }): string {
  return globalOpts.project ?? process.env.TASKDB_PROJECT_PATH ?? ".tasks";
}

/** Parse a JSON array string used by --labels options. */
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

/** Print a single task in quiet/plain/json formats. */
export function formatTask(task: Task, format: string, output: OutputFn): void {
  if (format === "quiet") return;

  if (format === "json") {
    output(JSON.stringify(task.toJSON(), null, 2));
    return;
  }

  const idPad = Task.idPad(task.id);
  const statusStr = task.status ? ` (${task.status})` : "";
  output(`[${idPad}] ${task.title}${statusStr}`);

  if (task.labels.length > 0) {
    output(`Labels:  ${task.labels.join(", ")}`);
  }
  output(`Created: ${task.created}`);
  output(`Updated: ${task.updated}`);

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

/** Print a list of tasks in plain/json formats. */
export function formatTaskList(tasks: Task[], format: string, output: OutputFn): void {
  if (format === "json") {
    output(JSON.stringify(tasks.map((t) => t.toJSON()), null, 2));
    return;
  }

  if (tasks.length === 0) {
    output("No tasks found.");
    return;
  }

  for (const task of tasks) {
    const idPad = Task.idPad(task.id);
    const labels = task.labels.length > 0 ? ` [${task.labels.join(", ")}]` : "";
    const status = task.status ? ` (${task.status})` : "";
    output(`[${idPad}] ${task.title}${labels}${status}`);
  }
}

/** Resolve a task or emit a not-found error. */
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
