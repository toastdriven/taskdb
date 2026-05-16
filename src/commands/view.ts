import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { formatTask, getProjectPath, requireTask } from "./helpers.ts";

/**
 * Handle `taskdb view <task-identifier>`.
 *
 * Renders a task in plain/json or emits its raw Markdown file content.
 *
 * @param program Commander program instance (for global options lookup).
 * @param output Output sink.
 * @param identifier Task identifier.
 * @param opts Command options.
 * @returns Promise that resolves when view flow completes.
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
