import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import {
  formatTaskList,
  formatTaskListJSON,
  getProjectPath,
  parseLabelsOption,
} from "./helpers.ts";

/**
 * Handle `taskdb list`.
 *
 * Supports optional filtering by status, labels, and updated timestamp bounds,
 * then renders results in plain or JSON format.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param opts Command options.
 * @returns Promise that resolves when list flow completes.
 */
export async function listCommand(
  program: Command,
  output: OutputFn,
  opts: {
    status?: string;
    labels?: string;
    updatedBefore?: string;
    updatedAfter?: string;
    format: string;
  },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  const labels =
    opts.labels !== undefined
      ? parseLabelsOption(opts.labels, output)
      : undefined;
  if (labels === null) return;

  const tasks = await project.listTasks({
    status: opts.status,
    labels,
    updatedBefore: opts.updatedBefore
      ? new Date(opts.updatedBefore)
      : undefined,
    updatedAfter: opts.updatedAfter ? new Date(opts.updatedAfter) : undefined,
  });

  if (opts.format === "json") return formatTaskListJSON(tasks, output);

  formatTaskList(tasks, output);
}
