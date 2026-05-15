import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "smol-toml";
import type { TaskLabel, TaskLifecycleStatus, TaskUpdate } from "../types.ts";
import { makeRfc3339 } from "../utils/datetime.ts";
import { toSlug } from "../utils/slug.ts";

interface TaskParams {
  number: number;
  name: string;
  slug: string;
  /** Absolute path to the parent project root (e.g. `/…/.tasks/my-project`). */
  projectPath: string;
  description: string;
  label: TaskLabel;
  status: TaskLifecycleStatus;
  created: string;
  updated: string;
  updates?: TaskUpdate[];
}

export class Task {
  number: number;
  name: string;
  slug: string;
  /** Absolute path to the parent project root. */
  projectPath: string;
  description: string;
  label: TaskLabel;
  status: TaskLifecycleStatus;
  /** RFC 3339 datetime when the task was created. */
  created: string;
  /** RFC 3339 datetime when the task was last updated. */
  updated: string;
  updates: TaskUpdate[];

  constructor(params: TaskParams) {
    this.number = params.number;
    this.name = params.name;
    this.slug = params.slug;
    this.projectPath = params.projectPath;
    this.description = params.description;
    this.label = params.label;
    this.status = params.status;
    this.created = params.created;
    this.updated = params.updated;
    this.updates = params.updates ?? [];
  }

  // ---------------------------------------------------------------------------
  // Computed properties
  // ---------------------------------------------------------------------------

  /** Absolute path to the task's TOML file. */
  get makeFilepath(): string {
    const paddedNumber = String(this.number).padStart(5, "0");
    const filename = `${paddedNumber}-${this.slug}.toml`;
    return join(this.projectPath, "tasks", filename);
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  /**
   * Read a task TOML file and return a hydrated `Task`.
   *
   * @param filePath  Absolute path to the `.toml` task file.
   * @param projectPath  Absolute path to the parent project root.
   */
  static async read(filePath: string, projectPath: string): Promise<Task> {
    const raw = await Bun.file(filePath).text();
    const doc = parse(raw) as Record<string, unknown>;

    const metadata = doc.metadata as Record<string, unknown>;
    const rawUpdates =
      (doc.updates as Record<string, unknown>[] | undefined) ?? [];

    return new Task({
      number: metadata.number as number,
      name: doc.name as string,
      slug: metadata.slug as string,
      projectPath,
      description: doc.description as string,
      label: doc.label as TaskLabel,
      status: doc.status as TaskLifecycleStatus,
      created: metadata.created as string,
      updated: metadata.updated as string,
      updates: rawUpdates.map((u) => ({
        created: u.created as string,
        comment: u.comment as string,
      })),
    });
  }

  /** Serialise current state and write to the task's TOML file. */
  async write(): Promise<void> {
    const doc: Record<string, unknown> = {
      name: this.name,
      label: this.label,
      status: this.status,
      description: this.description,
      metadata: {
        number: this.number,
        slug: this.slug,
        created: this.created,
        updated: this.updated,
      },
      updates: this.updates.map((u) => ({
        created: u.created,
        comment: u.comment,
      })),
    };

    await Bun.write(this.makeFilepath, stringify(doc));
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * High-level creation flow:
   *  1. Derive `slug` from `name`.
   *  2. Stamp `created` and `updated`.
   *  3. Write the TOML file.
   */
  async create(): Promise<void> {
    this.slug = toSlug(this.name);
    const now = makeRfc3339();
    this.created = now;
    this.updated = now;
    await this.write();
  }

  // ---------------------------------------------------------------------------
  // Mutations (each persists after mutating)
  // ---------------------------------------------------------------------------

  /** Rename the task. Re-derives `slug` from the new name and persists.
   *  Note: the filename on disk retains the original slug from creation. */
  async updateName(name: string, updateSlug: boolean = false): Promise<void> {
    this.name = name;
    if (updateSlug === true) {
      this.slug = toSlug(name);
    }
    this.updated = makeRfc3339();
    await this.write();
  }

  /** Change the label and persist. */
  async updateLabel(label: TaskLabel): Promise<void> {
    this.label = label;
    this.updated = makeRfc3339();
    await this.write();
  }

  /** Change the status and persist. */
  async updateStatus(status: TaskLifecycleStatus): Promise<void> {
    this.status = status;
    this.updated = makeRfc3339();
    await this.write();
  }

  /** Update the description and persist. */
  async updateDescription(description: string): Promise<void> {
    this.description = description;
    this.updated = makeRfc3339();
    await this.write();
  }

  /**
   * Append a timestamped update comment, bump `updated`, and persist.
   *
   * @param comment  Markdown text describing the update.
   */
  async addTaskUpdate(comment: string): Promise<void> {
    const now = makeRfc3339();
    this.updates.push({ created: now, comment });
    this.updated = now;
    await this.write();
  }

  /** Permanently delete the task file from disk. */
  async delete(): Promise<void> {
    await unlink(this.makeFilepath);
  }
}
