# Guide: LLM/agent planning workflow with taskdb

taskdb is a good fit for agentic workflows because each task is a file and every status change is explicit.

## Example feature request

> “I’d like to add a React-based contact form to my website.”

An agent can break this into tasks:

- Define fields + validation rules
- Create React form component
- Add server endpoint
- Add spam protection and tests
- Document usage

Then track each step via CLI updates/comments.

## Suggested AGENTS.md snippet

```md
## Task Tracking

Before starting multi-step work, create tasks in `taskdb`.

- Use `bun taskdb.ts create` for each subtask.
- Move active work to `in-progress`.
- Add comments as progress notes and decision logs.
- Mark completed work with `bun taskdb.ts complete <id>`.
- Prefer small, reviewable tasks over large umbrella tasks.
```

## Minimal command sequence

```bash
bun taskdb.ts create "Define contact form schema" --labels='["feat","frontend"]'
bun taskdb.ts create "Implement React contact form UI" --labels='["feat","frontend"]'
bun taskdb.ts create "Add POST /contact handler" --labels='["feat","backend"]'

bun taskdb.ts update 12 --status=in-progress
bun taskdb.ts comment 12 "Schema agreed: name/email/message"
bun taskdb.ts complete 12
```
