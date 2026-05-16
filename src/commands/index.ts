import type { Command } from "commander";
import type { OutputFn } from "../types.ts";
import { Project } from "../models/project.ts";
import { Task } from "../models/task.ts";

// ── Shared helpers ────────────────────────────────────────────────────────────

function getProjectPath(globalOpts: { project?: string }): string {
  return globalOpts.project ?? process.env.TASKDB_PROJECT_PATH ?? ".tasks";
}

function formatTask(task: Task, format: string, output: OutputFn): void {
  if (format === "quiet") return;

  if (format === "json") {
    output(JSON.stringify(task.toJSON(), null, 2));
    return;
  }

  // plain
  const idPad = Task.idPad(task.id);
  const statusStr = task.status ? ` (${task.status})` : "";
  output(`[${idPad}] ${task.title}${statusStr}`);

  if (task.labels.length > 0) {
    output(`Labels:  ${task.labels.join(", ")}`);
  }
  output(`Created: ${task.created}`);
  output(`Updated: ${task.updated}`);

  if (task.description.trim()) {
    output("");
    output(task.description.trim());
  }

  if (task.comments.length > 0) {
    output("");
    output("Comments:");
    for (const c of task.comments) {
      output(`  ${c.commentedAt}: ${c.comment}`);
    }
  }
}

function formatTaskList(
  tasks: Task[],
  format: string,
  output: OutputFn
): void {
  if (format === "json") {
    output(JSON.stringify(tasks.map((t) => t.toJSON()), null, 2));
    return;
  }

  if (tasks.length === 0) {
    output("No tasks found.");
    return;
  }

  for (const task of tasks) {
    const idPad = Task.idPad(task.id);
    const labels =
      task.labels.length > 0 ? ` [${task.labels.join(", ")}]` : "";
    const status = task.status ? ` (${task.status})` : "";
    output(`[${idPad}] ${task.title}${labels}${status}`);
  }
}

async function requireTask(
  project: Project,
  identifier: string,
  output: OutputFn
): Promise<Task | null> {
  const task = await project.resolveTask(identifier);
  if (!task) {
    output(`Error: task "${identifier}" not found.`);
  }
  return task;
}

// ── Command registrations ─────────────────────────────────────────────────────

