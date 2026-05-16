# `src/utils/datetime.ts`

## `makeRfc3339(date?: Date): string`

Formats a date as RFC 3339 with:

- millisecond precision
- local timezone offset (`±HH:MM`)

### Parameters

- `date` (optional): `Date` to format. Defaults to `new Date()`.

### Returns

- RFC 3339 datetime string.

### Example

```ts
makeRfc3339();
// "2026-05-14T18:26:13.246-05:00"
```
