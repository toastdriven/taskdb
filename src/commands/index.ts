import type { Command } from "commander";
import { COMPLETE_TASKS_DIR } from "../constants.ts";
import type { OutputFn } from "../types.ts";
import { commentCommand } from "./comment.ts";
import { completeCommand } from "./complete.ts";
import { createCommand } from "./create.ts";
import { deleteCommand } from "./delete.ts";
import { initCommand } from "./init.ts";
import { listCommand } from "./list.ts";
import { searchCommand } from "./search.ts";
import { updateCommand } from "./update.ts";
import { viewCommand } from "./view.ts";

/**
 * Register all taskdb subcommands onto the provided Commander program.
 *
 * @param program Commander root program.
 * @param output Output sink passed through to command handlers.
 */
export function registerAllCommands(program: Command, output: OutputFn): void {
  program
    .command("init")
    .description("Create the filestructure to support tasks (idempotent).")
    .option("--format <format>", "Output format: quiet | plain | json", "plain")
    .action(async (opts) => initCommand(program, output, opts));

  program
    .command("create <title>")
    .description("Create a new task.")
    .option("--description <text>", "Task description", "")
    .option("--status <status>", "Initial status", "ready")
    .option("--labels <json>", 'Labels as a JSON array string, e.g. "[\\"feat\\",\\"easy\\"]"')
    .option("--format <format>", "Output format: quiet | plain | json", "plain")
    .action(async (title, opts) => createCommand(program, output, title, opts));

  program
    .command("update <task-identifier>")
    .description("Update an existing task's title, description, status, and/or labels.")
    .option("--title <text>", "New title")
    .option("--description <text>", "New description")
    .option("--status <status>", "New status")
    .option("--labels <json>", 'Labels as a JSON array string, e.g. "[\\"feat\\",\\"easy\\"]"')
    .option("--format <format>", "Output format: quiet | plain | json", "plain")
    .action(async (identifier, opts) => updateCommand(program, output, identifier, opts));

  program
    .command("view <task-identifier>")
    .description("View an existing task.")
    .option("--format <format>", "Output format: plain | raw | json", "plain")
    .action(async (identifier, opts) => viewCommand(program, output, identifier, opts));

  program
    .command("complete <task-identifier>")
    .description(
      `Mark a task as complete (transitions status to "${COMPLETE_TASKS_DIR}").`,
    )
    .option("--format <format>", "Output format: quiet | plain | json", "plain")
    .action(async (identifier, opts) => completeCommand(program, output, identifier, opts));

  program
    .command("delete <task-identifier>")
    .description("Permanently delete a task and all its symlinks.")
    .option("--format <format>", "Output format: quiet | plain | json", "plain")
    .action(async (identifier, opts) => deleteCommand(program, output, identifier, opts));

  program
    .command("comment <task-identifier> <comment>")
    .description("Append a comment to an existing task.")
    .option("--format <format>", "Output format: quiet | plain | json", "plain")
    .action(async (identifier, comment, opts) => commentCommand(program, output, identifier, comment, opts));

  program
    .command("list")
    .description("List tasks, optionally filtered.")
    .option("--status <status>", "Filter by status directory name")
    .option("--labels <json>", 'Filter by labels (JSON array), e.g. "[\\"feat\\"]"')
    .option("--updated-before <date>", "Filter: updated before this date")
    .option("--updated-after <date>", "Filter: updated after this date")
    .option("--format <format>", "Output format: plain | json", "plain")
    .action(async (opts) => listCommand(program, output, opts));

  program
    .command("search <query>")
    .description("Full-text search across all tasks (uses rg if available, falls back to grep).")
    .option("--format <format>", "Output format: plain | json", "plain")
    .action(async (query, opts) => searchCommand(program, output, query, opts));
}
