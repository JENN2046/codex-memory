# Context Intake Contract

Purpose: keep Codex work on `codex-memory` fast, current, and auditable without loading long historical state into every turn.

This contract controls the default context packet for project work. It does not weaken `AGENTS.md`, `.agent_board/CURRENT_FACTS.json` schema v2, Red Lane approvals, validation gates, or source/test authority.

## Default Intake Packet

For normal repository work, load only:

- fresh Git facts from `git status --short --branch`, `git log --oneline --decorate -n 5`, and `git diff --stat`
- current task, status, route, validation, and next action from `CURRENT_STATE.md`
- machine-readable status snapshot from `.agent_board/CURRENT_FACTS.json`
- changed files or files directly relevant to the requested decision
- validation output relevant to the current decision
- explicit boundary declaration for side effects and hard stops
- the requested decision or implementation target

Do not default-load full historical checkpoint, handoff, validation, task, status, or audit logs.

## Historical Evidence Rule

Historical evidence enters context by reference first:

- task id
- validation id
- commit id when target-bound
- evidence document path
- archive index path

Only open the full historical artifact when the current decision depends on its exact wording or proof details.

## Authority Order

When context conflicts, use this order:

1. Fresh Git output and observed command output.
2. Current source and tests.
3. `CURRENT_STATE.md`.
4. `.agent_board/CURRENT_FACTS.json`.
5. Active blocks in `.agent_board`.
6. Archive indexes and historical evidence docs.
7. Prior conversation or memory.

Historical state is advisory until rechecked against repository reality.

## Forbidden Default Context

Do not paste or default-load:

- full `.agent_board/CHECKPOINT.md`
- full `.agent_board/HANDOFF.md`
- full `.agent_board/VALIDATION_LOG.md`
- full `.agent_board/TASK_QUEUE.md`
- full `STATUS.md` historical archive
- raw memory, raw audit, raw `.jsonl`, raw SQLite, secrets, tokens, provider keys, or private store content

## Closeout Rule

Every meaningful local work slice should leave:

- `CURRENT_STATE.md` updated with the short current state
- `.agent_board/CURRENT_FACTS.json` updated as a committed status/validation snapshot when the task changes
- active `.agent_board` files updated as short current ledgers, not long history dumps
- archive index references for any compressed historical material

Validation evidence should state what was run and what was not run. Docs-only, fixture-only, read-only, and live-runtime evidence must not be mixed.

