import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import {
  formatTaskList,
  formatTaskListJSON,
  getProjectPath,
} from "./helpers.ts";

/**
 * Handle `taskdb search <query>`.
 *
 * Performs full-text search across task files (`rg` preferred, `grep` fallback)
 * and renders matched tasks.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param query Search text.
 * @param opts Command options.
 * @returns Promise that resolves when search flow completes.
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

  if (opts.format === "json") return formatTaskListJSON(tasks, output);

  formatTaskList(tasks, output);
}
