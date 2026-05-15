import { Command } from "commander";
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Project } from "../models/project.ts";
import { Task } from "../models/task.ts";
import {
  TASK_LABELS,
  TASK_LIFECYCLE_STATUSES,
  type OutputFn,
  type TaskLabel,
  type TaskLifecycleStatus,
} from "../types.ts";

interface TaskRecord {
  task: Task;
  filePath: string;
}

function makeWriteFn(output: OutputFn): (str: string) => void {
  return (str: string) => str.split("\n").forEach((line) => output(line.trimEnd()));
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadProject(projectSlug: string, tasksDir: string): Promise<Project | null> {
  const projectPath = join(tasksDir, projectSlug);
  if (!(await exists(projectPath))) return null;
  return Project.readMetadata(projectPath);
}

async function loadProjectTasks(projectPath: string): Promise<TaskRecord[]> {
  const tasksPath = join(projectPath, "tasks");
  const files = await readdir(tasksPath);
  const records: TaskRecord[] = [];

  for (const file of files) {
    if (!file.endsWith(".toml")) continue;
    const filePath = join(tasksPath, file);
    const task = await Task.read(filePath, projectPath);
    records.push({ task, filePath });
  }

  return records;
}

function isNumberIdentifier(identifier: string): boolean {
  return /^\d+$/.test(identifier);
}

function isNumberSlugIdentifier(identifier: string): boolean {
  return /^\d+-.+$/.test(identifier);
}

async function resolveTaskByIdentifier(
  projectPath: string,
  identifier: string,
  output: OutputFn,
): Promise<TaskRecord | null> {
  const tasks = await loadProjectTasks(projectPath);

  let matches: TaskRecord[] = [];

  if (isNumberIdentifier(identifier)) {
    const number = Number.parseInt(identifier, 10);
    matches = tasks.filter((r) => r.task.number === number);
  } else if (isNumberSlugIdentifier(identifier)) {
    const [numberPart, ...slugParts] = identifier.split("-");
    const number = Number.parseInt(numberPart, 10);
    const slug = slugParts.join("-");
    matches = tasks.filter((r) => r.task.number === number && r.task.slug === slug);
  } else {
    matches = tasks.filter((r) => r.task.slug === identifier);
  }

  if (matches.length === 0) {
    output(`Error: no task found for identifier "${identifier}".`);
    return null;
  }

  if (matches.length > 1) {
    output(
      `Error: task identifier "${identifier}" is ambiguous (${matches.length} matches). Use <number>-<slug>.`,
    );
    return null;
  }

  return matches[0];
}

async function syncProjectTaskSummary(project: Project, task: Task): Promise<void> {
  const idx = project.tasks.findIndex((t) => t.number === task.number);
  const summary = {
    number: task.number,
    slug: `${String(task.number).padStart(5, "0")}-${task.slug}`,
    name: task.name,
    status: task.status,
  };

  if (idx === -1) project.tasks.push(summary);
  else project.tasks[idx] = summary;

  await project.writeMetadata();
}

async function handleCreate(
  projectSlug: string,
  nameParts: string[],
  options: { label?: string; status?: string; description?: string },
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  const project = await loadProject(projectSlug, tasksDir);
  if (!project) {
    output(`Error: no project found with slug "${projectSlug}".`);
    return;
  }

  const name = nameParts.join(" ").trim();
  if (!name) {
    output("Error: a task name is required.");
    return;
  }

  const label = (options.label ?? "other") as TaskLabel;
  if (!TASK_LABELS.includes(label)) {
    output(`Error: "${label}" is not a valid label.`);
    output(`Valid labels: ${TASK_LABELS.join(", ")}`);
    return;
  }

  const status = (options.status ?? "needs-definition") as TaskLifecycleStatus;
  if (!TASK_LIFECYCLE_STATUSES.includes(status)) {
    output(`Error: "${status}" is not a valid status.`);
    output(`Valid statuses: ${TASK_LIFECYCLE_STATUSES.join(", ")}`);
    return;
  }

  const task = new Task({
    number: project.maxTaskNumber + 1,
    name,
    slug: "",
    projectPath: project.path,
    description: options.description ?? "",
    label,
    status,
    created: "",
    updated: "",
    updates: [],
  });

  await task.create();
  await syncProjectTaskSummary(project, task);

  output(`Task ${String(task.number).padStart(5, "0")}-${task.slug} created in project "${projectSlug}".`);
}

async function handleView(
  projectSlug: string,
  identifier: string,
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  const project = await loadProject(projectSlug, tasksDir);
  if (!project) {
    output(`Error: no project found with slug "${projectSlug}".`);
    return;
  }

  const resolved = await resolveTaskByIdentifier(project.path, identifier, output);
  if (!resolved) return;

  const { task } = resolved;
  const labelWidth = 12;
  const label = (l: string) => l.padEnd(labelWidth);

  output(`${label("Number:")}${task.number}`);
  output(`${label("Slug:")}${task.slug}`);
  output(`${label("Name:")}${task.name}`);
  output(`${label("Label:")}${task.label}`);
  output(`${label("Status:")}${task.status}`);
  output(`${label("Description:")}${task.description}`);
  output(`${label("Updates:")}${task.updates.length}`);
}

async function handleStatus(
  projectSlug: string,
  identifier: string,
  status: string,
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  if (!TASK_LIFECYCLE_STATUSES.includes(status as TaskLifecycleStatus)) {
    output(`Error: "${status}" is not a valid status.`);
    output(`Valid statuses: ${TASK_LIFECYCLE_STATUSES.join(", ")}`);
    return;
  }

  const project = await loadProject(projectSlug, tasksDir);
  if (!project) {
    output(`Error: no project found with slug "${projectSlug}".`);
    return;
  }

  const resolved = await resolveTaskByIdentifier(project.path, identifier, output);
  if (!resolved) return;

  await resolved.task.updateStatus(status as TaskLifecycleStatus);
  await syncProjectTaskSummary(project, resolved.task);

  output(`Task ${resolved.task.number} status updated to "${status}".`);
}

async function handleUpdate(
  projectSlug: string,
  identifier: string,
  options: { name?: string; label?: string; description?: string; comment?: string },
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  const project = await loadProject(projectSlug, tasksDir);
  if (!project) {
    output(`Error: no project found with slug "${projectSlug}".`);
    return;
  }

  const resolved = await resolveTaskByIdentifier(project.path, identifier, output);
  if (!resolved) return;

  const { task } = resolved;

  if (!options.name && !options.label && options.description === undefined && !options.comment) {
    output("Error: no changes requested. Use --name, --label, --description, or --comment.");
    return;
  }

  if (options.label) {
    if (!TASK_LABELS.includes(options.label as TaskLabel)) {
      output(`Error: "${options.label}" is not a valid label.`);
      output(`Valid labels: ${TASK_LABELS.join(", ")}`);
      return;
    }
    await task.updateLabel(options.label as TaskLabel);
  }

  if (options.name) {
    await task.updateName(options.name);
  }

  if (options.description !== undefined) {
    await task.updateDescription(options.description);
  }

  if (options.comment) {
    await task.addTaskUpdate(options.comment);
  }

  await syncProjectTaskSummary(project, task);

  output(`Task ${task.number} updated.`);
}

async function handleDelete(
  projectSlug: string,
  identifier: string,
  output: OutputFn,
  tasksDir: string,
): Promise<void> {
  const project = await loadProject(projectSlug, tasksDir);
  if (!project) {
    output(`Error: no project found with slug "${projectSlug}".`);
    return;
  }

  const resolved = await resolveTaskByIdentifier(project.path, identifier, output);
  if (!resolved) return;

  await resolved.task.delete();
  project.tasks = project.tasks.filter((t) => t.number !== resolved.task.number);
  await project.writeMetadata();

  output(`Task ${resolved.task.number} deleted.`);
}

export function buildTaskCommand(
  tasksDir?: string,
  output: OutputFn = console.log,
): Command {
  const dir = tasksDir ?? join(process.cwd(), ".tasks");
  const write = makeWriteFn(output);

  const task = new Command("task")
    .description("Manage tasks within a project (create / view / update / status / delete).")
    .exitOverride()
    .configureOutput({ writeOut: write, writeErr: write })
    .allowExcessArguments(true)
    .action(() => {
      output("Usage: taskdb task <subcommand> [options]");
      output("Subcommands: create, view, update, status, delete");
    });

  task
    .command("create")
    .description("Create a task in a project.")
    .argument("<project-slug>", "project slug")
    .argument("<name...>", "task name")
    .option("-l, --label <label>", `task label (${TASK_LABELS.join(", ")})`)
    .option("-s, --status <status>", `task status (${TASK_LIFECYCLE_STATUSES.join(", ")})`)
    .option("-d, --description <description>", "task description")
    .action(async (projectSlug: string, nameParts: string[], options) => {
      await handleCreate(projectSlug, nameParts, options, output, dir);
    });

  task
    .command("view")
    .description("View task details.")
    .argument("<project-slug>", "project slug")
    .argument("<task-identifier>", "task number, slug, or number-slug")
    .action(async (projectSlug: string, identifier: string) => {
      await handleView(projectSlug, identifier, output, dir);
    });

  task
    .command("update")
    .description("Update task fields and/or append a task update comment.")
    .argument("<project-slug>", "project slug")
    .argument("<task-identifier>", "task number, slug, or number-slug")
    .option("--name <name>", "new task name")
    .option("--label <label>", `new task label (${TASK_LABELS.join(", ")})`)
    .option("--description <description>", "new task description")
    .option("--comment <comment>", "append a task update comment")
    .action(async (projectSlug: string, identifier: string, options) => {
      await handleUpdate(projectSlug, identifier, options, output, dir);
    });

  task
    .command("status")
    .description(`Change task status. Valid values: ${TASK_LIFECYCLE_STATUSES.join(", ")}.`)
    .argument("<project-slug>", "project slug")
    .argument("<task-identifier>", "task number, slug, or number-slug")
    .argument("<status>", "new status")
    .action(async (projectSlug: string, identifier: string, status: string) => {
      await handleStatus(projectSlug, identifier, status, output, dir);
    });

  task
    .command("delete")
    .description("Delete a task.")
    .argument("<project-slug>", "project slug")
    .argument("<task-identifier>", "task number, slug, or number-slug")
    .action(async (projectSlug: string, identifier: string) => {
      await handleDelete(projectSlug, identifier, output, dir);
    });

  return task;
}
