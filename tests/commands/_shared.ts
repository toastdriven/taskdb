import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";

export function capture(): { lines: string[]; output: (line: string) => void } {
  const lines: string[] = [];
  return { lines, output: (line: string) => lines.push(line) };
}

export function fakeProgram(projectPath: string): Command {
  return {
    opts: () => ({ project: projectPath }),
  } as unknown as Command;
}

export async function makeTempProject(prefix: string): Promise<string> {
  const projectPath = join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(projectPath, { recursive: true });
  return projectPath;
}

export async function cleanupTempProject(projectPath: string): Promise<void> {
  await rm(projectPath, { recursive: true, force: true });
}
