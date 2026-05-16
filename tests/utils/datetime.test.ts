import { test, expect, describe } from "bun:test";
import { makeRfc3339 } from "../../src/utils/datetime.ts";

describe("makeRfc3339", () => {
  test("returns a string", () => {
    expect(typeof makeRfc3339()).toBe("string");
  });

  test("matches RFC 3339 format", () => {
    const result = makeRfc3339();
    // e.g. "2026-05-14T18:26:13.246-05:00" or "2026-05-14T18:26:13.246+00:00"
    expect(result).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/
    );
  });

  test("accepts a specific Date", () => {
    // Use a fixed UTC date to make the test timezone-independent in its assertion
    const date = new Date("2026-05-14T23:26:13.246Z");
    const result = makeRfc3339(date);
    expect(result).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.246[+-]\d{2}:\d{2}$/
    );
    // Milliseconds should always be 246
    expect(result).toContain(".246");
  });

  test("includes milliseconds", () => {
    const date = new Date("2026-01-01T00:00:00.123Z");
    expect(makeRfc3339(date)).toContain(".123");
  });

  test("uses local offset sign correctly", () => {
    const result = makeRfc3339(new Date());
    expect(result).toMatch(/[+-]\d{2}:\d{2}$/);
  });
});
