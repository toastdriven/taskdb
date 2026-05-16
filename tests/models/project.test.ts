import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, lstat, readlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Project, DEFAULT_STATUSES } from "../../src/models/project.ts";
import { Task } from "../../src/models/task.ts";

// ── Temp dir helpers ──────────────────────────────────────────────────────────

let projectPath: string;
let project: Project;

beforeEach(async () => {
  projectPath = join(
    tmpdir(),
    `taskdb-proj-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  project = new Project({ path: projectPath });
  await project.scaffold();
});

afterEach(async () => {
  await rm(projectPath, { recursive: true, force: true });
});

// ── scaffold / isInitialized ──────────────────────────────────────────────────

describe("Project.scaffold", () => {
  test("creates all/ directory", async () => {
    const stat = await lstat(join(projectPath, "all", "00000"));
    expect(stat.isDirectory()).toBe(true);
  });

  test("creates all default status directories", async () => {
    for (const status of DEFAULT_STATUSES) {
      const stat = await lstat(join(projectPath, status, "00000"));
      expect(stat.isDirectory()).toBe(true);
    }
  });
});

describe("Project.isInitialized", () => {
  test("returns true after scaffold", async () => {
    expect(await project.isInitialized()).toBe(true);
  });

  test("returns false for a fresh path", async () => {
    const fresh = new Project({ path: join(tmpdir(), "taskdb-never-exists-xyz") });
    expect(await fresh.isInitialized()).toBe(false);
  });
});

// ── getStatusDirs ─────────────────────────────────────────────────────────────

describe("Project.getStatusDirs", () => {
  test("excludes 'all' directory", async () => {
    const dirs = await project.getStatusDirs();
    expect(dirs).not.toContain("all");
  });

  test("includes default status dirs", async () => {
    const dirs = await project.getStatusDirs();
    for (const status of DEFAULT_STATUSES) {
      expect(dirs).toContain(status);
    }
  });
});

// ── maxTaskId ─────────────────────────────────────────────────────────────────

describe("Project.maxTaskId", () => {
  test("returns 0 when no tasks exist", async () => {
    expect(await project.maxTaskId()).toBe(0);
  });

  test("returns the highest id after creating tasks", async () => {
    await project.createTask("Alpha");
    await project.createTask("Beta");
    await project.createTask("Gamma");
    expect(await project.maxTaskId()).toBe(3);
  });
});

// ── createTask ────────────────────────────────────────────────────────────────

describe("Project.createTask", () => {
  test("creates task file in all/", async () => {
    const task = await project.createTask("My First Task");
    expect(task.id).toBe(1);
    expect(task.slug).toBe("my-first-task");
    const stat = await lstat(task.filePath);
    expect(stat.isFile()).toBe(true);
  });

  test("creates symlink in default status dir (ready)", async () => {
    const task = await project.createTask("My Task");
    const symlinkPath = join(
      projectPath,
      "ready",
      Task.groupDir(task.id),
      task.filename
    );
    const stat = await lstat(symlinkPath);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  test("creates symlink in specified status dir", async () => {
    const task = await project.createTask("My Task", "", "in-progress");
    const symlinkPath = join(
      projectPath,
      "in-progress",
      Task.groupDir(task.id),
      task.filename
    );
    const stat = await lstat(symlinkPath);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  test("auto-increments ids", async () => {
    const t1 = await project.createTask("Task One");
    const t2 = await project.createTask("Task Two");
    const t3 = await project.createTask("Task Three");
    expect(t1.id).toBe(1);
    expect(t2.id).toBe(2);
    expect(t3.id).toBe(3);
  });

  test("sets task status", async () => {
    const task = await project.createTask("T", "", "done");
    expect(task.status).toBe("done");
  });
});

// ── resolveTask ───────────────────────────────────────────────────────────────

describe("Project.resolveTask", () => {
  test("resolves by integer id (string)", async () => {
    const created = await project.createTask("Resolve Me");
    const resolved = await project.resolveTask("1");
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(created.id);
  });

  test("resolves by zero-padded id", async () => {
    await project.createTask("Resolve Me");
    const resolved = await project.resolveTask("00001");
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(1);
  });

  test("resolves by full basename", async () => {
    await project.createTask("Resolve Me");
    const resolved = await project.resolveTask("00001-resolve-me");
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(1);
  });

  test("resolves by path fragment", async () => {
    await project.createTask("Resolve Me");
    const resolved = await project.resolveTask("00000/00001-resolve-me.md");
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(1);
  });

  test("returns null for missing task", async () => {
    expect(await project.resolveTask("99")).toBeNull();
  });
});

// ── getTaskStatus ─────────────────────────────────────────────────────────────

describe("Project.getTaskStatus", () => {
  test("returns the status the task was created with", async () => {
    const task = await project.createTask("T", "", "ready");
    const status = await project.getTaskStatus(task.id, task.filename);
    expect(status).toBe("ready");
  });
});

// ── transitionStatus ──────────────────────────────────────────────────────────

describe("Project.transitionStatus", () => {
  test("moves symlink to new status dir", async () => {
    const task = await project.createTask("T", "", "ready");
    await project.transitionStatus(task, "in-progress");

    const oldSymlink = join(
      projectPath,
      "ready",
      Task.groupDir(task.id),
      task.filename
    );
    const newSymlink = join(
      projectPath,
      "in-progress",
      Task.groupDir(task.id),
      task.filename
    );

    // Old symlink gone
    let threwOld = false;
    try {
      await lstat(oldSymlink);
    } catch {
      threwOld = true;
    }
    expect(threwOld).toBe(true);

    // New symlink present
    const stat = await lstat(newSymlink);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  test("updates task.status in memory", async () => {
    const task = await project.createTask("T", "", "ready");
    await project.transitionStatus(task, "done");
    expect(task.status).toBe("done");
  });

  test("warns when transitioning to a new status", async () => {
    const task = await project.createTask("T", "", "ready");
    const warnings: string[] = [];
    await project.transitionStatus(task, "custom-status", (msg) =>
      warnings.push(msg)
    );
    expect(warnings.some((w) => w.includes("custom-status"))).toBe(true);
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────

describe("Project.deleteTask", () => {
  test("removes the task file and symlinks", async () => {
    const task = await project.createTask("T");
    const filePath = task.filePath;
    const symlinkPath = join(
      projectPath,
      "ready",
      Task.groupDir(task.id),
      task.filename
    );

    await project.deleteTask(task);

    let threwFile = false;
    try {
      await lstat(filePath);
    } catch {
      threwFile = true;
    }
    expect(threwFile).toBe(true);

    let threwLink = false;
    try {
      await lstat(symlinkPath);
    } catch {
      threwLink = true;
    }
    expect(threwLink).toBe(true);
  });
});

// ── listTasks ─────────────────────────────────────────────────────────────────

describe("Project.listTasks", () => {
  test("returns all tasks when no filter", async () => {
    await project.createTask("Task A");
    await project.createTask("Task B");
    await project.createTask("Task C");
    const tasks = await project.listTasks();
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.title)).toEqual(["Task A", "Task B", "Task C"]);
  });

  test("filters by status", async () => {
    await project.createTask("Ready Task", "", "ready");
    const inProgress = await project.createTask("In Progress Task", "", "in-progress");
    const tasks = await project.listTasks({ status: "in-progress" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(inProgress.id);
  });

  test("filters by labels", async () => {
    const t1 = await project.createTask("Feat");
    await t1.updateLabels(["feat"]);
    const t2 = await project.createTask("Chore");
    await t2.updateLabels(["chore"]);

    const tasks = await project.listTasks({ labels: ["feat"] });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(t1.id);
  });

  test("returns empty list for unknown status", async () => {
    await project.createTask("T");
    const tasks = await project.listTasks({ status: "wontfix" });
    expect(tasks).toHaveLength(0);
  });

  test("sorts by id ascending", async () => {
    await project.createTask("C");
    await project.createTask("A");
    await project.createTask("B");
    const tasks = await project.listTasks();
    expect(tasks.map((t) => t.id)).toEqual([1, 2, 3]);
  });
});
