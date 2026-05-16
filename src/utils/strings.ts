/**
 * Capitalize the first character of a string using locale-aware casing.
 *
 * @param value Input string.
 * @returns String with first character uppercased (locale-aware).
 * @example capitalizeFirst("hello") // "Hello"
 */
export function capitalizeFirst(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
