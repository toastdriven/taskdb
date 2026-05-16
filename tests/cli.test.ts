import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { run } from "../src/cli.ts";

let projectPath: string;

function capture(): { lines: string[]; output: (l: string) => void } {
  const lines: string[] = [];
  return { lines, output: (l: string) => lines.push(l) };
}

async function cmd(
  args: string[],
  out = capture(),
): Promise<{ lines: string[]; code: number }> {
  const code = await run(["--project", projectPath, ...args], out.output);
  return { lines: out.lines, code };
}

beforeEach(async () => {
  projectPath = join(
    tmpdir(),
    `taskdb-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(projectPath, { recursive: true });
});

afterEach(async () => {
  await rm(projectPath, { recursive: true, force: true });
});

describe("CLI smoke", () => {
  test("no args exits 0", async () => {
    const out = capture();
    const code = await run([], out.output);
    expect(code).toBe(0);
  });

  test("help exits 0", async () => {
    const { code } = await cmd(["help"]);
    expect(code).toBe(0);
  });

  test("unknown command exits 1", async () => {
    const { lines, code } = await cmd(["nope"]);
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("unknown command");
  });

  test("--version exits 0", async () => {
    const { code } = await cmd(["--version"]);
    expect(code).toBe(0);
  });

  test("wires end-to-end init/create/view", async () => {
    await cmd(["init", "--format", "quiet"]);
    await cmd(["create", "CLI Task", "--format", "quiet"]);
    const { lines, code } = await cmd(["view", "1", "--format", "json"]);
    expect(code).toBe(0);
    const task = JSON.parse(lines.join("\n"));
    expect(task.title).toBe("CLI Task");
  });
});
