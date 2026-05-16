# Guide: `taskdb` as a lightweight GitHub Issues replacement

For small teams/projects, `taskdb` can replace Issues with local, versioned task files.

## Why this works

- Tasks are plain Markdown + YAML frontmatter.
- You can review task changes in pull requests.
- Status is visible via symlink directories (`ready/`, `in-progress/`, `done/`, `complete/`).
- No external service required.

## Team workflow

1. Keep `.tasks/` committed to git.
2. Create tasks for bugs/features.
3. Reference task IDs in commits/PRs.
4. Update status/comments during implementation.
5. Complete tasks when merged.

## Conventions to adopt

- Labels: `bug`, `feat`, `docs`, `chore`, `priority:high`
- Comments should include decisions and blockers.
- Use `taskdb list --labels='["bug"]'` for triage views.

## Tradeoffs

- No hosted UI out of the box.
- No built-in assignees/milestones.
- Best for low/medium scale projects where git is already the source of truth.
