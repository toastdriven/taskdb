import { Command } from "commander";
import type { OutputFn } from "./types.ts";
import { registerAllCommands } from "./commands/index.ts";

/** Emit multi-line Commander output through our output function, line by line. */
function makeWriteFn(output: OutputFn): (str: string) => void {
  return (str: string) =>
    str.split("\n").forEach((line) => output(line.trimEnd()));
}

/**
 * Build and return a fully configured Commander program.
 *
 * Separating construction from execution makes the program testable without
 * spawning a subprocess.
 */
export function createProgram(output: OutputFn = console.log): Command {
  const write = makeWriteFn(output);

  const program = new Command("taskdb")
    .description(
      "A zero-config task tracker CLI, powered by (human-readable) flatfiles.",
    )
    .usage("<command> [options]")
    .exitOverride()
    .configureOutput({ writeOut: write, writeErr: write })
    .option(
      "--project <path>",
      "Path to the project root directory",
      process.env.TASKDB_PROJECT_PATH ?? ".tasks",
    );

  // `help` subcommand — delegates to Commander's built-in help output.
  program
    .command("help")
    .description("Show help information.")
    .action(() => output(program.helpInformation()));

  registerAllCommands(program, output);

  return program;
}

/**
 * Main entry point.
 *
 * Accepts the argv slice starting after the runtime args
 * (i.e. `process.argv.slice(2)`), and an optional output function for testing.
 *
 * Returns the intended exit code (0 = success, non-zero = error).
 */
export async function run(
  args: string[],
  output: OutputFn = console.log,
): Promise<number> {
  const program = createProgram(output);

  // No args — show help and exit cleanly.
  if (args.length === 0) {
    program.outputHelp();
    return 0;
  }

  try {
    await program.parseAsync(args, { from: "user" });
    return 0;
  } catch (e: any) {
    if (e.code === "commander.unknownCommand") {
      const unknown = args[0] ?? "";
      output(
        `taskdb: unknown command "${unknown}". Run "taskdb help" for usage.`,
      );
      return 1;
    }
    if (e.code === "commander.helpDisplayed") {
      return 0;
    }
    // Re-throw unexpected errors.
    throw e;
  }
}
