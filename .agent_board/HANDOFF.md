# HANDOFF.md - codex-memory

## Goal

Execute the P41-P45 Evidence-First Gate Spine long-running goal under Commander -> Architect -> Red Team -> Worker -> Verifier mode.

## Workspace

`A:\codex-memory`

## Branch

`main`

## Worktree

Dirty for CM-0313 P41-T1 docs/status/board-only closeout.

## Current Area

P8 memory governance / P41 Post-P40 Closeout + Evidence Manifest Charter.

## Current Truth

- `origin/main` baseline: `3e3f76d fix: harden local http and governance redaction`.
- Local branch is ahead of `origin/main` by local CM-0307 `408a92c`, CM-0308 `d1f48c2`, CM-0309 `cb7d1ef`, CM-0310 `251af9c`, CM-0311 `1ed25ad`, CM-0312 `6f7ade4`, and post-P40 board sync `ba59537`.
- Latest pushed implementation/test commit: `3e3f76d`; latest local implementation/test commit: `6f7ade4`; latest local board/status commit: `ba59537`.
- P34/P35 chain status: P34 review surface, P35 policy gate planning/fixture, and P35 security hardening are pushed.
- Current release/readiness state: P36-P40 local evidence chain complete only; v1.0 RC remains `NOT_READY_BLOCKED`.
- Current task: CM-0313 P41-T1 Post-P40 Closeout Review.

## Validation

- CM-0307 validation passed: `node --check tests\p36-scope-a5-boundary-contract-fixture.test.js`; `node --test tests\p36-scope-a5-boundary-contract-fixture.test.js` (`12/12`); `npm test` (`739/739`); `git diff --check`; docs validation.
- CM-0312 validation passed: `node --check tests\p40-local-readiness-report-fixture.test.js`; targeted fixture test `9/9`; `npm test` `790/790`; docs validation; `git diff --check`; boundary scan; read-only Verifier scope review `PASS`.
- Boundary scan found only expected forbidden-claim / hard-stop wording; read-only Verifier review found no migration planner implementation, real memory access, migration apply, backup/restore, provider, public MCP, durable write, config, remote, or deploy action.

## Hard Stops

No push, tag, release, deploy, provider/model call, real memory content read/preview/export/import/scan, diary/SQLite/vector/candidate/recall-audit scan, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, production deploy, dependency change, or durable memory/audit write is authorized.

## Context Compression

- Full pre-compression handoff moved to `.agent_board/archive/HANDOFF_FULL_PRE_CM0301.md`.
- Full pre-compression checkpoint moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- Active handoff/checkpoint now contain only current operational state and pointers.
- Full pre-compression root status/plan/backlog docs were moved to `docs/archive/*_FULL_PRE_CM0302.md`.
- Historical details remain recoverable from git history, the archive files, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md`.

## Next Safe Step

Validate CM-0313. If scoped and validated, create a guarded local commit only; push remains blocked unless explicitly requested. Next safe local task is P41-T2 evidence manifest contract fixture.
