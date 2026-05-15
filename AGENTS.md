
# taskdb — Agent Notes

## Project Overview

`taskdb` is a flatfile-powered task tracker implemented as a CLI application.
The entry point is `taskdb.ts` (shebang: `#!/usr/bin/env bun`), run with `bun taskdb.ts`.

### Data Layout

All data lives in `.tasks/` in the current working directory:

```
.tasks/
└── <project-slug>/
    ├── metadata.json
    └── tasks/
        └── <NNNNN-task-slug>.toml  # zero-padded to 5 digits
```

### Source Layout

```
taskdb.ts           # entry point (shebang)
src/
  cli.ts           # Commander program factory / run(args) function
  types.ts         # shared TypeScript types (OutputFn, Project, Task, ...)
  commands/
    index.ts       # registerAllCommands() — wires Commander subcommands
    project.ts     # project subcommand (create / view / status / delete)
  models/
    project.ts     # Project class (create / read / update / delete)
    task.ts        # Task class (create / read / update / delete)
  utils/
    datetime.ts    # nowRfc3339() — RFC 3339 timestamp helper
    slug.ts        # toSlug() — name → filesystem-safe slug
tests/             # bun test files
```

### Supported Subcommands (planned)

| Group   | Subcommand        | Description                    |
|---------|-------------------|--------------------------------|
| —       | `help`            | Show help information          |
| project | `project create`  | Create a new project           |
| project | `project view`    | View project details           |
| project | `project status`  | Change project status          |
| project | `project delete`  | Delete a project               |
| task    | `task create`     | Create a task within a project |
| task    | `task update`     | Update a task                  |
| task    | `task status`     | Change task status             |
| task    | `task delete`     | Delete a task                  |

### CLI Framework

Uses [Commander.js](https://tj.github.io/commander.js/) for argument parsing, subcommands, and help generation.
Import `Command` from `commander`.

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
