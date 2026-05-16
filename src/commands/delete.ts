import type { Command } from "commander";
import { Project } from "../models/project.ts";
import { Task } from "../models/task.ts";
import type { OutputFn } from "../types.ts";
import { getProjectPath, requireTask } from "./helpers.ts";

/**
 * Handle `taskdb delete <task-identifier>`.
 *
 * Permanently deletes the canonical task file and all status symlinks.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param identifier Task identifier.
 * @param opts Command options.
 * @returns Promise that resolves when deletion flow completes.
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
