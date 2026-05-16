import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import {
  formatTask,
  formatTaskJSON,
  getProjectPath,
  parseLabelsOption,
} from "./helpers.ts";

/**
 * Handle `taskdb create <title>`.
 *
 * Requires an initialized project, then creates a task with optional
 * description/status/labels and renders it in the requested format.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param title Task title.
 * @param opts Command options.
 * @returns Promise that resolves when create flow completes.
 */
export async function createCommand(
  program: Command,
  output: OutputFn,
  title: string,
  opts: {
    description: string;
    status: string;
    labels?: string;
    format: string;
  },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  if (!(await project.isInitialized())) {
    output('Error: project not initialised. Run "taskdb init" first.');
    return;
  }

  const labels =
    opts.labels !== undefined ? parseLabelsOption(opts.labels, output) : [];
  if (labels === null) return;

  const task = await project.createTask(
    title,
    opts.description,
    opts.status,
    labels,
    opts.format !== "quiet" ? output : undefined,
  );

  if (opts.format === "quiet") return;
  if (opts.format === "json") return formatTaskJSON(task, output);

  formatTask(task, output);
}
