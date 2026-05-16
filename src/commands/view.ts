import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTask, getProjectPath, requireTask } from "./helpers.ts";

/**
 * The `view` command.
 *
 * View an existing task in plain/raw/json formats.
 */
export async function viewCommand(
  program: Command,
  output: OutputFn,
  identifier: string,
  opts: { format: string },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  const task = await requireTask(project, identifier, output);
  if (!task) return;

  if (opts.format === "raw") {
    output(await Bun.file(task.filePath).text());
    return;
  }

  formatTask(task, opts.format, output);
}
