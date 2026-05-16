import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTaskList, getProjectPath, parseLabelsOption } from "./helpers.ts";

/**
 * The `list` command.
 *
 * List tasks with optional filters (status, labels, updated-before/after).
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

  const labels = opts.labels !== undefined ? parseLabelsOption(opts.labels, output) : undefined;
  if (labels === null) return;

  const tasks = await project.listTasks({
    status: opts.status,
    labels,
    updatedBefore: opts.updatedBefore ? new Date(opts.updatedBefore) : undefined,
    updatedAfter: opts.updatedAfter ? new Date(opts.updatedAfter) : undefined,
  });

  formatTaskList(tasks, opts.format, output);
}
