import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createCommand } from "../../src/commands/create.ts";
import { initCommand } from "../../src/commands/init.ts";
import { listCommand } from "../../src/commands/list.ts";
import { searchCommand } from "../../src/commands/search.ts";
import {
  capture,
  cleanupTempProject,
  fakeProgram,
  makeTempProject,
} from "./_shared.ts";

let projectPath: string;

beforeEach(async () => {
  projectPath = await makeTempProject("taskdb-cmd-c");
  await initCommand(fakeProgram(projectPath), () => {}, { format: "quiet" });

  await createCommand(fakeProgram(projectPath), () => {}, "Alpha", {
    description: "needle alpha",
    status: "ready",
    labels: '["feat"]',
    format: "quiet",
  });
  await createCommand(fakeProgram(projectPath), () => {}, "Beta", {
    description: "needle beta",
    status: "in-progress",
    labels: '["feat","urgent"]',
    format: "quiet",
  });
  await createCommand(fakeProgram(projectPath), () => {}, "Gamma", {
    description: "other",
    status: "done",
    labels: '["chore"]',
    format: "quiet",
  });
});

afterEach(async () => {
  await cleanupTempProject(projectPath);
});

describe("commands: list/search", () => {
  test("list applies status and label filters", async () => {
    const out = capture();
    await listCommand(fakeProgram(projectPath), out.output, {
      status: "in-progress",
      labels: '["feat","urgent"]',
      format: "json",
    });

    const items = JSON.parse(out.lines.join("\n"));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Beta");
  });

  test("list plain output uses terse lines", async () => {
    const out = capture();
    await listCommand(fakeProgram(projectPath), out.output, {
      format: "plain",
    });

    expect(out.lines[0]).toBe("#1: Alpha - (Ready) - [feat]");
    expect(out.lines[1]).toBe("#2: Beta - (In-progress) - [feat, urgent]");
    expect(out.lines[2]).toBe("#3: Gamma - (Done) - [chore]");
  });

  test("search returns matches", async () => {
    const out = capture();
    await searchCommand(fakeProgram(projectPath), out.output, "needle", {
      format: "json",
    });

    const items = JSON.parse(out.lines.join("\n"));
    expect(items).toHaveLength(2);
    expect(items.map((t: { title: string }) => t.title)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  test("search plain output uses terse lines", async () => {
    const out = capture();
    await searchCommand(fakeProgram(projectPath), out.output, "needle", {
      format: "plain",
    });

    expect(out.lines[0]).toBe("#1: Alpha - (Ready) - [feat]");
    expect(out.lines[1]).toBe("#2: Beta - (In-progress) - [feat, urgent]");
  });
});
