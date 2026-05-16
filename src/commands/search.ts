import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTaskList, getProjectPath } from "./helpers.ts";

/**
 * The `search` command.
 *
 * Full-text search across task files.
 */
export async function searchCommand(
  program: Command,
  output: OutputFn,
  query: string,
  opts: { format: string },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  const tasks = await project.searchTasks(query);
  formatTaskList(tasks, opts.format, output);
}
