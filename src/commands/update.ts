import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTask, getProjectPath, parseLabelsOption, requireTask } from "./helpers.ts";

/**
 * Handle `taskdb update <task-identifier>`.
 *
 * Applies field updates (title/description/labels) and optional status
 * transition. Status transitions also append an audit comment.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param identifier Task identifier.
 * @param opts Command options.
 * @returns Promise that resolves when update flow completes.
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
