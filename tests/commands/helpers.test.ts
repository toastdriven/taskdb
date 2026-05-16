import { describe, expect, test } from "bun:test";
import { getProjectPath, parseLabelsOption } from "../../src/commands/helpers.ts";

describe("commands/helpers", () => {
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
    expect(parseLabelsOption('["bug","easy"]', (line) => lines.push(line))).toEqual([
      "bug",
      "easy",
    ]);
    expect(lines).toHaveLength(0);
  });

  test("parseLabelsOption returns null and emits error for invalid JSON", () => {
    const lines: string[] = [];
    const parsed = parseLabelsOption("{bad json", (line) => lines.push(line));
    expect(parsed).toBeNull();
    expect(lines.join("\n")).toContain("--labels must be a JSON array");
  });
});
