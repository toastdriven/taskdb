import { test, expect, beforeEach, afterEach, describe } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Command } from "commander";
import { buildTaskCommand } from "../src/commands/task.ts";
import { Project } from "../src/models/project.ts";
import { Task } from "../src/models/task.ts";

let tmpDir: string;
let taskCmd: Command;
let lines: string[];

function output(line: string): void {
  lines.push(line);
}

async function capture(args: string[]): Promise<string[]> {
  lines = [];
  taskCmd = buildTaskCommand(tmpDir, output);
  try {
    await taskCmd.parseAsync(args, { from: "user" });
  } catch {
    // expected for commander validation paths
  }
  return lines;
}

async function makeProject(slug: string, name: string = "Test Project"): Promise<Project> {
  const p = new Project({ name, slug, path: join(tmpDir, slug) });
  await p.create();
  return p;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "taskdb-task-cmd-test-"));
  lines = [];
  taskCmd = buildTaskCommand(tmpDir, output);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("task create", () => {
  test("creates task and updates metadata", async () => {
    await makeProject("alpha");
    const out = (await capture(["create", "alpha", "First Task"])).join("\n");
    expect(out).toContain("created");

    const meta = await Bun.file(join(tmpDir, "alpha", "metadata.json")).json();
    expect(meta.tasks).toHaveLength(1);
    expect(meta.tasks[0].number).toBe(1);

    const taskFile = join(tmpDir, "alpha", "tasks", "00001-first-task.toml");
    expect(existsSync(taskFile)).toBe(true);
  });

  test("errors for unknown project", async () => {
    const out = (await capture(["create", "missing", "A Task"])).join("\n");
    expect(out).toContain("Error");
    expect(out).toContain("missing");
  });
});

describe("task view", () => {
  test("views by number, slug, and number-slug", async () => {
    await makeProject("alpha");
    await capture(["create", "alpha", "Ship Feature"]);

    let out = (await capture(["view", "alpha", "1"])).join("\n");
    expect(out).toContain("Ship Feature");

    out = (await capture(["view", "alpha", "ship-feature"])).join("\n");
    expect(out).toContain("Ship Feature");

    out = (await capture(["view", "alpha", "00001-ship-feature"])).join("\n");
    expect(out).toContain("Ship Feature");
  });

  test("errors on ambiguous slug", async () => {
    const p = await makeProject("alpha");
    const t1 = new Task({
      number: 1,
      name: "Same Slug",
      slug: "",
      projectPath: p.path,
      description: "",
      label: "other",
      status: "ready",
      created: "",
      updated: "",
      updates: [],
    });
    await t1.create();

    const t2 = new Task({
      number: 2,
      name: "Same Slug",
      slug: "",
      projectPath: p.path,
      description: "",
      label: "other",
      status: "ready",
      created: "",
      updated: "",
      updates: [],
    });
    await t2.create();

    const out = (await capture(["view", "alpha", "same-slug"])).join("\n");
    expect(out).toContain("ambiguous");
  });
});

describe("task update/status/delete", () => {
  test("updates fields and adds comment", async () => {
    await makeProject("alpha");
    await capture(["create", "alpha", "Initial Name"]);

    const out = (
      await capture([
        "update",
        "alpha",
        "1",
        "--name",
        "Renamed",
        "--label",
        "bug",
        "--description",
        "desc",
        "--comment",
        "worked on it",
      ])
    ).join("\n");

    expect(out).toContain("updated");

    const task = await Task.read(join(tmpDir, "alpha", "tasks", "00001-initial-name.toml"), join(tmpDir, "alpha"));
    expect(task.name).toBe("Renamed");
    expect(task.label).toBe("bug");
    expect(task.description).toBe("desc");
    expect(task.updates).toHaveLength(1);
  });

  test("updates status", async () => {
    await makeProject("alpha");
    await capture(["create", "alpha", "Task One"]);
    const out = (await capture(["status", "alpha", "1", "done"])).join("\n");
    expect(out).toContain("done");
  });

  test("deletes task", async () => {
    await makeProject("alpha");
    await capture(["create", "alpha", "Task One"]);

    expect(existsSync(join(tmpDir, "alpha", "tasks", "00001-task-one.toml"))).toBe(true);
    const out = (await capture(["delete", "alpha", "1"])).join("\n");
    expect(out).toContain("deleted");
    expect(existsSync(join(tmpDir, "alpha", "tasks", "00001-task-one.toml"))).toBe(false);

    const meta = await Bun.file(join(tmpDir, "alpha", "metadata.json")).json();
    expect(meta.tasks).toHaveLength(0);
  });
});
