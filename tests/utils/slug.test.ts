import { test, expect, describe } from "bun:test";
import { toSlug } from "../../src/utils/slug.ts";

describe("toSlug", () => {
  test("lowercases and trims", () => {
    expect(toSlug("  Hello World  ")).toBe("hello-world");
  });

  test("replaces spaces with hyphens", () => {
    expect(toSlug("My Cool Project")).toBe("my-cool-project");
  });

  test("strips non-alphanumeric characters (except hyphens)", () => {
    expect(toSlug("My Cool Project!")).toBe("my-cool-project");
    expect(toSlug("Fix: the bug (again)")).toBe("fix-the-bug-again");
  });

  test("collapses consecutive hyphens", () => {
    expect(toSlug("hello---world")).toBe("hello-world");
    expect(toSlug("foo  bar")).toBe("foo-bar");
  });

  test("strips leading/trailing hyphens", () => {
    expect(toSlug("-foo-")).toBe("foo");
    expect(toSlug("!hello!")).toBe("hello");
  });

  test("handles numbers", () => {
    expect(toSlug("Task 42")).toBe("task-42");
    expect(toSlug("123 go")).toBe("123-go");
  });

  test("handles already-slugged input", () => {
    expect(toSlug("my-slug")).toBe("my-slug");
  });

  test("handles empty string", () => {
    expect(toSlug("")).toBe("");
    expect(toSlug("   ")).toBe("");
  });
});
