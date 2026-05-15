import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { toSlug } from "../utils/slug.ts";
import type { ProjectStatus, TaskStatus } from "../types.ts";

interface ProjectParams {
  name: string;
  slug: string;
  /** Absolute path to the project directory (e.g. `/…/.tasks/my-project`). */
  path: string;
  description?: string;
  status?: ProjectStatus;
  tasks?: TaskStatus[];
}

export class Project {
  name: string;
  slug: string;
  /** Absolute path to the project directory. */
  path: string;
  description?: string;
  status: ProjectStatus;
  tasks: TaskStatus[];

  constructor(params: ProjectParams) {
    this.name = params.name;
    this.slug = params.slug;
    this.path = params.path;
    this.description = params.description;
    this.status = params.status ?? "ready";
    this.tasks = params.tasks ?? [];
  }

  // ---------------------------------------------------------------------------
  // Factory helpers
  // ---------------------------------------------------------------------------

  /**
   * Read `metadata.json` from `projectPath` and return a hydrated `Project`.
   *
   * @param projectPath  Path to the project directory (contains `metadata.json`).
   */
  static async readMetadata(projectPath: string): Promise<Project> {
    const metaPath = join(projectPath, "metadata.json");
    const raw = await Bun.file(metaPath).json();
    return new Project({
      name: raw.name,
      slug: raw.slug,
      path: projectPath,
      description: raw.description,
      status: raw.status,
      tasks: raw.tasks ?? [],
    });
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  /** Serialise current state to `<path>/metadata.json`. */
  async writeMetadata(): Promise<void> {
    const metaPath = join(this.path, "metadata.json");
    const payload: Record<string, unknown> = {
      name: this.name,
      slug: this.slug,
      status: this.status,
      tasks: this.tasks,
    };
    if (this.description !== undefined) {
      payload.description = this.description;
    }
    await Bun.write(metaPath, JSON.stringify(payload, null, 2) + "\n");
  }

  // ---------------------------------------------------------------------------
  // Computed properties
  // ---------------------------------------------------------------------------

  /**
   * The highest task number currently in use, or 0 if there are no tasks.
   * Use this to derive the next task number: `project.maxTaskNumber + 1`.
   */
  get maxTaskNumber(): number {
    if (this.tasks.length === 0) return 0;
    return Math.max(...this.tasks.map((t) => t.number));
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Create the directory structure: `<path>/tasks/`. */
  async scaffold(): Promise<void> {
    await mkdir(join(this.path, "tasks"), { recursive: true });
  }

  /**
   * High-level creation flow:
   *  1. Scaffold directories.
   *  2. Write `metadata.json`.
   */
  async create(): Promise<void> {
    await this.scaffold();
    await this.writeMetadata();
  }

  // ---------------------------------------------------------------------------
  // Mutations (each persists after mutating)
  // ---------------------------------------------------------------------------

  /** Rename the project and persist. The slug is re-derived from the new name. */
  async updateName(name: string): Promise<void> {
    this.name = name;
    this.slug = toSlug(name);
    await this.writeMetadata();
  }

  /** Update the description and persist. */
  async updateDescription(description: string): Promise<void> {
    this.description = description;
    await this.writeMetadata();
  }

  /** Change the status and persist. */
  async updateStatus(status: ProjectStatus): Promise<void> {
    this.status = status;
    await this.writeMetadata();
  }

  // ---------------------------------------------------------------------------
  // Task stubs (full implementation in a later milestone)
  // ---------------------------------------------------------------------------

  /** @stub Will add a task to this project. */
  async addTask(): Promise<void> {
    throw new Error("addTask: not yet implemented");
  }

  /** @stub Will update a task on this project. */
  async updateTask(): Promise<void> {
    throw new Error("updateTask: not yet implemented");
  }

  /** @stub Will delete a task from this project. */
  async deleteTask(): Promise<void> {
    throw new Error("deleteTask: not yet implemented");
  }

  // ---------------------------------------------------------------------------
  // Convenience wrappers
  // ---------------------------------------------------------------------------

  /** Close the project by setting status to `"done"` and persisting. */
  async close(): Promise<void> {
    await this.updateStatus("done");
  }

  /** Permanently delete the project directory and all its contents. */
  async delete(): Promise<void> {
    await rm(this.path, { recursive: true, force: true });
  }
}
