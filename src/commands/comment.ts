import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import {
  formatTask,
  formatTaskJSON,
  getProjectPath,
  requireTask,
} from "./helpers.ts";

/**
 * Handle `taskdb comment <task-identifier> <comment>`.
 *
 * Appends a timestamped comment entry and renders the updated task.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param identifier Task identifier.
 * @param comment Comment text.
 * @param opts Command options.
 * @returns Promise that resolves when comment flow completes.
 */
export async function commentCommand(
  program: Command,
  output: OutputFn,
  identifier: string,
  comment: string,
  opts: { format: string },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  const task = await requireTask(project, identifier, output);
  if (!task) return;

  await task.addComment(comment);

  if (opts.format === "quiet") return;
  if (opts.format === "json") return formatTaskJSON(task, output);

  formatTask(task, output);
}
