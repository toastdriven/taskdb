import matter from "gray-matter";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  ALL_TASKS_DIR,
  COMMENTS_HEADER,
  DESCRIPTION_HEADER,
  MAX_FILES_PER_DIR,
} from "../constants.ts";
import type { TaskComment } from "../types.ts";
import { makeRfc3339 } from "../utils/datetime.ts";
import { toSlug } from "../utils/slug.ts";

/** Constructor params for {@link Task}. */
interface TaskParams {
  /** Integer task id. */
  id: number;
  /** Filesystem-safe slug (normally derived from title at creation time). */
  slug: string;
  /** Human-readable task title. */
  title: string;
  /** Arbitrary label/tag strings. */
  labels: string[];
  /** RFC 3339 creation timestamp. */
  created: string;
  /** RFC 3339 last-update timestamp. */
  updated: string;
  /** Free-form markdown description body. */
  description: string;
  /** Chronological task comments. */
  comments: TaskComment[];
  /** Absolute path to the project root (e.g. `/…/.tasks`). */
  projectPath: string;
  /** Current status directory name (if known). Not stored in the file. */
  status?: string;
}

/**
 * Domain model representing one task file in a taskdb project.
 *
 * Encapsulates Markdown/YAML serialization, persistence, and common mutations.
 */
export class Task {
  /** Integer task id. */
  id: number;
  /** Immutable-on-create slug used in filename. */
  slug: string;
  /** Human-readable task title. */
  title: string;
  /** Arbitrary label/tag strings. */
  labels: string[];
  /** RFC 3339 datetime of creation (immutable after first write). */
  created: string;
  /** RFC 3339 datetime of last update. */
  updated: string;
  /** Free-form markdown description content. */
  description: string;
  /** Chronological task comments. */
  comments: TaskComment[];
  /** Absolute path to the project root. */
  projectPath: string;
  /** Current status directory name (filesystem-derived, not stored in file). */
  status?: string;

  /**
   * Create an in-memory task instance.
   *
   * @param params Task attributes and project context.
   */
  constructor(params: TaskParams) {
    this.id = params.id;
    this.slug = params.slug;
    this.title = params.title;
    this.labels = params.labels;
    this.created = params.created;
    this.updated = params.updated;
    this.description = params.description;
    this.comments = params.comments;
    this.projectPath = params.projectPath;
    this.status = params.status;
  }

  // ── Static helpers ──────────────────────────────────────────────────────────

  /**
   * The 10-digit zero-padded id string stored in YAML frontmatter.
   * @example Task.idString(1) → "0000000001"
   */
  static idString(id: number): string {
    return String(id).padStart(10, "0");
  }

  /**
   * The 5-digit zero-padded id prefix used in filenames and directory names.
   * @example Task.idPad(1) → "00001"
   */
  static idPad(id: number): string {
    return String(id).padStart(5, "0");
  }

  /**
   * The group directory name for a given task id.
   * Tasks are grouped in batches of 32,768 to stay under filesystem limits.
   * @example Task.groupDir(1) → "00000"  (ids 1–32768)
   * @example Task.groupDir(32769) → "00001"
   */
  static groupDir(id: number): string {
    return String(Math.floor((id - 1) / MAX_FILES_PER_DIR)).padStart(5, "0");
  }

  /**
   * Build the separator that joins description and comments sections.
   *
   * @returns Markdown separator including comments heading and spacing.
   */
  static buildCommentsSeparator(): string {
    return `\n---\n\n${COMMENTS_HEADER}\n\n`;
  }

  // ── Computed paths ──────────────────────────────────────────────────────────

  /** Filename (basename only): `<NNNNN>-<slug>.md` */
  get filename(): string {
    return `${Task.idPad(this.id)}-${this.slug}.md`;
  }

  /** Absolute path to the real task file inside `all/`. */
  get filePath(): string {
    return join(
      this.projectPath,
      ALL_TASKS_DIR,
      Task.groupDir(this.id),
      this.filename,
    );
  }

  /** Absolute path to this task's group directory inside `all/`. */
  get groupDirPath(): string {
    return join(this.projectPath, ALL_TASKS_DIR, Task.groupDir(this.id));
  }

  // ── Serialization ───────────────────────────────────────────────────────────

  /**
   * Parse the description and comments out of the Markdown body (the portion
   * after the frontmatter, as returned by `gray-matter`).
   *
   * Expected body structure:
   *
   * ```
   * \n## Description\n\n<text>\n\n---\n\n## Task Comments\n\n<table>
   * ```
   *
   * The description section is optional; the comments section is always present
   * in files written by this library.
   */
  static parseBody(content: string): {
    description: string;
    comments: TaskComment[];
  } {
    const commentsHeaderBlock = `${COMMENTS_HEADER}\n\n`;
    const commentsSeparator = Task.buildCommentsSeparator();

    let descriptionRaw = "";
    let commentsRaw = "";

    const sepIdx = content.indexOf(commentsSeparator);
    if (sepIdx !== -1) {
      descriptionRaw = content.slice(0, sepIdx);
      commentsRaw = content.slice(sepIdx + commentsSeparator.length);
    } else {
      // No `---` separator — might start directly with the comments section
      const hdrIdx = content.indexOf(commentsHeaderBlock);
      if (hdrIdx !== -1) {
        descriptionRaw = content.slice(0, hdrIdx);
        commentsRaw = content.slice(hdrIdx + commentsHeaderBlock.length);
      } else {
        // No comments section at all (old or partial file)
        descriptionRaw = content;
      }
    }

    // Strip optional description heading prefix.
    const descriptionHeaderBlock = `${DESCRIPTION_HEADER}\n\n`;
    let description = descriptionRaw.trim();
    if (description.startsWith(descriptionHeaderBlock)) {
      description = description.slice(descriptionHeaderBlock.length).trim();
    } else if (description.startsWith(DESCRIPTION_HEADER)) {
      description = description.slice(DESCRIPTION_HEADER.length).trim();
    }

    const comments = commentsRaw.trim() ? Task.parseComments(commentsRaw) : [];

    return { description, comments };
  }

