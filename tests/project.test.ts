import { test, expect, beforeEach, afterEach, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Project } from "../src/models/project.ts";
import { toSlug } from "../src/utils/slug.ts";

// ---------------------------------------------------------------------------
// toSlug utility
// ---------------------------------------------------------------------------

describe("toSlug", () => {
  test("lowercases and replaces spaces with hyphens", () => {
    expect(toSlug("My Cool Project")).toBe("my-cool-project");
  });

  test("strips punctuation", () => {
    expect(toSlug("Hello, World!")).toBe("hello-world");
  });

  test("collapses multiple spaces and hyphens", () => {
    expect(toSlug("foo   bar---baz")).toBe("foo-bar-baz");
  });

  test("trims leading and trailing whitespace", () => {
    expect(toSlug("  hello world  ")).toBe("hello-world");
  });

  test("strips leading and trailing hyphens", () => {
    expect(toSlug("---hello---")).toBe("hello");
  });

  test("handles an all-punctuation string", () => {
    expect(toSlug("!!!")).toBe("");
  });

  test("preserves existing hyphens", () => {
    expect(toSlug("alpha-beta")).toBe("alpha-beta");
  });
});

// ---------------------------------------------------------------------------
// Project class
// ---------------------------------------------------------------------------

describe("Project", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "taskdb-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeProject(overrides: Partial<ConstructorParameters<typeof Project>[0]> = {}): Project {
    const slug = "my-project";
    return new Project({
      name: "My Project",
      slug,
      path: join(tmpDir, slug),
      ...overrides,
    });
  }

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  test("constructor sets all fields", () => {
    const p = makeProject({ description: "A test project", status: "in-progress" });
    expect(p.name).toBe("My Project");
    expect(p.slug).toBe("my-project");
    expect(p.path).toBe(join(tmpDir, "my-project"));
    expect(p.description).toBe("A test project");
    expect(p.status).toBe("in-progress");
    expect(p.tasks).toEqual([]);
  });

  test("constructor defaults status to 'ready'", () => {
    const p = makeProject();
    expect(p.status).toBe("ready");
  });

  test("constructor defaults tasks to []", () => {
    const p = makeProject();
    expect(p.tasks).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // maxTaskNumber
  // -------------------------------------------------------------------------

  test("maxTaskNumber returns 0 when there are no tasks", () => {
    const p = makeProject();
    expect(p.maxTaskNumber).toBe(0);
  });

  test("maxTaskNumber returns the highest task number", () => {
    const p = makeProject({
      tasks: [
        { number: 1, slug: "00001-fix-bug", name: "Fix bug", status: "open" },
        { number: 3, slug: "00003-refactor", name: "Refactor", status: "open" },
        { number: 2, slug: "00002-add-tests", name: "Add tests", status: "done" },
      ],
    });
    expect(p.maxTaskNumber).toBe(3);
  });

  // -------------------------------------------------------------------------
  // create() / scaffold()
  // -------------------------------------------------------------------------

  test("create() creates the project directory", async () => {
    const p = makeProject();
    await p.create();

    const projectDir = Bun.file(p.path);
    // Directory existence: check metadata.json inside it
    const meta = Bun.file(join(p.path, "metadata.json"));
    expect(await meta.exists()).toBe(true);
  });

  test("create() creates the tasks/ subdirectory", async () => {
    const p = makeProject();
    await p.create();

    const tasksDir = Bun.file(join(p.path, "tasks"));
    // Bun.file doesn't distinguish dirs, so use node:fs
    const { stat } = await import("node:fs/promises");
    const s = await stat(join(p.path, "tasks"));
    expect(s.isDirectory()).toBe(true);
  });

  test("create() writes correct metadata.json content", async () => {
    const p = makeProject({ description: "desc" });
    await p.create();

    const raw = await Bun.file(join(p.path, "metadata.json")).json();
    expect(raw.name).toBe("My Project");
    expect(raw.slug).toBe("my-project");
    expect(raw.status).toBe("ready");
    expect(raw.description).toBe("desc");
    expect(raw.tasks).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // readMetadata()
  // -------------------------------------------------------------------------

  test("readMetadata() round-trips a project", async () => {
    const p = makeProject({ description: "round-trip test", status: "blocked" });
    await p.create();

    const loaded = await Project.readMetadata(p.path);
    expect(loaded.name).toBe(p.name);
    expect(loaded.slug).toBe(p.slug);
    expect(loaded.path).toBe(p.path);
    expect(loaded.description).toBe(p.description);
    expect(loaded.status).toBe(p.status);
    expect(loaded.tasks).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Mutation methods
  // -------------------------------------------------------------------------

  test("updateName() changes name, re-slugifies, and persists", async () => {
    const p = makeProject();
    await p.create();

    await p.updateName("Renamed Project");
    expect(p.name).toBe("Renamed Project");
    expect(p.slug).toBe("renamed-project");

    const raw = await Bun.file(join(p.path, "metadata.json")).json();
    expect(raw.name).toBe("Renamed Project");
    expect(raw.slug).toBe("renamed-project");
  });

  test("updateDescription() changes description and persists", async () => {
    const p = makeProject();
    await p.create();

    await p.updateDescription("New description");
    expect(p.description).toBe("New description");

    const raw = await Bun.file(join(p.path, "metadata.json")).json();
    expect(raw.description).toBe("New description");
  });

  test("updateStatus() changes status and persists", async () => {
    const p = makeProject();
    await p.create();

    await p.updateStatus("in-progress");
    expect(p.status).toBe("in-progress");

    const raw = await Bun.file(join(p.path, "metadata.json")).json();
    expect(raw.status).toBe("in-progress");
  });

  // -------------------------------------------------------------------------
  // close()
  // -------------------------------------------------------------------------

  test("close() sets status to 'done' and persists", async () => {
    const p = makeProject({ status: "in-progress" });
    await p.create();

    await p.close();
    expect(p.status).toBe("done");

    const raw = await Bun.file(join(p.path, "metadata.json")).json();
    expect(raw.status).toBe("done");
  });

  // -------------------------------------------------------------------------
  // delete()
  // -------------------------------------------------------------------------

  test("delete() removes the project directory", async () => {
    const p = makeProject();
    await p.create();

    // Confirm it exists first
    const { existsSync } = await import("node:fs");
    expect(existsSync(p.path)).toBe(true);

    await p.delete();
    expect(existsSync(p.path)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Task stubs
  // -------------------------------------------------------------------------

  test("addTask() throws 'not yet implemented'", async () => {
    const p = makeProject();
    await expect(p.addTask()).rejects.toThrow("not yet implemented");
  });

  test("updateTask() throws 'not yet implemented'", async () => {
    const p = makeProject();
    await expect(p.updateTask()).rejects.toThrow("not yet implemented");
  });

  test("deleteTask() throws 'not yet implemented'", async () => {
    const p = makeProject();
    await expect(p.deleteTask()).rejects.toThrow("not yet implemented");
  });
});
