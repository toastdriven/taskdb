import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTask, getProjectPath, parseLabelsOption, requireTask } from "./helpers.ts";

/**
 * The `update` command.
 *
 * Update title, description, labels, and/or status for an existing task.
 */
export async function updateCommand(
  program: Command,
  output: OutputFn,
  identifier: string,
  opts: { title?: string; description?: string; status?: string; labels?: string; format: string },
): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  const task = await requireTask(project, identifier, output);
  if (!task) return;

  const warn = opts.format !== "quiet" ? output : undefined;

  if (opts.title !== undefined) await task.updateTitle(opts.title);
  if (opts.description !== undefined) await task.updateDescription(opts.description);

  if (opts.labels !== undefined) {
    const labels = parseLabelsOption(opts.labels, output);
    if (labels === null) return;
    await task.updateLabels(labels);
  }

  if (opts.status !== undefined) {
    const previousStatus = task.status ?? "(none)";
    await project.transitionStatus(task, opts.status, warn);
    await task.addComment(`Status changed from ${previousStatus} to ${opts.status}`);
  }

  formatTask(task, opts.format, output);
}
