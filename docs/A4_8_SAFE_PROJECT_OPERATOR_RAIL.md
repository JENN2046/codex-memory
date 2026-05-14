# A4.8 Safe Project Operator Rail

Updated: 2026-05-14

## Purpose

The A4.8 Safe Project Operator Rail lets Codex keep moving through safe, local, validated project work toward VCP memory practical parity without turning autonomy into unlimited permission.

A4.8 is an operating rail for `codex-memory`, not a release mode and not production authority.

## Rail Ladder

### A4.6 Guardian Autopilot Rail

- safe sustained autopilot
- user still often provides explicit next phase
- can guarded commit
- can safe-push only when explicitly allowed or pre-authorized

### A4.8 Safe Project Operator Rail

- project operator rail
- can read roadmap/backlog/board
- can choose next safe phase
- can split large phases into planning -> fixture -> dry-run -> runtime -> gate -> observability
- can run validation selection automatically
- can guarded commit automatically
- can run push readiness automatically
- can safe-push when all safe-push conditions pass
- must stop for A5

### A5 Explicit Approval Zone

- real production / high-risk execution
- real DB/memory mutation
- migration
- MCP public tool expansion
- provider/external calls
- release/deploy/tag
- requires explicit user approval

## A4.6 vs A4.8 vs A5

`A4.6` is a guarded autopilot: it can sustain a known safe task, validate it, and create guarded local commits. It usually expects the user or a written phase contract to name the next phase.

`A4.8` is a safe project operator: it may inspect the roadmap, backlog, `STATUS.md`, and `.agent_board`, select the next safe local phase, split work into risk-shaped subphases, run the appropriate validation, create guarded commits, run push readiness, and safe-push validated low-risk work when the safe-push policy passes.

In short, A4.8 can auto-plan, auto-execute, auto-validate, auto-commit, auto-readiness, and safe-push when the work remains inside the safe-push policy.

`A5` is not implied by A4.8. A5 includes high-risk or externally side-effectful work such as real durable mutation, migrations, public MCP tool expansion, provider calls, releases, tags, deploys, destructive operations, dependency changes, or secret/config edits. A5 always requires explicit user approval.

## What A4.8 May Do

- inspect code, docs, fixtures, tests, scripts, and `.agent_board`
- read the roadmap/backlog/board and choose the next safe local phase
- write docs, fixtures, tests, and dry-run-only CLIs when the phase allows them
- update `.agent_board` state
- select and run local validation from the validation matrix
- create guarded local commits after validation passes and diff scope is clean
- run push readiness after guarded commits
- safe-push when the safe-push policy passes

## What A4.8 Must Not Do

- bypass any A5 hard stop
- mutate real memory or real DB state without explicit approval
- run SQLite migration or `ALTER TABLE` on a real DB without explicit approval
- expand public MCP tools or MCP schema without explicit approval
- edit `.env`, secrets, provider keys, or credential-bearing files
- add, remove, upgrade, or change dependencies/package managers
- run provider-smoke or provider-benchmark unless explicitly requested
- run `rebuild-profile --confirm`
- tag, release, deploy, or publish
- merge/rebase/cherry-pick `codex/p1-vcp-memory-core-100-roadmap`
- use destructive rollback commands without explicit approval

## Current Project Application

For P12 controlled write work:

- public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`
- controlled write phases must stay dry-run-first
- P12.5 runtime mutation remains blocked until explicit approval
- every future durable memory change must be scoped, sourced, audited, reversible, and privacy-safe
- no raw secrets may enter audit output
- no raw `workspace_id` may appear in low-risk summaries

## Related Rails

- [SAFE_PUSH_POLICY.md](/A:/codex-memory/docs/SAFE_PUSH_POLICY.md)
- [VALIDATION_SELECTION_MATRIX.md](/A:/codex-memory/docs/VALIDATION_SELECTION_MATRIX.md)
- [AUTOPILOT_FAILURE_RECOVERY.md](/A:/codex-memory/docs/AUTOPILOT_FAILURE_RECOVERY.md)
