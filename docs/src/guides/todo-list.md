# Guide: Use `taskdb` as a simple TODO tracker

If you just want a clean personal TODO workflow, `taskdb` works well with a tiny status flow:

- `ready`
- `in-progress`
- `done`
- `complete`

## Typical daily loop

```bash
# See what's ready
taskdb list --status=ready

# Create a task
taskdb create "Refactor auth middleware" --labels='["chore"]'

# Pick it up
taskdb update 3 --status=in-progress

# Add progress notes
taskdb comment 3 "Extracted shared validator"

# Finish
taskdb update 3 --status=done
taskdb complete 3
```

## Tips

- Keep titles short and action-oriented.
- Put details in `--description`.
- Use labels (`feat`, `bug`, `docs`, `chore`) for quick filtering.
- Run `taskdb search "keyword"` when you remember text, not IDs.
