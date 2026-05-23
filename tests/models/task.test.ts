import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { lstat, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Task } from "../../src/models/task.ts";

// ── Temp dir helpers ──────────────────────────────────────────────────────────

let projectPath: string;

beforeEach(async () => {
  projectPath = join(
    tmpdir(),
    `taskdb-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(join(projectPath, "all", "00000"), { recursive: true });
});

afterEach(async () => {
  await rm(projectPath, { recursive: true, force: true });
});

// ── Static helpers ────────────────────────────────────────────────────────────

describe("Task.idString", () => {
  test("zero-pads to 10 digits", () => {
    expect(Task.idString(1)).toBe("0000000001");
    expect(Task.idString(42)).toBe("0000000042");
    expect(Task.idString(9999999999)).toBe("9999999999");
  });
});

describe("Task.idPad", () => {
  test("zero-pads to 5 digits", () => {
    expect(Task.idPad(1)).toBe("00001");
    expect(Task.idPad(99999)).toBe("99999");
  });
});

describe("Task.groupDir", () => {
  test("ids 1–32768 are in group 00000", () => {
    expect(Task.groupDir(1)).toBe("00000");
    expect(Task.groupDir(32768)).toBe("00000");
  });

  test("id 32769 is in group 00001", () => {
    expect(Task.groupDir(32769)).toBe("00001");
  });
});

// ── Body parsing ──────────────────────────────────────────────────────────────

describe("Task.parseBody", () => {
  test("parses description and empty comments", () => {
    const body = `
## Description

Hello world.

---

## Task Comments

| Commented At | Comment |
| --- | --- |
`;
    const { description, comments } = Task.parseBody(body);
    expect(description).toBe("Hello world.");
    expect(comments).toEqual([]);
  });

  test("parses comments", () => {
    const body = `
## Description

Desc.

---

## Task Comments

| Commented At | Comment |
| --- | --- |
| 2026-01-01T00:00:00.000+00:00 | did a thing |
`;
    const { description, comments } = Task.parseBody(body);
    expect(description).toBe("Desc.");
    expect(comments).toHaveLength(1);
    expect(comments[0].commentedAt).toBe("2026-01-01T00:00:00.000+00:00");
    expect(comments[0].comment).toBe("did a thing");
  });

  test("handles missing description", () => {
    const body = `
## Task Comments

| Commented At | Comment |
| --- | --- |
| 2026-01-01T00:00:00.000+00:00 | note |
`;
    const { description, comments } = Task.parseBody(body);
    expect(description).toBe("");
    expect(comments).toHaveLength(1);
  });

  test("handles body with no comments section", () => {
    const body = `
## Description

Just a description.
`;
    const { description, comments } = Task.parseBody(body);
    expect(description).toBe("Just a description.");
    expect(comments).toEqual([]);
  });
});

// ── lock / unlock / isLocked ──────────────────────────────────────────────────

describe("Task.lock / unlock / isLocked", () => {
  test("lock creates lockfile with current pid", async () => {
    const task = new Task({
      id: 1,
      slug: "t",
      title: "T",
      labels: [],
      created: "",
      updated: "",
      description: "",
      comments: [],
      projectPath,
    });

    await task.lock();
    const raw = await readFile(task.lockFilePath, "utf8");
    expect(raw.trim()).toBe(String(process.pid));
    await task.unlock(true);
  });

  test("unlock throws when pid does not match", async () => {
    const task = new Task({
      id: 1,
      slug: "t",
      title: "T",
      labels: [],
      created: "",
      updated: "",
      description: "",
      comments: [],
      projectPath,
    });

    await writeFile(task.lockFilePath, "999999");
    await expect(task.unlock()).rejects.toThrow("Cannot unlock task lock");
    await task.unlock(true);
  });

  test("unlock is no-op when lockfile missing", async () => {
    const task = new Task({
      id: 1,
      slug: "t",
      title: "T",
      labels: [],
      created: "",
      updated: "",
      description: "",
      comments: [],
      projectPath,
    });

    await task.unlock();
    expect(await task.isLocked()).toBe(false);
  });
});

// ── Create / read / write ─────────────────────────────────────────────────────

describe("Task.create + Task.read", () => {
  test("round-trips basic task", async () => {
    const task = new Task({
      id: 1,
      slug: "",
      title: "Initial Setup",
      labels: ["feat"],
      created: "",
      updated: "",
      description: "Do the setup.",
      comments: [],
      projectPath,
    });

    await task.create();

    expect(task.slug).toBe("initial-setup");
    expect(task.created).not.toBe("");
    expect(task.updated).toBe(task.created);
    expect(task.filename).toBe("00001-initial-setup.md");

    const read = await Task.read(task.filePath, projectPath);
    expect(read.id).toBe(1);
    expect(read.slug).toBe("initial-setup");
    expect(read.title).toBe("Initial Setup");
    expect(read.labels).toEqual(["feat"]);
    expect(read.description).toBe("Do the setup.");
    expect(read.comments).toEqual([]);
  });

  test("preserves multiple labels", async () => {
    const task = new Task({
      id: 2,
      slug: "",
      title: "Chore Task",
      labels: ["chore", "easy"],
      created: "",
      updated: "",
      description: "",
      comments: [],
      projectPath,
    });
    await task.create();

    const read = await Task.read(task.filePath, projectPath);
    expect(read.labels).toEqual(["chore", "easy"]);
  });
});

describe("Task.addComment", () => {
  test("appends comment and bumps updated", async () => {
    const task = new Task({
      id: 1,
      slug: "initial-setup",
      title: "Initial Setup",
      labels: [],
      created: "",
      updated: "",
      description: "Desc.",
      comments: [],
      projectPath,
    });
    await task.create();
    const originalUpdated = task.updated;

    // Small pause to ensure updated timestamp differs
    await Bun.sleep(5);
    await task.addComment("First comment");

    expect(task.comments).toHaveLength(1);
    expect(task.comments[0].comment).toBe("First comment");
    expect(task.updated).not.toBe(originalUpdated);

    const read = await Task.read(task.filePath, projectPath);
    expect(read.comments).toHaveLength(1);
    expect(read.comments[0].comment).toBe("First comment");
  });
});

describe("Task.updateTitle / updateDescription / updateLabels", () => {
  test("updateTitle persists", async () => {
    const task = new Task({
      id: 1,
      slug: "initial-setup",
      title: "Initial Setup",
      labels: [],
      created: "",
      updated: "",
      description: "",
      comments: [],
      projectPath,
    });
    await task.create();
    await task.updateTitle("Revised Setup");

    const read = await Task.read(task.filePath, projectPath);
    expect(read.title).toBe("Revised Setup");
  });

  test("updateDescription persists", async () => {
    const task = new Task({
      id: 1,
      slug: "t",
      title: "T",
      labels: [],
      created: "",
      updated: "",
      description: "original",
      comments: [],
      projectPath,
    });
    await task.create();
    await task.updateDescription("new description");

    const read = await Task.read(task.filePath, projectPath);
    expect(read.description).toBe("new description");
  });

  test("updateLabels persists", async () => {
    const task = new Task({
      id: 1,
      slug: "t",
      title: "T",
      labels: [],
      created: "",
      updated: "",
      description: "",
      comments: [],
      projectPath,
    });
    await task.create();
    await task.updateLabels(["bug", "critical"]);

    const read = await Task.read(task.filePath, projectPath);
    expect(read.labels).toEqual(["bug", "critical"]);
  });
});

describe("Task.deleteFile", () => {
  test("deletes file and cleans lock", async () => {
    const task = new Task({
      id: 1,
      slug: "t",
      title: "T",
      labels: [],
      created: "",
      updated: "",
      description: "",
      comments: [],
      projectPath,
    });

    await task.create();
    await task.deleteFile();

    await expect(lstat(task.filePath)).rejects.toThrow();
    await expect(unlink(task.lockFilePath)).rejects.toThrow();
  });
});

describe("Task.toJSON", () => {
  test("includes all expected fields", () => {
    const task = new Task({
      id: 1,
      slug: "foo",
      title: "Foo",
      labels: ["feat"],
      created: "2026-01-01T00:00:00.000+00:00",
      updated: "2026-01-01T00:00:00.000+00:00",
      description: "bar",
      comments: [],
      projectPath,
      status: "ready",
    });

    const json = task.toJSON() as Record<string, unknown>;
    expect(json.id).toBe(1);
    expect(json.slug).toBe("foo");
    expect(json.title).toBe("Foo");
    expect(json.labels).toEqual(["feat"]);
    expect(json.status).toBe("ready");
    expect(json.description).toBe("bar");
    expect(json.comments).toEqual([]);
  });
});
