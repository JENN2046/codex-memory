# HANDOFF.md - codex-memory

## Goal

Execute the P28-P40 Governed Memory Spine long-running goal under Persistent 4-Agent Council mode.

## Workspace

`A:\codex-memory`

## Branch

`main`

## Worktree

Dirty for CM-0301 active-board compression after CM-0300 local commit.

## Current Area

P6 docs drift / active-board context hygiene.

## Current Truth

- `origin/main` baseline: `d210947 fix: redact governance helper output`.
- Local commits ahead: `83bd388`, `9d3ab69`, `b9965f7`, `280ab9b`, `c06436d`.
- Latest local commit: `c06436d test: add p34 aggregator review evidence`.
- P34 chain status: inventory, fixture contract, explicit-input helper, and ValidationAggregator static report-shape evidence are complete locally.
- Current release state: `P34_GOVERNANCE_REVIEW_SURFACE_REPORT_SHAPE_ADDED_RUNTIME_STILL_BLOCKED`.

## Validation

- CM-0300 passed: changed JS syntax checks; fixture JSON parse; targeted aggregator/helper tests `31/31`; `npm test` `714/714`; `git diff --check`; docs validation; P34.3 boundary scan; read-only Verifier `PASS`.
- CM-0301 pending validation: docs/board-only diff check, docs validation, context-compression reference scan, and read-only Verifier.

## Hard Stops

No push, tag, release, deploy, provider/model call, real memory preview/export/import, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, production deploy, or durable memory/audit write is authorized.

## Context Compression

- Full pre-compression handoff moved to `.agent_board/archive/HANDOFF_FULL_PRE_CM0301.md`.
- Full pre-compression checkpoint moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- Active handoff/checkpoint now contain only current operational state and pointers.
- Historical details remain recoverable from git history, the archive files, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md`.

## Next Safe Step

Finish CM-0301 validation and guarded local commit if scoped. After that, continue with a small docs/status stale-entry compression pass or P34.x closeout, whichever is the highest-value safe local task.