  /**
   * Parse a Markdown table of comments.
   * Expects a table where row 1 is the header, row 2 is the separator (`| --- |`),
   * and subsequent rows are data.
   */
  static parseComments(tableText: string): TaskComment[] {
    const lines = tableText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("|") && l.endsWith("|"));

    // Skip header row + separator row
    return lines.slice(2).map((line) => {
      const cells = line
        .slice(1, -1) // strip leading/trailing |
        .split("|")
        .map((c) => c.trim());
      return {
        commentedAt: cells[0] ?? "",
        comment: cells[1] ?? "",
      };
    });
  }

  /**
   * Build the Markdown body (description section + comments table).
   * Will be passed to `matter.stringify` as the content.
   */
  buildBody(): string {
    const tableLines = [
      "| Commented At | Comment |",
      "| --- | --- |",
      ...this.comments.map((c) => `| ${c.commentedAt} | ${c.comment} |`),
    ];

    if (this.description.trim()) {
      const descriptionSection = `${DESCRIPTION_HEADER}\n\n${this.description.trim()}`;
      const commentsSection = tableLines.join("\n");
      return `\n${descriptionSection}${Task.buildCommentsSeparator()}${commentsSection}\n`;
    }

    return `\n${COMMENTS_HEADER}\n\n${tableLines.join("\n")}\n`;
  }

  /** Build the complete file content (YAML frontmatter + Markdown body). */
  buildFileContent(): string {
    const frontmatter: Record<string, unknown> = {
      id: Task.idString(this.id),
      slug: this.slug,
      title: this.title,
      labels: this.labels,
      created: this.created,
      updated: this.updated,
    };
    return matter.stringify(this.buildBody(), frontmatter);
  }

  // ── Factory ─────────────────────────────────────────────────────────────────

  /**
   * Read a task from its Markdown file and return a hydrated `Task`.
   *
   * @param filePath     Absolute path to the `.md` task file.
   * @param projectPath  Absolute path to the project root.
   * @param status       Current status directory name (if known).
   */
  static async read(
    filePath: string,
    projectPath: string,
    status?: string,
  ): Promise<Task> {
    const raw = await Bun.file(filePath).text();
    const { data, content } = matter(raw);

    const { description, comments } = Task.parseBody(content);

    return new Task({
      id: parseInt(String(data.id), 10),
      slug: String(data.slug),
      title: String(data.title),
      labels: Array.isArray(data.labels) ? (data.labels as string[]) : [],
      created: String(data.created),
      updated: String(data.updated),
      description,
      comments,
      projectPath,
      status,
    });
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  /**
   * Persist the task to disk.
   *
   * Ensures the grouped directory exists, then writes the canonical markdown file.
   */
  async write(): Promise<void> {
    await mkdir(this.groupDirPath, { recursive: true });
    await Bun.write(this.filePath, this.buildFileContent());
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * First-time creation flow:
   * 1. Derive `slug` from `title`.
   * 2. Stamp `created` and `updated`.
   * 3. Write the file.
   */
  async create(): Promise<void> {
    this.slug = toSlug(this.title);
    const now = makeRfc3339();
    this.created = now;
    this.updated = now;
    await this.write();
  }

  /** Append a timestamped comment, bump `updated`, and persist. */
  async addComment(comment: string): Promise<void> {
    const now = makeRfc3339();
    this.comments.push({ commentedAt: now, comment });
    this.updated = now;
    await this.write();
  }

  /**
   * Update task title and persist.
   *
   * @param title New task title.
   */
  async updateTitle(title: string): Promise<void> {
    this.title = title;
    this.updated = makeRfc3339();
    await this.write();
  }

  /**
   * Update task description and persist.
   *
   * @param description New description markdown.
   */
  async updateDescription(description: string): Promise<void> {
    this.description = description;
    this.updated = makeRfc3339();
    await this.write();
  }

  /**
   * Replace task labels and persist.
   *
   * @param labels Full replacement set of labels.
   */
  async updateLabels(labels: string[]): Promise<void> {
    this.labels = labels;
    this.updated = makeRfc3339();
    await this.write();
  }

  /** Permanently delete the task file. Does NOT touch any symlinks. */
  async deleteFile(): Promise<void> {
    await unlink(this.filePath);
  }

  // ── Presentation ─────────────────────────────────────────────────────────────

  /**
   * Convert this task to a JSON-serializable plain object.
   *
   * @returns Plain object suitable for CLI JSON output.
   */
  toJSON(): object {
    return {
      id: this.id,
      slug: this.slug,
      title: this.title,
      labels: this.labels,
      status: this.status ?? null,
      created: this.created,
      updated: this.updated,
      description: this.description,
      comments: this.comments,
    };
  }
}
