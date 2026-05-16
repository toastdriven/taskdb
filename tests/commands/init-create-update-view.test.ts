import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { Project } from "../../src/models/project.ts";
import { createCommand } from "../../src/commands/create.ts";
import { initCommand } from "../../src/commands/init.ts";
import { updateCommand } from "../../src/commands/update.ts";
import { viewCommand } from "../../src/commands/view.ts";
import {
  capture,
  cleanupTempProject,
  fakeProgram,
  makeTempProject,
} from "./_shared.ts";

let projectPath: string;

beforeEach(async () => {
  projectPath = await makeTempProject("taskdb-cmd-a");
});

afterEach(async () => {
  await cleanupTempProject(projectPath);
});

describe("commands: init/create/update/view", () => {
  test("init scaffolds and is idempotent", async () => {
    const out1 = capture();
    await initCommand(fakeProgram(projectPath), out1.output, { format: "plain" });
    expect(out1.lines.join("\n")).toContain("Initialised project");

    const out2 = capture();
    await initCommand(fakeProgram(projectPath), out2.output, { format: "plain" });
    expect(out2.lines.join("\n")).toContain("already");

    const project = new Project({ path: projectPath });
    expect(await project.isInitialized()).toBe(true);
  });

  test("create errors when project is not initialized", async () => {
    const out = capture();
    await createCommand(fakeProgram(projectPath), out.output, "Nope", {
      description: "",
      status: "ready",
      format: "plain",
    });

    expect(out.lines.join("\n")).toContain("project not initialised");
  });

  test("create/update/view happy path", async () => {
    await initCommand(fakeProgram(projectPath), () => {}, { format: "quiet" });

    const createOut = capture();
    await createCommand(fakeProgram(projectPath), createOut.output, "Alpha", {
      description: "first desc",
      status: "in-progress",
      labels: '["feat"]',
      format: "json",
    });
    const created = JSON.parse(createOut.lines.join("\n"));
    expect(created.title).toBe("Alpha");
    expect(created.status).toBe("in-progress");
    expect(created.labels).toEqual(["feat"]);

    await updateCommand(fakeProgram(projectPath), () => {}, "1", {
      title: "Beta",
      description: "updated",
      labels: '["bug","p1"]',
      status: "done",
      format: "quiet",
    });

    const viewOut = capture();
    await viewCommand(fakeProgram(projectPath), viewOut.output, "1", {
      format: "json",
    });
    const viewed = JSON.parse(viewOut.lines.join("\n"));
    expect(viewed.title).toBe("Beta");
    expect(viewed.description).toBe("updated");
    expect(viewed.labels).toEqual(["bug", "p1"]);
    expect(viewed.status).toBe("done");
  });

  test("view raw returns markdown", async () => {
    await initCommand(fakeProgram(projectPath), () => {}, { format: "quiet" });
    await createCommand(fakeProgram(projectPath), () => {}, "Rawy", {
      description: "raw body",
      status: "ready",
      format: "quiet",
    });

    const out = capture();
    await viewCommand(fakeProgram(projectPath), out.output, "1", { format: "raw" });
    const text = out.lines.join("\n");
    expect(text).toContain("---");
    expect(text).toContain("Rawy");
  });
});
