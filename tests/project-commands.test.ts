import { test, expect, beforeEach, afterEach, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildProjectCommand } from "../src/commands/project.ts";
import type { Command } from "commander";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let tmpDir: string;
let projectCmd: Command;
let lines: string[];

function output(line: string): void {
  lines.push(line);
}

// Invoke the project command with the given args and return captured output.
// Commander errors (unknown subcommand, missing required arg, etc.) are caught
// so the captured output/lines can still be inspected.
async function capture(args: string[]): Promise<string[]> {
  lines = [];
  projectCmd = buildProjectCommand(tmpDir, output);
  try {
    await projectCmd.parseAsync(args, { from: "user" });
  } catch (e: any) {
    // exitOverride turns Commander's process.exit() calls into thrown errors.
    // For unknown-command errors, echo the usage — mirroring what the real
    // top-level program does.
    if (e.code === "commander.unknownCommand") {
      lines.push("Usage: taskdb project <subcommand> [options]");
    }
    // Missing required arguments are emitted via writeErr (configureOutput),
    // so they're already in `lines` — nothing extra to do here.
  }
  return lines;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "taskdb-cmd-test-"));
  lines = [];
  projectCmd = buildProjectCommand(tmpDir, output);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// project (no subcommand)
// ---------------------------------------------------------------------------

describe("project (no subcommand)", () => {
  test("prints usage when called with no args", async () => {
    const out = (await capture([])).join("\n");
    expect(out).toContain("Usage: taskdb project");
    expect(out).toContain("Subcommands:");
  });

  test("prints usage for unknown subcommand", async () => {
    const out = (await capture(["bogus"])).join("\n");
    expect(out).toContain("Usage: taskdb project");
  });
});

// ---------------------------------------------------------------------------
// project create
// ---------------------------------------------------------------------------

describe("project create", () => {
  test("creates a project and outputs a confirmation", async () => {
    const out = (await capture(["create", "Test Project"])).join("\n");
    expect(out).toContain("test-project");
    expect(out).toContain("created");
  });

  test("creates the expected directory structure", async () => {
    await capture(["create", "Dir Test"]);

    const { existsSync, statSync } = await import("node:fs");
    const projectDir = join(tmpDir, "dir-test");
    expect(existsSync(projectDir)).toBe(true);
    expect(existsSync(join(projectDir, "metadata.json"))).toBe(true);
    expect(statSync(join(projectDir, "tasks")).isDirectory()).toBe(true);
  });

  test("writes correct metadata.json", async () => {
    await capture(["create", "Meta Check"]);
    const raw = await Bun.file(join(tmpDir, "meta-check", "metadata.json")).json();
    expect(raw.name).toBe("Meta Check");
    expect(raw.slug).toBe("meta-check");
    expect(raw.status).toBe("ready");
    expect(raw.tasks).toEqual([]);
  });

  test("errors when no name is provided", async () => {
    // Commander emits "missing required argument" via writeErr → captured in lines.
    const out = (await capture(["create"])).join("\n");
    expect(out).toContain("missing required argument");
  });

  test("errors when a project with the same slug already exists", async () => {
    await capture(["create", "Duplicate"]);
    const out = (await capture(["create", "Duplicate"])).join("\n");
    expect(out).toContain("Error");
    expect(out).toContain("duplicate");
    expect(out).toContain("already exists");
  });
});

// ---------------------------------------------------------------------------
// project view
// ---------------------------------------------------------------------------

describe("project view", () => {
  beforeEach(async () => {
    await capture(["create", "View Me"]);
  });

  test("shows project name, slug, and status", async () => {
    const out = (await capture(["view", "view-me"])).join("\n");
    expect(out).toContain("View Me");
    expect(out).toContain("view-me");
    expect(out).toContain("ready");
  });

  test("shows task count", async () => {
    const out = (await capture(["view", "view-me"])).join("\n");
    expect(out).toContain("0");
  });

  test("errors when no slug is provided", async () => {
    const out = (await capture(["view"])).join("\n");
    expect(out).toContain("missing required argument");
  });

  test("errors when project does not exist", async () => {
    const out = (await capture(["view", "does-not-exist"])).join("\n");
    expect(out).toContain("Error");
    expect(out).toContain("does-not-exist");
  });
});

// ---------------------------------------------------------------------------
// project status
// ---------------------------------------------------------------------------

describe("project status", () => {
  beforeEach(async () => {
    await capture(["create", "Status Test"]);
  });

  test("updates the project status and outputs confirmation", async () => {
    const out = (await capture(["status", "status-test", "in-progress"])).join("\n");
    expect(out).toContain("status-test");
    expect(out).toContain("in-progress");
    expect(out).toContain("updated");
  });

  test("persists the new status to metadata.json", async () => {
    await capture(["status", "status-test", "blocked"]);
    const raw = await Bun.file(join(tmpDir, "status-test", "metadata.json")).json();
    expect(raw.status).toBe("blocked");
  });

  test("accepts all valid status values", async () => {
    const statuses = ["ready", "in-progress", "blocked", "on-hold", "done"] as const;
    for (const s of statuses) {
      const out = (await capture(["status", "status-test", s])).join("\n");
      expect(out).not.toContain("Error");
    }
  });

  test("errors on invalid status", async () => {
    const out = (await capture(["status", "status-test", "unknown-status"])).join("\n");
    expect(out).toContain("Error");
    expect(out).toContain("unknown-status");
  });

  test("errors when no slug is provided", async () => {
    const out = (await capture(["status"])).join("\n");
    expect(out).toContain("missing required argument");
  });

  test("errors when project does not exist", async () => {
    const out = (await capture(["status", "ghost-project", "ready"])).join("\n");
    expect(out).toContain("Error");
    expect(out).toContain("ghost-project");
  });
});

// ---------------------------------------------------------------------------
// project delete
// ---------------------------------------------------------------------------

describe("project delete", () => {
  beforeEach(async () => {
    await capture(["create", "Doomed Project"]);
  });

  test("deletes the project and outputs confirmation", async () => {
    const out = (await capture(["delete", "doomed-project"])).join("\n");
    expect(out).toContain("doomed-project");
    expect(out).toContain("deleted");
  });

  test("removes the project directory", async () => {
    const { existsSync } = await import("node:fs");
    const projectDir = join(tmpDir, "doomed-project");

    expect(existsSync(projectDir)).toBe(true);
    await capture(["delete", "doomed-project"]);
    expect(existsSync(projectDir)).toBe(false);
  });

  test("errors when no slug is provided", async () => {
    const out = (await capture(["delete"])).join("\n");
    expect(out).toContain("missing required argument");
  });

  test("errors when project does not exist", async () => {
    const out = (await capture(["delete", "nonexistent"])).join("\n");
    expect(out).toContain("Error");
    expect(out).toContain("nonexistent");
  });
});
