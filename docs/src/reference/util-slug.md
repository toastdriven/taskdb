# `src/utils/slug.ts`

## `toSlug(name: string): string`

Converts human-readable text into a filesystem-safe slug.

Rules (in order):

1. trim
2. lowercase
3. remove non `[a-z0-9\s-]`
4. replace whitespace runs with `-`
5. collapse repeated `-`
6. strip leading/trailing `-`

### Parameters

- `name`: input string

### Returns

- normalized slug

### Examples

```ts
toSlug("My Cool Project!"); // "my-cool-project"
toSlug("  Hello   World  "); // "hello-world"
```
