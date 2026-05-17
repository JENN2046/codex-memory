# HANDOFF.md - codex-memory

## Goal

Execute the P28-P40 Governed Memory Spine long-running goal under Persistent 4-Agent Council mode.

## Workspace

`A:\codex-memory`

## Branch

`main`

## Worktree

Dirty for CM-0302 root active docs compression after CM-0301 local commit.

## Current Area

P6 docs drift / active docs context hygiene.

## Current Truth

- `origin/main` baseline: `d210947 fix: redact governance helper output`.
- Local commits ahead: `83bd388`, `9d3ab69`, `b9965f7`, `280ab9b`, `c06436d`.
- Latest local commit: `4d8d11a docs: compress active board handoff`.
- P34 chain status: inventory, fixture contract, explicit-input helper, and ValidationAggregator static report-shape evidence are complete locally.
- Current release state: `P34_GOVERNANCE_REVIEW_SURFACE_REPORT_SHAPE_ADDED_RUNTIME_STILL_BLOCKED`.
- Current task: CM-0302 root active docs compression.

## Validation

- CM-0300 passed: changed JS syntax checks; fixture JSON parse; targeted aggregator/helper tests `31/31`; `npm test` `714/714`; `git diff --check`; docs validation; P34.3 boundary scan; read-only Verifier `PASS`.
- CM-0301 passed and is committed locally in `4d8d11a`.
- CM-0302 pending validation: docs-only diff check, docs validation, active-doc archive/reference scan, and read-only Verifier.

## Hard Stops

No push, tag, release, deploy, provider/model call, real memory preview/export/import, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, production deploy, or durable memory/audit write is authorized.

## Context Compression

- Full pre-compression handoff moved to `.agent_board/archive/HANDOFF_FULL_PRE_CM0301.md`.
- Full pre-compression checkpoint moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- Active handoff/checkpoint now contain only current operational state and pointers.
- Full pre-compression root status/plan/backlog docs are being moved to `docs/archive/*_FULL_PRE_CM0302.md`.
- Historical details remain recoverable from git history, the archive files, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md`.

## Next Safe Step

Finish CM-0302 validation and guarded local commit if scoped. After that, continue with P34.x closeout or another small docs-context hygiene pass, whichever is the highest-value safe local task.
