import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { commentCommand } from "../../src/commands/comment.ts";
import { completeCommand } from "../../src/commands/complete.ts";
import { createCommand } from "../../src/commands/create.ts";
import { deleteCommand } from "../../src/commands/delete.ts";
import { initCommand } from "../../src/commands/init.ts";
import { viewCommand } from "../../src/commands/view.ts";
import {
  capture,
  cleanupTempProject,
  fakeProgram,
  makeTempProject,
} from "./_shared.ts";

let projectPath: string;

beforeEach(async () => {
  projectPath = await makeTempProject("taskdb-cmd-b");
  await initCommand(fakeProgram(projectPath), () => {}, { format: "quiet" });
  await createCommand(fakeProgram(projectPath), () => {}, "T", {
    description: "",
    status: "ready",
    format: "quiet",
  });
});

afterEach(async () => {
  await cleanupTempProject(projectPath);
});

describe("commands: comment/complete/delete", () => {
  test("comment appends comment", async () => {
    const plainOut = capture();
    await commentCommand(fakeProgram(projectPath), plainOut.output, "1", "note", {
      format: "plain",
    });
    expect(plainOut.lines[0]).toBe("#1: T - (Ready)");

    const out = capture();
    await viewCommand(fakeProgram(projectPath), out.output, "1", { format: "json" });
    const task = JSON.parse(out.lines.join("\n"));
    expect(task.comments.some((c: { comment: string }) => c.comment === "note")).toBe(
      true,
    );
  });

  test("complete moves status and adds audit comment", async () => {
    const plainOut = capture();
    await completeCommand(fakeProgram(projectPath), plainOut.output, "1", {
      format: "plain",
    });
    expect(plainOut.lines[0]).toBe("#1: T - (Complete)");

    const out = capture();
    await viewCommand(fakeProgram(projectPath), out.output, "1", { format: "json" });
    const task = JSON.parse(out.lines.join("\n"));
    expect(task.status).toBe("complete");
    expect(
      task.comments.some((c: { comment: string }) => c.comment.includes("complete")),
    ).toBe(true);
  });

  test("delete removes task", async () => {
    await deleteCommand(fakeProgram(projectPath), () => {}, "1", { format: "quiet" });

    const out = capture();
    await viewCommand(fakeProgram(projectPath), out.output, "1", { format: "plain" });
    expect(out.lines.join("\n")).toContain("not found");
  });
});
