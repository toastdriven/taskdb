import type { Command } from "commander";
import { COMPLETE_TASKS_DIR } from "../constants.ts";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import {
  formatTask,
  formatTaskJSON,
  getProjectPath,
  requireTask,
} from "./helpers.ts";

/**
 * Handle `taskdb complete <task-identifier>`.
 *
 * Transitions a task to `complete`, appends a status-change comment, and
 * renders the updated task.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param identifier Task identifier.
 * @param opts Command options.
 * @returns Promise that resolves when completion flow finishes.
 */
export async function completeCommand(
  program: Command,
  output: OutputFn,
  identifier: string,
  opts: { format: string },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  const task = await requireTask(project, identifier, output);
  if (!task) return;

  const warn = opts.format !== "quiet" ? output : undefined;
  const previousStatus = task.status ?? "(none)";

  await project.transitionStatus(task, COMPLETE_TASKS_DIR, warn);
  await task.addComment(
    `Status changed from ${previousStatus} to ${COMPLETE_TASKS_DIR}`,
  );

  if (opts.format === "quiet") return;
  if (opts.format === "json") return formatTaskJSON(task, output);

  formatTask(task, output);
}
