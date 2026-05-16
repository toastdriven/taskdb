import { Command } from "commander";
import { createRequire } from "node:module";
import { DEFAULT_PROJECT_PATH } from "./constants.ts";
import type { OutputFn } from "./types.ts";
import { registerAllCommands } from "./commands/index.ts";

const require = createRequire(import.meta.url);
/** CLI version sourced from package metadata for `--version` output. */
const { version } = require("../package.json") as { version: string };

/**
 * Adapt Commander write callbacks to the project's line-oriented `OutputFn`.
 *
 * @param output Output sink.
 * @returns Commander-compatible writer function.
 */
function makeWriteFn(output: OutputFn): (str: string) => void {
  return (str: string) =>
    str.split("\n").forEach((line) => output(line.trimEnd()));
}

/**
 * Build and return a fully configured Commander program.
 *
 * Separating construction from execution makes the program testable without
 * spawning a subprocess.
 *
 * @param output Output sink (defaults to `console.log`).
 * @returns Configured Commander `Command` instance.
 */
export function createProgram(output: OutputFn = console.log): Command {
  const write = makeWriteFn(output);

  const program = new Command("taskdb")
    .description(
      "A zero-config task tracker CLI, powered by (human-readable) flatfiles.",
    )
    .version(version, "-V, --version", "output the current version")
    .usage("<command> [options]")
    .exitOverride()
    .configureOutput({ writeOut: write, writeErr: write })
    .option(
      "--project <path>",
      "Path to the project root directory",
      process.env.TASKDB_PROJECT_PATH ?? DEFAULT_PROJECT_PATH,
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
 * @param args CLI args excluding runtime/executable args.
 * @param output Output sink (injectable for tests).
 * @returns Intended process exit code (`0` success, non-zero error).
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
    if (e.code === "commander.helpDisplayed" || e.code === "commander.version") {
      return 0;
    }
    // Re-throw unexpected errors.
    throw e;
  }
}
