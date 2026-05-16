import type { Command } from "commander";
import { Project } from "../models/project.ts";
import { Task } from "../models/task.ts";
import type { OutputFn } from "../types.ts";
import { getProjectPath, requireTask } from "./helpers.ts";

/**
 * The `delete` command.
 *
 * Permanently delete a task and all of its status symlinks.
 */
export async function deleteCommand(
  program: Command,
  output: OutputFn,
  identifier: string,
  opts: { format: string },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  const task = await requireTask(project, identifier, output);
  if (!task) return;

  const snapshot =
    opts.format === "json"
      ? JSON.stringify(task.toJSON(), null, 2)
      : `Deleted task [${Task.idPad(task.id)}] ${task.title}`;

  await project.deleteTask(task);

  if (opts.format === "quiet") return;
  output(snapshot);
}
