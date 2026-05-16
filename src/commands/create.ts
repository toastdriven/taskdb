import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTask, getProjectPath, parseLabelsOption } from "./helpers.ts";

/**
 * The `create` command.
 *
 * Create a new task with optional description, status, labels, and output format.
 */
export async function createCommand(
  program: Command,
  output: OutputFn,
  title: string,
  opts: { description: string; status: string; labels?: string; format: string },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  if (!(await project.isInitialized())) {
    output('Error: project not initialised. Run "taskdb init" first.');
    return;
  }

  const labels = opts.labels !== undefined ? parseLabelsOption(opts.labels, output) : [];
  if (labels === null) return;

  const task = await project.createTask(
    title,
    opts.description,
    opts.status,
    labels,
    opts.format !== "quiet" ? output : undefined,
  );

  formatTask(task, opts.format, output);
}
