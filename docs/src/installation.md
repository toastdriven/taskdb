# Installation

The goal is to install once, then run `taskdb ...` directly from your shell.

## Option A (recommended): install the release binary

```bash
curl -fsSL https://raw.githubusercontent.com/toastdriven/taskdb/main/scripts/install.sh | bash
```

This installs `taskdb` to `/usr/local/bin` by default (or `$INSTALL_DIR` if set).

## Option B: global install with Bun

Requires [Bun](https://bun.sh):

```bash
# install Bun (if needed)
curl -fsSL https://bun.sh/install | bash

# install taskdb globally
bun add -g taskdb
```

## Verify installation

```bash
taskdb --help
# or
taskdb --version
```

## Initialize a project

Run once inside the project you want to track:

```bash
taskdb init
```

This creates the `.tasks/` directory structure.

> Tip: override the project path with `--project=<path>` or `TASKDB_PROJECT_PATH`.
