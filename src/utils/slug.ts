/**
 * Convert a human-readable name into a URL/filesystem-safe slug.
 *
 * Rules applied in order:
 *  1. Trim surrounding whitespace.
 *  2. Lowercase.
 *  3. Strip any character that is not a-z, 0-9, whitespace, or a hyphen.
 *  4. Replace runs of whitespace with a single hyphen.
 *  5. Collapse consecutive hyphens into one.
 *  6. Strip leading/trailing hyphens.
 *
 * @example toSlug("My Cool Project!") → "my-cool-project"
 * @example toSlug("  Hello   World  ") → "hello-world"
 */
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
