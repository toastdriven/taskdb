import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTask, getProjectPath, requireTask } from "./helpers.ts";

/**
 * The `comment` command.
 *
 * Append a comment entry to an existing task.
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
  formatTask(task, opts.format, output);
}
