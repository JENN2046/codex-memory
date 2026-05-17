# HANDOFF.md - codex-memory

## Goal

Execute the P36-P40 Boundary-first Governed Memory Spine long-running goal under Commander -> Architect -> Red Team -> Worker -> Verifier mode.

## Workspace

`A:\codex-memory`

## Branch

`main`

## Worktree

Dirty for CM-0309 P37-T1 docs/fixture/test/board updates.

## Current Area

P8 memory governance / P36 Scope And A5 Boundary Contract.

## Current Truth

- `origin/main` baseline: `3e3f76d fix: harden local http and governance redaction`.
- Local branch is ahead of `origin/main` by local CM-0307 `408a92c` and CM-0308 `d1f48c2`.
- Latest pushed implementation/test commit: `3e3f76d`; latest local commit: `d1f48c2`.
- P34/P35 chain status: P34 review surface, P35 policy gate planning/fixture, and P35 security hardening are pushed.
- Current release/readiness state: boundary-first P36 planning; v1.0 RC remains `NOT_READY_BLOCKED`.
- Current task: CM-0309 P37-T1 Policy Decision Envelope Fixture Matrix.

## Validation

- CM-0307 validation passed: `node --check tests\p36-scope-a5-boundary-contract-fixture.test.js`; `node --test tests\p36-scope-a5-boundary-contract-fixture.test.js` (`12/12`); `npm test` (`739/739`); `git diff --check`; docs validation.
- CM-0309 validation passed: `node --check tests\p37-policy-decision-envelope-fixture.test.js`; targeted fixture test `11/11`; `npm test` `761/761`; `git diff --check`; docs validation.
- Boundary scan found only expected forbidden-claim / isolation wording; read-only Verifier review found no runtime, public MCP, provider, real-memory, dependency, config, remote, vector, candidate, diary, recall, projection, or audit-summary integration.

## Hard Stops

No push, tag, release, deploy, provider/model call, real memory content read/preview/export/import/scan, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, production deploy, dependency change, or durable memory/audit write is authorized.

## Context Compression

- Full pre-compression handoff moved to `.agent_board/archive/HANDOFF_FULL_PRE_CM0301.md`.
- Full pre-compression checkpoint moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- Active handoff/checkpoint now contain only current operational state and pointers.
- Full pre-compression root status/plan/backlog docs were moved to `docs/archive/*_FULL_PRE_CM0302.md`.
- Historical details remain recoverable from git history, the archive files, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md`.

## Next Safe Step

Create a guarded local CM-0309 commit if staged diff remains scoped; push remains blocked unless explicitly requested. Next safe task after CM-0309 is P38 Recall Isolation Fixtures, still synthetic fixture-only.
