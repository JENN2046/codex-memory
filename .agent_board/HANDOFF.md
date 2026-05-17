# HANDOFF.md - codex-memory

## Goal

Execute the P28-P40 Governed Memory Spine long-running goal under Persistent 4-Agent Council mode.

## Workspace

`A:\codex-memory`

## Branch

`main`

## Worktree

Dirty for CM-0305 P35.1 governed memory policy gate fixture/test plus status/board updates after CM-0304 local commit.

## Current Area

P8 memory governance policy gate fixture contract.

## Current Truth

- `origin/main` baseline: `d210947 fix: redact governance helper output`.
- Local commits ahead: `83bd388`, `9d3ab69`, `b9965f7`, `280ab9b`, `c06436d`, `4d8d11a`, `3d774ad`, `8220d64`, `29858e6`.
- Latest local commit: `29858e6 docs: plan p35 policy gate`.
- P34 chain status: inventory, fixture contract, explicit-input helper, and ValidationAggregator static report-shape evidence are complete locally.
- Current release state: `P34_GOVERNANCE_REVIEW_SURFACE_REPORT_SHAPE_ADDED_RUNTIME_STILL_BLOCKED`.
- Current task: CM-0305 P35.1 governed memory policy gate fixture contract.

## Validation

- CM-0300 passed: changed JS syntax checks; fixture JSON parse; targeted aggregator/helper tests `31/31`; `npm test` `714/714`; `git diff --check`; docs validation; P34.3 boundary scan; read-only Verifier `PASS`.
- CM-0303 passed and is committed locally in `8220d64`.
- CM-0304 passed and is committed locally in `29858e6`.
- CM-0305 validation passed: JS syntax check, targeted fixture test `11/11`, `npm test` `725/725`, `git diff --check`, docs validation, and P35.1 boundary scan. First read-only Verifier found board validation-state wording only; read-only Verifier rerun passed.

## Hard Stops

No push, tag, release, deploy, provider/model call, real memory preview/export/import, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, production deploy, or durable memory/audit write is authorized.

## Context Compression

- Full pre-compression handoff moved to `.agent_board/archive/HANDOFF_FULL_PRE_CM0301.md`.
- Full pre-compression checkpoint moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- Active handoff/checkpoint now contain only current operational state and pointers.
- Full pre-compression root status/plan/backlog docs were moved to `docs/archive/*_FULL_PRE_CM0302.md`.
- Historical details remain recoverable from git history, the archive files, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md`.

## Next Safe Step

Create a guarded local CM-0305 commit if scoped. After that, continue with P35.2 explicit-input helper candidate only if it remains pure local input normalization with no runtime side effects.
