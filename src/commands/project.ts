import { Command } from "commander";
import { join } from "node:path";
import { access } from "node:fs/promises";
import { Project } from "../models/project.ts";
import { toSlug } from "../utils/slug.ts";
import { PROJECT_STATUSES } from "../types.ts";
import type { OutputFn, ProjectStatus } from "../types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if a path exists on disk, false otherwise. */
async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Emit multi-line Commander output through our output function, line by line. */
function makeWriteFn(output: OutputFn): (str: string) => void {
  return (str: string) => str.split("\n").forEach((line) => output(line.trimEnd()));
}

// ---------------------------------------------------------------------------
// Subcommand handlers
// ---------------------------------------------------------------------------

async function handleCreate(
  nameParts: string[],
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  const name = nameParts.join(" ").trim();
  if (!name) {
    output("Error: a project name is required.");
    return;
  }

  const slug = toSlug(name);
  if (!slug) {
    output(`Error: "${name}" produces an empty slug. Use at least one alphanumeric character.`);
    return;
  }

  const projectPath = join(tasksDir, slug);
  if (await exists(projectPath)) {
    output(`Error: a project with slug "${slug}" already exists.`);
    return;
  }

  const project = new Project({ name, slug, path: projectPath });
  await project.create();
  output(`Project "${slug}" created successfully.`);
}

async function handleView(
  slug: string,
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  const projectPath = join(tasksDir, slug);
  if (!(await exists(projectPath))) {
    output(`Error: no project found with slug "${slug}".`);
    return;
  }

  let project: Project;
  try {
    project = await Project.readMetadata(projectPath);
  } catch {
    output(`Error: could not read metadata for project "${slug}".`);
    return;
  }

  const labelWidth = 12;
  const label = (l: string) => l.padEnd(labelWidth);

  output(`${label("Name:")}${project.name}`);
  output(`${label("Slug:")}${project.slug}`);
  output(`${label("Status:")}${project.status}`);
  if (project.description) {
    output(`${label("Description:")}${project.description}`);
  }
  output(`${label("Tasks:")}${project.tasks.length}`);
}

async function handleStatus(
  slug: string,
  newStatus: string,
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  if (!PROJECT_STATUSES.includes(newStatus as ProjectStatus)) {
    output(`Error: "${newStatus}" is not a valid status.`);
    output(`Valid statuses: ${PROJECT_STATUSES.join(", ")}`);
    return;
  }

  const projectPath = join(tasksDir, slug);
  if (!(await exists(projectPath))) {
    output(`Error: no project found with slug "${slug}".`);
    return;
  }

  let project: Project;
  try {
    project = await Project.readMetadata(projectPath);
  } catch {
    output(`Error: could not read metadata for project "${slug}".`);
    return;
  }

  await project.updateStatus(newStatus as ProjectStatus);
  output(`Project "${slug}" status updated to "${newStatus}".`);
}

async function handleDelete(
  slug: string,
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  const projectPath = join(tasksDir, slug);
  if (!(await exists(projectPath))) {
    output(`Error: no project found with slug "${slug}".`);
    return;
  }

  let project: Project;
  try {
    project = await Project.readMetadata(projectPath);
  } catch {
    output(`Error: could not read metadata for project "${slug}".`);
    return;
  }

  await project.delete();
  output(`Project "${slug}" deleted.`);
}

// ---------------------------------------------------------------------------
// Command factory
// ---------------------------------------------------------------------------

/**
 * Build the `project` Commander subcommand.
 *
 * @param tasksDir  Base directory where project folders live.
 *                  Defaults to `<cwd>/.tasks`. Pass an explicit value in
 *                  tests to avoid touching the real filesystem.
 * @param output    Output function (defaults to console.log).
 *
 * Returns a standalone Commander Command so it can be tested in isolation
 * (`cmd.parseAsync(['create', 'My Project'], { from: 'user' })`) or added
 * to a parent program via `program.addCommand(...)`.
 */
export function buildProjectCommand(
  tasksDir?: string,
  output: OutputFn = console.log,
): Command {
  const dir = tasksDir ?? join(process.cwd(), ".tasks");
  const write = makeWriteFn(output);

  const project = new Command("project")
    .description("Manage projects (create / view / status / delete).")
    .exitOverride()
    .configureOutput({ writeOut: write, writeErr: write })
    // Allow excess arguments so that unknown subcommand names don't throw
    // commander.excessArguments before our action has a chance to print usage.
    .allowExcessArguments(true)
    // Default action: print usage when invoked with no subcommand (or an
    // unrecognised one — both land here because of allowExcessArguments).
    .action(() => {
      output("Usage: taskdb project <subcommand> [options]");
      output("Subcommands: create, view, status, delete");
    });

  // ---- create --------------------------------------------------------------
  project
    .command("create")
    .description("Create a new project.")
    .argument("<name...>", "project name (can contain spaces)")
    .action(async (nameParts: string[]) => {
      await handleCreate(nameParts, output, dir);
    });

  // ---- view ----------------------------------------------------------------
  project
    .command("view")
    .description("View project details.")
    .argument("<slug>", "project slug")
    .action(async (slug: string) => {
      await handleView(slug, output, dir);
    });

  // ---- status --------------------------------------------------------------
  project
    .command("status")
    .description(`Change project status. Valid values: ${PROJECT_STATUSES.join(", ")}.`)
    .argument("<slug>", "project slug")
    .argument("<status>", "new status")
    .action(async (slug: string, status: string) => {
      await handleStatus(slug, status, output, dir);
    });

  // ---- delete --------------------------------------------------------------
  project
    .command("delete")
    .description("Permanently delete a project.")
    .argument("<slug>", "project slug")
    .action(async (slug: string) => {
      await handleDelete(slug, output, dir);
    });

  return project;
}
