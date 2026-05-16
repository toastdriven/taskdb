import type { Command } from "commander";
import { Project } from "../models/project.ts";
import type { OutputFn } from "../types.ts";
import { getProjectPath } from "./helpers.ts";

/**
 * The `init` command.
 *
 * Create the filestructure to support tasks (idempotent).
 */
export async function initCommand(program: Command, output: OutputFn, opts: { format: string }): Promise<void> {
  const projectPath = getProjectPath(program.opts());
  const project = new Project({ path: projectPath });

  if (await project.isInitialized()) {
    if (opts.format !== "quiet") {
      output(`Project already initialised at: ${projectPath}`);
    }
    return;
  }

  await project.scaffold();

  if (opts.format === "quiet") return;

  if (opts.format === "json") {
    output(JSON.stringify({ path: projectPath, initialised: true }, null, 2));
    return;
  }

  output(`Initialised project at: ${projectPath}`);
}
