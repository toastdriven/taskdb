# `src/utils/env.ts`

## `parseCsvEnv(value: string | undefined, fallback: string[]): string[]`

Parses a comma-separated env var string into a trimmed string array.

Behavior:

- `undefined`/empty -> returns `fallback`
- trims whitespace around each entry
- drops empty entries
- if parsed list becomes empty, returns `fallback`

### Parameters

- `value`: raw env var value
- `fallback`: fallback array

### Returns

- parsed list or fallback

### Examples

```ts
parseCsvEnv("a, b, c", ["x"]); // ["a", "b", "c"]
parseCsvEnv(" , ", ["x"]);      // ["x"]
```
