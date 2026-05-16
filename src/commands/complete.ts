import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTask, getProjectPath, requireTask } from "./helpers.ts";

/**
 * The `complete` command.
 *
 * Mark a task as complete and append a status-change comment.
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

  await project.transitionStatus(task, "complete", warn);
  await task.addComment(`Status changed from ${previousStatus} to complete`);

  formatTask(task, opts.format, output);
}
