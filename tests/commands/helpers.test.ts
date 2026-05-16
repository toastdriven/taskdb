import { describe, expect, test } from "bun:test";
import {
  formatFullTask,
  formatTask,
  formatTaskJSON,
  formatTaskList,
  formatTaskListJSON,
  getProjectPath,
  parseLabelsOption,
} from "../../src/commands/helpers.ts";
import { Task } from "../../src/models/task.ts";

describe("commands/helpers", () => {
  function makeTask(overrides: Partial<Task> = {}): Task {
    return new Task({
      id: 1,
      slug: "my-task",
      title: "My Task",
      labels: ["feat", "p1"],
      created: "2026-05-16T00:00:00.000-05:00",
      updated: "2026-05-16T00:01:00.000-05:00",
      description: "Task details",
      comments: [
        { commentedAt: "2026-05-16T00:02:00.000-05:00", comment: "One note" },
      ],
      projectPath: "/tmp/project",
      status: "in-progress",
      ...overrides,
    });
  }

  test("getProjectPath prefers CLI option", () => {
    expect(getProjectPath({ project: "/tmp/custom" })).toBe("/tmp/custom");
  });

  test("getProjectPath falls back to default", () => {
    const original = process.env.TASKDB_PROJECT_PATH;
    delete process.env.TASKDB_PROJECT_PATH;
    expect(getProjectPath({})).toBe(".tasks");
    process.env.TASKDB_PROJECT_PATH = original;
  });

  test("parseLabelsOption parses valid JSON array", () => {
    const lines: string[] = [];
    expect(
      parseLabelsOption('["bug","easy"]', (line) => lines.push(line)),
    ).toEqual(["bug", "easy"]);
    expect(lines).toHaveLength(0);
  });

  test("parseLabelsOption returns null and emits error for invalid JSON", () => {
    const lines: string[] = [];
    const parsed = parseLabelsOption("{bad json", (line) => lines.push(line));
    expect(parsed).toBeNull();
    expect(lines.join("\n")).toContain("--labels must be a JSON array");
  });

  test("formatTask renders one terse line", () => {
    const task = makeTask();
    const lines: string[] = [];
    formatTask(task, (line) => lines.push(line));
    expect(lines).toEqual(["#1: My Task - (In-progress) - [feat, p1]"]);
  });

  test("formatTaskJSON renders task JSON", () => {
    const task = makeTask();
    const lines: string[] = [];
    formatTaskJSON(task, (line) => lines.push(line));
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.id).toBe(1);
    expect(parsed.title).toBe("My Task");
  });

  test("formatFullTask renders multi-line details", () => {
    const task = makeTask();
    const lines: string[] = [];
    formatFullTask(task, (line) => lines.push(line));
    const out = lines.join("\n");
    expect(out).toContain("Id: #1");
    expect(out).toContain("Title: My Task");
    expect(out).toContain("Slug: my-task");
    expect(out).toContain("Status: in-progress");
    expect(out).toContain("Full Path: /tmp/project/all/00000/00001-my-task.md");
    expect(out).toContain("Comments:");
    expect(out).toContain("One note");
  });

  test("formatTaskList renders terse lines", () => {
    const lines: string[] = [];
    formatTaskList(
      [makeTask(), makeTask({ id: 2, title: "Second", slug: "second" })],
      (line) => lines.push(line),
    );
    expect(lines[0]).toBe("#1: My Task - (In-progress) - [feat, p1]");
    expect(lines[1]).toBe("#2: Second - (In-progress) - [feat, p1]");
  });

  test("formatTaskList renders no-tasks message", () => {
    const lines: string[] = [];
    formatTaskList([], (line) => lines.push(line));
    expect(lines).toEqual(["No tasks found."]);
  });

  test("formatTaskListJSON renders JSON array", () => {
    const lines: string[] = [];
    formatTaskListJSON([makeTask()], (line) => lines.push(line));
    const parsed = JSON.parse(lines.join("\n"));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe(1);
  });
});
