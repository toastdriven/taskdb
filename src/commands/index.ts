import type { Command } from "commander";
import type { OutputFn } from "../types.ts";
import { buildProjectCommand } from "./project.ts";
import { buildTaskCommand } from "./task.ts";

/**
 * Register all application subcommands on `program`.
 *
 * @param program  The top-level Commander program.
 * @param output   Output function forwarded to every command handler.
 */
export function registerAllCommands(program: Command, output: OutputFn): void {
  program.addCommand(buildProjectCommand(undefined, output));
  program.addCommand(buildTaskCommand(undefined, output));
}
