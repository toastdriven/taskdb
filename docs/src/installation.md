# Installation

taskdb runs on [Bun](https://bun.sh) — a fast JavaScript/TypeScript runtime. You'll need that installed first.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Bun](https://bun.sh) | ≥ 1.0 | Runtime & package manager |
| [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`) | any | Optional — used by `taskdb search`. Falls back to `grep` if absent. |

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

Or via Homebrew on macOS:

```bash
brew install bun
```

---

## Install taskdb

### Option A — From source (recommended for now)

Clone the repo and install dependencies:

```bash
$ git clone https://github.com/toastdriven/taskdb.git
$ cd taskdb
$ bun install
```

Then either run it directly:

```bash
bun taskdb.ts <command>
```

Or add a shell alias so you can use it anywhere:

```bash
# bash / zsh — add to ~/.bashrc or ~/.zshrc
alias taskdb="bun /path/to/taskdb/taskdb.ts"

# fish — add to ~/.config/fish/config.fish
alias taskdb="bun /path/to/taskdb/taskdb.ts"
```

### Option B — Global install via Bun (when published)

```bash
bun add -g @taskdb/cli
```

> **Note:** Package registry publishing is not yet set up. Use Option A for now.

---

## Verify it works

```bash
$ taskdb --version
# or
$ taskdb --help
```

You should see the help output listing all available subcommands.

---

## Project initialisation

Once taskdb is installed, run this once inside each project you want to track tasks for:

```bash
$ taskdb init
Initialised project at: .tasks
```

This creates the `.tasks/` directory structure. You can commit it to git — all the task files are plain Markdown.

> **Tip:** You can point taskdb at a different directory with `--project=<path>` or the `TASKDB_PROJECT_PATH` environment variable. Handy if you want to share one task directory across several related repos.
