import { test, expect } from "bun:test";
import { run } from "../src/cli.ts";

// Helper: capture all output lines from a run() call.
async function capture(args: string[]): Promise<{ lines: string[]; exitCode: number }> {
  const lines: string[] = [];
  const exitCode = await run(args, (line) => lines.push(line));
  return { lines, exitCode };
}

test("help command prints usage line", async () => {
  const { lines } = await capture(["help"]);
  expect(lines[0]).toBe("Usage: taskdb <command> [options]");
});

test("help command lists known commands", async () => {
  const { lines } = await capture(["help"]);
  const output = lines.join("\n");
  // Commander renders each subcommand name and description in the help block.
  const knownCommands = [
    { name: "help", description: "Show help information." },
    { name: "project", description: "Manage projects" },
    { name: "task", description: "Manage tasks" },
  ];
  for (const cmd of knownCommands) {
    expect(output).toContain(cmd.name);
    expect(output).toContain(cmd.description);
  }
});

test("no args falls back to help and exits 0", async () => {
  const { lines, exitCode } = await capture([]);
  expect(exitCode).toBe(0);
  expect(lines[0]).toBe("Usage: taskdb <command> [options]");
});

test("unknown command exits 1 and prints error", async () => {
  const { lines, exitCode } = await capture(["unknown-cmd"]);
  expect(exitCode).toBe(1);
  expect(lines[0]).toContain("unknown command");
  expect(lines[0]).toContain("unknown-cmd");
});
