# `src/utils/strings.ts`

## `capitalizeFirst(value: string): string`

Capitalizes the first character in a string using locale-aware uppercasing.

Behavior:

- Empty string returns unchanged.
- First character uses `toLocaleUpperCase()`.
- Remaining string is unchanged.

### Parameters

- `value`: input string

### Returns

- input with first character capitalized

### Example

```ts
capitalizeFirst("in-progress"); // "In-progress"
```
