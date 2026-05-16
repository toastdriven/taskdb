/**
 * Parse a comma-separated environment variable value into a trimmed string array.
 *
 * Empty values and whitespace-only entries are discarded.
 * If no usable values remain, the provided fallback array is returned.
 *
 * @param value Raw environment variable value.
 * @param fallback Fallback array used when `value` is missing/empty.
 * @returns Parsed string array or fallback.
 *
 * @example
 * parseCsvEnv("a, b, c", ["x"]) // ["a", "b", "c"]
 * @example
 * parseCsvEnv(" , ", ["x"]) // ["x"]
 */
export function parseCsvEnv(
  value: string | undefined,
  fallback: string[],
): string[] {
  if (!value) return fallback;
  const parsed = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}
