import { describe, expect, test } from "bun:test";
import { parseCsvEnv } from "../../src/utils/env.ts";

describe("parseCsvEnv", () => {
  test("returns fallback when value is undefined", () => {
    expect(parseCsvEnv(undefined, ["a", "b"])).toEqual(["a", "b"]);
  });

  test("parses comma-separated values", () => {
    expect(parseCsvEnv("ready,in-progress,done", ["x"])).toEqual([
      "ready",
      "in-progress",
      "done",
    ]);
  });

  test("trims surrounding whitespace", () => {
    expect(parseCsvEnv(" ready,  in-progress ,done ", ["x"])).toEqual([
      "ready",
      "in-progress",
      "done",
    ]);
  });

  test("drops empty entries", () => {
    expect(parseCsvEnv("ready,, ,done", ["x"])).toEqual(["ready", "done"]);
  });

  test("returns fallback when parsed entries are all empty", () => {
    expect(parseCsvEnv(" , , ", ["all"])).toEqual(["all"]);
  });
});
