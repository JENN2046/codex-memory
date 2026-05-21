# A4.8 Safe Project Operator Rail

Updated: 2026-05-21

## Purpose

The A4.8 Safe Project Operator Rail lets Codex keep moving through safe, validated project work toward VCP memory practical parity without turning autonomy into unlimited permission.

A4.8 is an operating rail for `codex-memory`, not a release mode and not production authority.

A4.8 now uses [Smart Standing Authorization v3 - Budgeted Autonomy Envelope](/A:/codex-memory/docs/STANDING_OWNER_SMART_AUTHORIZATION_V3.md) for standing owner authorization. Green work runs directly, Amber work may run continuously inside exact budgets with receipts, and Red work still stops for explicit user approval.

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
- can run exact in-envelope Amber steps with receipts
- must stop for Red Lane

### Red Lane Explicit Approval Zone

- real production / high-risk execution
- broad real DB/memory mutation, scan, export, import, or migration
- MCP public tool expansion
- provider/external calls outside the v3 envelope
- release/deploy/tag
- secrets, destructive actions, config/watchdog/startup changes, and unscoped dependency changes
- requires explicit user approval

## A4.6 vs A4.8 vs A5

`A4.6` is a guarded autopilot: it can sustain a known safe task, validate it, and create guarded local commits. It usually expects the user or a written phase contract to name the next phase.

`A4.8` is a safe project operator: it may inspect the roadmap, backlog, `STATUS.md`, and `.agent_board`, select the next safe local phase, split work into risk-shaped subphases, run the appropriate validation, create guarded commits, run push readiness, and safe-push validated low-risk work when the safe-push policy passes.

In short, A4.8 can auto-plan, auto-execute, auto-validate, auto-commit, auto-readiness, and safe-push when the work remains inside the safe-push policy.

`A5` / Red Lane is not implied by A4.8. Red includes high-risk or externally side-effectful work such as broad real durable mutation, migrations, public MCP tool expansion, provider calls outside the envelope, releases, tags, deploys, destructive operations, dependency changes without an exact package/action list, or secret/config edits. Red always requires explicit user approval.

`Smart Standing Authorization v3` adds a bounded Amber envelope: exact provider probes, exact runtime probes, exact MCP memory calls, exact sanitized one-record memory writes, exact external reads, and exact small dependency actions may proceed without step-by-step approval only when they are task-scoped, budgeted, validated, and receipted.

## What A4.8 May Do

- inspect code, docs, fixtures, tests, scripts, and `.agent_board`
- read the roadmap/backlog/board and choose the next safe local phase
- write docs, fixtures, tests, and dry-run-only CLIs when the phase allows them
- update `.agent_board` state
- select and run local validation from the validation matrix
- run exact Amber actions inside the default autonomy envelope when the task requires them
- record receipts after meaningful Amber external/write actions
- create guarded local commits after validation passes and diff scope is clean
- run push readiness after guarded commits
- safe-push when the safe-push policy passes

## Supreme Commander Application

The [Supreme Commander Autopilot Protocol](/A:/codex-memory/docs/SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md) is the current top-level application of this rail.

It names the controlling A4.8 role that reconciles repository reality, chooses the next safe local task, writes Worker contracts, runs validation, updates `.agent_board`, records Amber receipts, and stops at Red boundaries with an approval packet instead of executing the blocked action.

## What A4.8 Must Not Do

- bypass any Red Lane hard stop
- run broad real memory scans, exports, imports, migrations, or unscoped durable mutations
- run SQLite migration or `ALTER TABLE` on a real DB without explicit approval
- expand public MCP tools or MCP schema without explicit approval
- edit `.env`, secrets, provider keys, or credential-bearing files
- add, remove, upgrade, or change dependencies/package managers without an exact package/action list and remaining envelope budget
- run provider-smoke or provider-benchmark unless the task explicitly needs provider evidence and the v3 provider-call budget covers it
- run `rebuild-profile --confirm`
- tag, release, deploy, or publish
- merge/rebase/cherry-pick `codex/p1-vcp-memory-core-100-roadmap`
- use destructive rollback commands without explicit approval

## Current Project Application

For P12 controlled write work:

- public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`
- controlled write phases must stay exact, sanitized, receipted, and fail-closed
- exact sanitized `record_memory` can be Amber only within v3 budget, default maximum one write, with explicit content, target, purpose, validation, and receipt
- broad write, broad scan/export, raw private data, and raw chat history exposure remain Red
- every future durable memory change must be scoped, sourced, audited, reversible, and privacy-safe
- no raw secrets may enter audit output
- no raw `workspace_id` may appear in low-risk summaries

## Related Rails

- [SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md](/A:/codex-memory/docs/SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md)
- [SAFE_PUSH_POLICY.md](/A:/codex-memory/docs/SAFE_PUSH_POLICY.md)
- [VALIDATION_SELECTION_MATRIX.md](/A:/codex-memory/docs/VALIDATION_SELECTION_MATRIX.md)
- [AUTOPILOT_FAILURE_RECOVERY.md](/A:/codex-memory/docs/AUTOPILOT_FAILURE_RECOVERY.md)
