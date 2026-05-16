import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { run } from "../src/cli.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

let projectPath: string;

function capture(): { lines: string[]; output: (l: string) => void } {
  const lines: string[] = [];
  return { lines, output: (l: string) => lines.push(l) };
}

async function cmd(
  args: string[],
  out = capture()
): Promise<{ lines: string[]; code: number }> {
  const code = await run(
    ["--project", projectPath, ...args],
    out.output
  );
  return { lines: out.lines, code };
}

beforeEach(async () => {
  projectPath = join(
    tmpdir(),
    `taskdb-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await mkdir(projectPath, { recursive: true });
});

afterEach(async () => {
  await rm(projectPath, { recursive: true, force: true });
});

// ── help / no args ────────────────────────────────────────────────────────────

describe("taskdb (no args)", () => {
  test("exits with 0 and shows help", async () => {
    const out = capture();
    const code = await run([], out.output);
    // run() with no args shows help and exits 0
    expect(code).toBe(0);
  });
});

describe("taskdb help", () => {
  test("exits with 0", async () => {
    const { code } = await cmd(["help"]);
    expect(code).toBe(0);
  });
});

describe("taskdb unknown-command", () => {
  test("exits with 1 and prints an error", async () => {
    const { lines, code } = await cmd(["foobar"]);
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("unknown command");
  });
});

// ── init ──────────────────────────────────────────────────────────────────────

describe("taskdb init", () => {
  test("creates directory structure and exits 0", async () => {
    const { lines, code } = await cmd(["init"]);
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("Initialised");
  });

  test("is idempotent", async () => {
    await cmd(["init"]);
    const { lines, code } = await cmd(["init"]);
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("already");
  });

  test("--format=quiet produces no output", async () => {
    const { lines } = await cmd(["init", "--format", "quiet"]);
    expect(lines).toHaveLength(0);
  });

  test("--format=json outputs JSON", async () => {
    const { lines } = await cmd(["init", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.initialised).toBe(true);
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe("taskdb create", () => {
  beforeEach(async () => {
    await cmd(["init"]);
  });

  test("creates a task and outputs plain info", async () => {
    const { lines, code } = await cmd(["create", "My First Task"]);
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("My First Task");
  });

  test("--format=quiet produces no output", async () => {
    const { lines } = await cmd(["create", "Silent Task", "--format", "quiet"]);
    expect(lines).toHaveLength(0);
  });

  test("--format=json outputs parseable JSON", async () => {
    const { lines } = await cmd([
      "create",
      "JSON Task",
      "--format",
      "json",
    ]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.title).toBe("JSON Task");
    expect(parsed.id).toBe(1);
  });

  test("--description is stored", async () => {
    const { lines } = await cmd([
      "create",
      "Described Task",
      "--description",
      "A description here.",
      "--format",
      "json",
    ]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.description).toBe("A description here.");
  });

  test("--status sets initial status", async () => {
    const { lines } = await cmd([
      "create",
      "In-Progress Task",
      "--status",
      "in-progress",
      "--format",
      "json",
    ]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.status).toBe("in-progress");
  });
});

// ── view ──────────────────────────────────────────────────────────────────────

describe("taskdb view", () => {
  beforeEach(async () => {
    await cmd(["init"]);
    await cmd(["create", "View Test Task", "--description", "The description."]);
  });

  test("views a task by id", async () => {
    const { lines, code } = await cmd(["view", "1"]);
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("View Test Task");
  });

  test("--format=json returns JSON", async () => {
    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.title).toBe("View Test Task");
  });

  test("--format=raw returns raw markdown", async () => {
    const { lines } = await cmd(["view", "1", "--format", "raw"]);
    const raw = lines.join("\n");
    expect(raw).toContain("---"); // frontmatter delimiters
    expect(raw).toContain("View Test Task");
  });

  test("returns error for unknown task", async () => {
    const { lines, code } = await cmd(["view", "999"]);
    expect(lines.join("\n")).toContain("not found");
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("taskdb update", () => {
  beforeEach(async () => {
    await cmd(["init"]);
    await cmd(["create", "Original Title"]);
  });

  test("updates title", async () => {
    await cmd(["update", "1", "--title", "New Title"]);
    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.title).toBe("New Title");
  });

  test("updates description", async () => {
    await cmd(["update", "1", "--description", "Updated desc."]);
    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.description).toBe("Updated desc.");
  });

  test("updates labels", async () => {
    await cmd(["update", "1", "--labels", '["bug","critical"]']);
    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.labels).toEqual(["bug", "critical"]);
  });

  test("updates status", async () => {
    await cmd(["update", "1", "--status", "in-progress"]);
    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.status).toBe("in-progress");
  });
});

// ── complete ──────────────────────────────────────────────────────────────────

describe("taskdb complete", () => {
  beforeEach(async () => {
    await cmd(["init"]);
    await cmd(["create", "To Complete"]);
  });

  test("marks task as complete", async () => {
    const { code } = await cmd(["complete", "1"]);
    expect(code).toBe(0);

    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.status).toBe("complete");
  });

  test("adds a comment about completion", async () => {
    await cmd(["complete", "1"]);
    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(
      parsed.comments.some((c: { comment: string }) =>
        c.comment.includes("complete")
      )
    ).toBe(true);
  });
});

// ── comment ───────────────────────────────────────────────────────────────────

describe("taskdb comment", () => {
  beforeEach(async () => {
    await cmd(["init"]);
    await cmd(["create", "Commented Task"]);
  });

  test("appends a comment", async () => {
    await cmd(["comment", "1", "This is my note."]);
    const { lines } = await cmd(["view", "1", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(
      parsed.comments.some((c: { comment: string }) =>
        c.comment === "This is my note."
      )
    ).toBe(true);
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe("taskdb delete", () => {
  beforeEach(async () => {
    await cmd(["init"]);
    await cmd(["create", "To Delete"]);
  });

  test("deletes the task", async () => {
    const { code } = await cmd(["delete", "1"]);
    expect(code).toBe(0);

    const { lines } = await cmd(["view", "1"]);
    expect(lines.join("\n")).toContain("not found");
  });

  test("--format=quiet produces no output", async () => {
    const { lines } = await cmd(["delete", "1", "--format", "quiet"]);
    expect(lines).toHaveLength(0);
  });
});

// ── list ──────────────────────────────────────────────────────────────────────

describe("taskdb list", () => {
  beforeEach(async () => {
    await cmd(["init"]);
    await cmd(["create", "Alpha", "--status", "ready"]);
    await cmd(["create", "Beta", "--status", "in-progress"]);
    await cmd(["create", "Gamma", "--status", "done"]);
  });

  test("lists all tasks", async () => {
    const { lines, code } = await cmd(["list"]);
    expect(code).toBe(0);
    const out = lines.join("\n");
    expect(out).toContain("Alpha");
    expect(out).toContain("Beta");
    expect(out).toContain("Gamma");
  });

  test("--status filters by status", async () => {
    const { lines } = await cmd(["list", "--status", "ready"]);
    const out = lines.join("\n");
    expect(out).toContain("Alpha");
    expect(out).not.toContain("Beta");
    expect(out).not.toContain("Gamma");
  });

  test("--format=json returns array", async () => {
    const { lines } = await cmd(["list", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
  });
});

// ── search ────────────────────────────────────────────────────────────────────

describe("taskdb search", () => {
  beforeEach(async () => {
    await cmd(["init"]);
    await cmd([
      "create",
      "Searchable Task",
      "--description",
      "contains the keyword needle",
    ]);
    await cmd(["create", "Other Task", "--description", "nothing here"]);
  });

  test("returns matching tasks", async () => {
    const { lines, code } = await cmd(["search", "needle"]);
    expect(code).toBe(0);
    const out = lines.join("\n");
    expect(out).toContain("Searchable Task");
    expect(out).not.toContain("Other Task");
  });

  test("--format=json returns array", async () => {
    const { lines } = await cmd(["search", "needle", "--format", "json"]);
    const parsed = JSON.parse(lines.join("\n"));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe("Searchable Task");
  });
});
