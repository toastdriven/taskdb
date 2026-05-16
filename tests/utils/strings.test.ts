import { describe, expect, test } from "bun:test";
import { capitalizeFirst } from "../../src/utils/strings.ts";

describe("capitalizeFirst", () => {
  test("returns empty string unchanged", () => {
    expect(capitalizeFirst("")).toBe("");
  });

  test("capitalizes first letter", () => {
    expect(capitalizeFirst("hello world")).toBe("Hello world");
  });

  test("leaves rest of string unchanged", () => {
    expect(capitalizeFirst("hELLO")).toBe("HELLO");
  });

  test("handles single-character strings", () => {
    expect(capitalizeFirst("a")).toBe("A");
  });

  test("uses locale-aware uppercasing for first character", () => {
    expect(capitalizeFirst("éclair")).toBe("Éclair");
  });
});
