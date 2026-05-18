# Guide: LLM/agent planning workflow with `taskdb`

`taskdb` is a good fit for agentic workflows because each task is a file and every status change is explicit.


## Aside: "Why would my agent need task tracking?"

Everything in an LLM's world, beyond what it was originally trained on, revolves around context windows. It only knows what it currently has access to: the prompt(s) you gave it, whatever `AGENTS.md` (or similar) that were given to it, and anything it has read or accessed in the current session. And that context window fills up fast, not to mention eating tokens, which costs you money.

**Giving an agent access to a task tracker essentially expands its understanding of what's been done _infinitely_, _without_ bloating/blowing-out the context window.**

With a task tracker, all of a sudden, the following benefits appear:

* History (kinda obvious, but beyond a normal session)
    * gives the LLM the ability to record what it's planning to do
    * everything that's **ever** been done
    * and what's left to do
* Divide & Conquer:
    * let's the LLM resume work from previous sessions (with small/focused context windows)
    * ...or to split it between multiple subagents (parallelize)
    * ...or multiple LLMs! (e.g. start in Claude, switch to Ollama, end in Codex)
* User Insight & Control
    * gives you (the user) insight into the plan
    * you can embelish the tasks without more prompts, or adding to a context window
    * forces the LLM to _"show its work"_
    * you can pick up tasks yourself, or add to the pile


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

- Use `taskdb create` for each subtask.
- Move active work to `in-progress`.
- Add comments as progress notes and decision logs.
- Mark completed work with `taskdb complete <task-identifier>`.
- Prefer small, reviewable tasks over large umbrella tasks.
```

## Minimal command sequence

```bash
taskdb create "Define contact form schema" --labels='["feat","frontend"]'
taskdb create "Implement React contact form UI" --labels='["feat","frontend"]'
taskdb create "Add POST /contact handler" --labels='["feat","backend"]'

taskdb update 12 --status=in-progress
taskdb comment 12 "Schema agreed: name/email/message"
taskdb complete 12
```