export function registerAllCommands(program: Command, output: OutputFn): void {
  // ── init ────────────────────────────────────────────────────────────────────
  program
    .command("init")
    .description(
      "Create the filestructure to support tasks (idempotent)."
    )
    .option(
      "--format <format>",
      "Output format: quiet | plain | json",
      "plain"
    )
    .action(async (opts) => {
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
    });

  // ── create ──────────────────────────────────────────────────────────────────
  program
    .command("create <title>")
    .description("Create a new task.")
    .option("--description <text>", "Task description", "")
    .option("--status <status>", "Initial status", "ready")
    .option(
      "--format <format>",
      "Output format: quiet | plain | json",
      "plain"
    )
    .action(async (title: string, opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      if (!(await project.isInitialized())) {
        output(
          `Error: project not initialised. Run "taskdb init" first.`
        );
        return;
      }

      const task = await project.createTask(
        title,
        opts.description,
        opts.status,
        opts.format !== "quiet" ? output : undefined
      );

      formatTask(task, opts.format, output);
    });

  // ── update ──────────────────────────────────────────────────────────────────
  program
    .command("update <task-identifier>")
    .description(
      "Update an existing task's title, description, status, and/or labels."
    )
    .option("--title <text>", "New title")
    .option("--description <text>", "New description")
    .option("--status <status>", "New status")
    .option(
      "--labels <json>",
      "Labels as a JSON array string, e.g. '[\"feat\",\"easy\"]'"
    )
    .option(
      "--format <format>",
      "Output format: quiet | plain | json",
      "plain"
    )
    .action(async (identifier: string, opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      const task = await requireTask(project, identifier, output);
      if (!task) return;

      const warn = opts.format !== "quiet" ? output : undefined;

      if (opts.title !== undefined) await task.updateTitle(opts.title);
      if (opts.description !== undefined)
        await task.updateDescription(opts.description);
      if (opts.labels !== undefined) {
        let labels: string[];
        try {
          labels = JSON.parse(opts.labels);
          if (!Array.isArray(labels))
            throw new Error("labels must be a JSON array");
        } catch (e: any) {
          output(`Error: --labels must be a JSON array string. ${e.message}`);
          return;
        }
        await task.updateLabels(labels);
      }
      if (opts.status !== undefined) {
        const previousStatus = task.status ?? "(none)";
        await project.transitionStatus(task, opts.status, warn);
        await task.addComment(
          `Status changed from ${previousStatus} to ${opts.status}`
        );
      }

      formatTask(task, opts.format, output);
    });

  // ── view ────────────────────────────────────────────────────────────────────
  program
    .command("view <task-identifier>")
    .description("View an existing task.")
    .option(
      "--format <format>",
      "Output format: plain | raw | json",
      "plain"
    )
    .action(async (identifier: string, opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      const task = await requireTask(project, identifier, output);
      if (!task) return;

      if (opts.format === "raw") {
        const raw = await Bun.file(task.filePath).text();
        output(raw);
        return;
      }

      formatTask(task, opts.format, output);
    });

  // ── complete ─────────────────────────────────────────────────────────────────
  program
    .command("complete <task-identifier>")
    .description(
      'Mark a task as complete (transitions status to "complete").'
    )
    .option(
      "--format <format>",
      "Output format: quiet | plain | json",
      "plain"
    )
    .action(async (identifier: string, opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      const task = await requireTask(project, identifier, output);
      if (!task) return;

      const warn = opts.format !== "quiet" ? output : undefined;
      const previousStatus = task.status ?? "(none)";

      await project.transitionStatus(task, "complete", warn);
      await task.addComment(
        `Status changed from ${previousStatus} to complete`
      );

      formatTask(task, opts.format, output);
    });

  // ── delete ───────────────────────────────────────────────────────────────────
  program
    .command("delete <task-identifier>")
    .description("Permanently delete a task and all its symlinks.")
    .option(
      "--format <format>",
      "Output format: quiet | plain | json",
      "plain"
    )
    .action(async (identifier: string, opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      const task = await requireTask(project, identifier, output);
      if (!task) return;

      const snapshot =
        opts.format === "json"
          ? JSON.stringify(task.toJSON(), null, 2)
          : `Deleted task [${Task.idPad(task.id)}] ${task.title}`;

      await project.deleteTask(task);

      if (opts.format === "quiet") return;
      output(snapshot);
    });

  // ── comment ──────────────────────────────────────────────────────────────────
  program
    .command("comment <task-identifier> <comment>")
    .description("Append a comment to an existing task.")
    .option(
      "--format <format>",
      "Output format: quiet | plain | json",
      "plain"
    )
    .action(async (identifier: string, comment: string, opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      const task = await requireTask(project, identifier, output);
      if (!task) return;

      await task.addComment(comment);

      formatTask(task, opts.format, output);
    });

  // ── list ─────────────────────────────────────────────────────────────────────
  program
    .command("list")
    .description("List tasks, optionally filtered.")
    .option("--status <status>", "Filter by status directory name")
    .option(
      "--labels <json>",
      "Filter by labels (JSON array), e.g. '[\"feat\"]'"
    )
    .option("--updated-before <date>", "Filter: updated before this date")
    .option("--updated-after <date>", "Filter: updated after this date")
    .option(
      "--format <format>",
      "Output format: plain | json",
      "plain"
    )
    .action(async (opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      let labels: string[] | undefined;
      if (opts.labels !== undefined) {
        try {
          labels = JSON.parse(opts.labels);
          if (!Array.isArray(labels))
            throw new Error("labels must be a JSON array");
        } catch (e: any) {
          output(`Error: --labels must be a JSON array string. ${e.message}`);
          return;
        }
      }

      const tasks = await project.listTasks({
        status: opts.status,
        labels,
        updatedBefore: opts.updatedBefore
          ? new Date(opts.updatedBefore)
          : undefined,
        updatedAfter: opts.updatedAfter
          ? new Date(opts.updatedAfter)
          : undefined,
      });

      formatTaskList(tasks, opts.format, output);
    });

  // ── search ────────────────────────────────────────────────────────────────────
  program
    .command("search <query>")
    .description("Full-text search across all tasks (delegates to rg).")
    .option(
      "--format <format>",
      "Output format: plain | json",
      "plain"
    )
    .action(async (query: string, opts) => {
      const projectPath = getProjectPath(program.opts());
      const project = new Project({ path: projectPath });

      const tasks = await project.searchTasks(query);
      formatTaskList(tasks, opts.format, output);
    });
}
