import { test, expect, beforeEach, afterEach, describe } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "smol-toml";
import { Task } from "../src/models/task.ts";
import { makeRfc3339 } from "../src/utils/datetime.ts";
import type { TaskLabel, TaskLifecycleStatus } from "../src/types.ts";

// ---------------------------------------------------------------------------
// makeRfc3339 utility
// ---------------------------------------------------------------------------

describe("makeRfc3339", () => {
  test("returns a string matching RFC 3339 format with offset", () => {
    const result = makeRfc3339();
    // e.g. 2026-05-14T18:26:13.246-05:00 or +00:00
    expect(result).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
    );
  });

  test("returns a datetime within a few seconds of now", () => {
    const before = Date.now();
    const result = makeRfc3339();
    const after = Date.now();
    const parsed = new Date(result).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after + 1000);
  });

  test("returns the same string when called multiple time with the same date", () => {
    const now = new Date();
    const firstResult = makeRfc3339(now);
    const secondResult = makeRfc3339(now);

    expect(firstResult).toEqual(secondResult);
  });
});

// ---------------------------------------------------------------------------
// Task class
// ---------------------------------------------------------------------------

describe("Task", () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "taskdb-task-test-"));
    projectPath = join(tmpDir, "my-project");
    // Create the tasks/ subdirectory that the model expects to exist
    mkdirSync(join(projectPath, "tasks"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeTask(
    overrides: Partial<ConstructorParameters<typeof Task>[0]> = {},
  ): Task {
    return new Task({
      number: 1,
      name: "Fix the Bug",
      slug: "fix-the-bug",
      projectPath,
      description: "A description.",
      label: "bug",
      status: "ready",
      created: "2026-05-14T10:00:00.000+00:00",
      updated: "2026-05-14T10:00:00.000+00:00",
      updates: [],
      ...overrides,
    });
  }

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe("constructor", () => {
    test("sets all fields", () => {
      const t = makeTask({
        updates: [{ created: "2026-05-14T10:01:00.000+00:00", comment: "hi" }],
      });
      expect(t.number).toBe(1);
      expect(t.name).toBe("Fix the Bug");
      expect(t.slug).toBe("fix-the-bug");
      expect(t.projectPath).toBe(projectPath);
      expect(t.description).toBe("A description.");
      expect(t.label).toBe("bug");
      expect(t.status).toBe("ready");
      expect(t.created).toBe("2026-05-14T10:00:00.000+00:00");
      expect(t.updated).toBe("2026-05-14T10:00:00.000+00:00");
      expect(t.updates).toHaveLength(1);
    });

    test("defaults updates to []", () => {
      const t = makeTask();
      expect(t.updates).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // makeFilepath
  // -------------------------------------------------------------------------

  describe("makeFilepath", () => {
    test("zero-pads the number to 5 digits", () => {
      const t = makeTask({ number: 2, slug: "do-thing" });
      expect(t.makeFilepath).toContain("00002-do-thing.toml");
    });

    test("returns path inside projectPath/tasks/", () => {
      const t = makeTask({ number: 1, slug: "fix-the-bug" });
      expect(t.makeFilepath).toBe(
        join(projectPath, "tasks", "00001-fix-the-bug.toml"),
      );
    });

    test("handles number >= 10000", () => {
      const t = makeTask({ number: 99999, slug: "big-number" });
      expect(t.makeFilepath).toContain("99999-big-number.toml");
    });
  });

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------

  describe("create()", () => {
    test("writes the TOML file to disk", async () => {
      const t = makeTask();
      await t.create();
      expect(existsSync(t.makeFilepath)).toBe(true);
    });

    test("derives slug from name", async () => {
      const t = makeTask({ name: "My New Task!", slug: "" });
      await t.create();
      expect(t.slug).toBe("my-new-task");
    });

    test("stamps created and updated with matching RFC 3339 strings", async () => {
      const t = makeTask({ created: "", updated: "" });
      const before = Date.now();
      await t.create();
      const after = Date.now();

      expect(new Date(t.created).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(t.created).getTime()).toBeLessThanOrEqual(after + 1000);
      expect(t.created).toBe(t.updated);
    });

    test("written TOML contains correct fields", async () => {
      const t = makeTask({
        number: 3,
        name: "Test Task",
        label: "feat",
        status: "needs-definition",
      });
      await t.create();

      const raw = await Bun.file(t.makeFilepath).text();
      const doc = parse(raw) as Record<string, unknown>;
      const metadata = doc.metadata as Record<string, unknown>;

      expect(doc.name).toBe("Test Task");
      expect(doc.label).toBe("feat");
      expect(doc.status).toBe("needs-definition");
      expect(doc.description).toBe("A description.");
      expect(metadata.number).toBe(3);
      expect(metadata.slug).toBe("test-task");
    });
  });

  // -------------------------------------------------------------------------
  // read()
  // -------------------------------------------------------------------------

  describe("read()", () => {
    test("round-trips a created task", async () => {
      const original = makeTask({
        number: 5,
        name: "Round Trip",
        label: "chore",
        status: "in-progress",
        description: "Some *markdown* description.",
      });
      await original.create();

      const loaded = await Task.read(original.makeFilepath, projectPath);

      expect(loaded.number).toBe(5);
      expect(loaded.name).toBe("Round Trip");
      expect(loaded.slug).toBe("round-trip");
      expect(loaded.projectPath).toBe(projectPath);
      expect(loaded.description).toBe("Some *markdown* description.");
      expect(loaded.label).toBe("chore");
      expect(loaded.status).toBe("in-progress");
      expect(loaded.created).toBe(original.created);
      expect(loaded.updated).toBe(original.updated);
      expect(loaded.updates).toEqual([]);
    });

    test("round-trips updates array", async () => {
      const t = makeTask();
      await t.create();
      await t.addTaskUpdate("First update");
      await t.addTaskUpdate("Second update");

      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.updates).toHaveLength(2);
      expect(loaded.updates[0].comment).toBe("First update");
      expect(loaded.updates[1].comment).toBe("Second update");
    });
  });

  // -------------------------------------------------------------------------
  // write()
  // -------------------------------------------------------------------------

  describe("write()", () => {
    test("persists in-memory state changes to disk", async () => {
      const t = makeTask();
      await t.create();

      t.name = "Manually Changed";
      t.label = "docs";
      await t.write();

      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.name).toBe("Manually Changed");
      expect(loaded.label).toBe("docs");
    });
  });

  // -------------------------------------------------------------------------
  // updateName()
  // -------------------------------------------------------------------------

  describe("updateName()", () => {
    test("updates name (no slug change) in memory", async () => {
      const t = makeTask();
      await t.create();
      await t.updateName("Renamed Task!");
      expect(t.name).toBe("Renamed Task!");
      expect(t.slug).toBe("fix-the-bug");
    });

    test("bumps updated timestamp", async () => {
      const t = makeTask({ updated: "2000-01-01T00:00:00.000+00:00" });
      await t.create();
      const before = t.updated;
      // Small sleep to ensure timestamp differs
      await Bun.sleep(5);
      await t.updateName("New Name");
      expect(t.updated).not.toBe(before);
    });

    test("persists to disk", async () => {
      const t = makeTask();
      await t.create();
      await t.updateName("Persisted Rename");

      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.name).toBe("Persisted Rename");
      expect(loaded.slug).toBe("fix-the-bug");
    });
  });

  // -------------------------------------------------------------------------
  // updateLabel()
  // -------------------------------------------------------------------------

  describe("updateLabel()", () => {
    test("updates label in memory and on disk", async () => {
      const t = makeTask({ label: "bug" });
      await t.create();
      await t.updateLabel("research");

      expect(t.label).toBe("research");
      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.label).toBe("research");
    });

    test("bumps updated timestamp", async () => {
      const t = makeTask();
      await t.create();
      const before = t.updated;
      await Bun.sleep(5);
      await t.updateLabel("chore");
      expect(t.updated).not.toBe(before);
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus()
  // -------------------------------------------------------------------------

  describe("updateStatus()", () => {
    test("updates status in memory and on disk", async () => {
      const t = makeTask({ status: "ready" });
      await t.create();
      await t.updateStatus("done");

      expect(t.status).toBe("done");
      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.status).toBe("done");
    });

    test("bumps updated timestamp", async () => {
      const t = makeTask();
      await t.create();
      const before = t.updated;
      await Bun.sleep(5);
      await t.updateStatus("blocked");
      expect(t.updated).not.toBe(before);
    });
  });

  // -------------------------------------------------------------------------
  // updateDescription()
  // -------------------------------------------------------------------------

  describe("updateDescription()", () => {
    test("updates description in memory and on disk", async () => {
      const t = makeTask({ description: "old" });
      await t.create();
      await t.updateDescription("**new** description");

      expect(t.description).toBe("**new** description");
      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.description).toBe("**new** description");
    });

    test("bumps updated timestamp", async () => {
      const t = makeTask();
      await t.create();
      const before = t.updated;
      await Bun.sleep(5);
      await t.updateDescription("changed");
      expect(t.updated).not.toBe(before);
    });
  });

  // -------------------------------------------------------------------------
  // addTaskUpdate()
  // -------------------------------------------------------------------------

  describe("addTaskUpdate()", () => {
    test("appends update to in-memory list", async () => {
      const t = makeTask();
      await t.create();
      await t.addTaskUpdate("PR is up");
      expect(t.updates).toHaveLength(1);
      expect(t.updates[0].comment).toBe("PR is up");
    });

    test("update entry has a valid RFC 3339 created timestamp", async () => {
      const t = makeTask();
      await t.create();
      await t.addTaskUpdate("some comment");
      expect(t.updates[0].created).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
      );
    });

    test("bumps updated and persists updates on disk", async () => {
      const t = makeTask();
      await t.create();
      const before = t.updated;
      await Bun.sleep(5);
      await t.addTaskUpdate("Merged!");

      expect(t.updated).not.toBe(before);
      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.updates).toHaveLength(1);
      expect(loaded.updates[0].comment).toBe("Merged!");
    });

    test("accumulates multiple updates", async () => {
      const t = makeTask();
      await t.create();
      await t.addTaskUpdate("first");
      await t.addTaskUpdate("second");
      await t.addTaskUpdate("third");

      const loaded = await Task.read(t.makeFilepath, projectPath);
      expect(loaded.updates).toHaveLength(3);
      expect(loaded.updates.map((u) => u.comment)).toEqual([
        "first",
        "second",
        "third",
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // delete()
  // -------------------------------------------------------------------------

  describe("delete()", () => {
    test("removes the task file from disk", async () => {
      const t = makeTask();
      await t.create();
      expect(existsSync(t.makeFilepath)).toBe(true);

      await t.delete();
      expect(existsSync(t.makeFilepath)).toBe(false);
    });
  });
});
