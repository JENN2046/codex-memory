# HANDOFF.md - codex-memory

## Goal

Execute the P36-P40 Boundary-first Governed Memory Spine long-running goal under Commander -> Architect -> Red Team -> Worker -> Verifier mode.

## Workspace

`A:\codex-memory`

## Branch

`main`

## Worktree

CM-0307 P36-T1 docs/fixture/test/board changes are local, validated, and under guarded commit review.

## Current Area

P8 memory governance / P36 Scope And A5 Boundary Contract.

## Current Truth

- `origin/main` baseline: `3e3f76d fix: harden local http and governance redaction`.
- Local branch is aligned with `origin/main` before current uncommitted CM-0307 work.
- Latest pushed implementation/test commit: `3e3f76d`.
- P34/P35 chain status: P34 review surface, P35 policy gate planning/fixture, and P35 security hardening are pushed.
- Current release/readiness state: boundary-first P36 planning; v1.0 RC remains `NOT_READY_BLOCKED`.
- Current task: CM-0307 P36-T1 Scope + A5 Boundary Contract fixture, validated and ready for scoped guarded local commit if staged diff remains clean.

## Validation

- CM-0307 validation passed: `node --check tests\p36-scope-a5-boundary-contract-fixture.test.js`; `node --test tests\p36-scope-a5-boundary-contract-fixture.test.js` (`12/12`); `npm test` (`739/739`); `git diff --check`; docs validation.
- Boundary scan found only expected hard-stop policy wording; read-only Verifier review found no scope violation before commit staging.

## Hard Stops

No push, tag, release, deploy, provider/model call, real memory content read/preview/export/import/scan, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, production deploy, dependency change, or durable memory/audit write is authorized.

## Context Compression

- Full pre-compression handoff moved to `.agent_board/archive/HANDOFF_FULL_PRE_CM0301.md`.
- Full pre-compression checkpoint moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- Active handoff/checkpoint now contain only current operational state and pointers.
- Full pre-compression root status/plan/backlog docs were moved to `docs/archive/*_FULL_PRE_CM0302.md`.
- Historical details remain recoverable from git history, the archive files, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md`.

## Next Safe Step

Create a guarded local CM-0307 commit if staged diff remains scoped; push remains blocked unless explicitly requested. Next safe task after CM-0307 is P36-T2 Task Risk Labels Contract, still fixture-only / dry-run-only.
