# CHECKPOINT.md - codex-memory

## Current Goal

P36-P40 Boundary-first Governed Memory Spine.

## Current Area

P8 memory governance / P36 Scope And A5 Boundary Contract.

## Current Status

- Last pushed baseline: `3e3f76d fix: harden local http and governance redaction` on `origin/main`.
- Local branch was aligned with `origin/main` before current uncommitted CM-0307 work.
- Latest pushed task chain: P35.1 fixture contract, P35 post-push board reconciliation, and P35 security hardening.
- Current task: CM-0307 / P36-T1 Scope + A5 Boundary Contract fixture, validated and ready for scoped guarded local commit.
- CM-0307 validation passed so far: `node --check tests\p36-scope-a5-boundary-contract-fixture.test.js`, targeted fixture test `12/12`, `npm test` `739/739`, `git diff --check`, docs validation, and boundary scan with only expected hard-stop policy wording.

## Active Boundaries

- Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.
- v1.0 RC remains `NOT_READY_BLOCKED`.
- P36-P40 default mode is local, fixture-only, and dry-run-only unless a task explicitly states otherwise.
- Unknown, missing, ambiguous, or unparsable scope metadata fails closed.
- Unknown risk label is `A5-hard-stop`; critical skipped/unknown gate result fails.
- Governance records, validation transcripts, redaction samples, and policy decisions must not enter normal user recall namespaces.
- A5 actions remain blocked: push, tag, release, deploy, provider/model call, real memory content read/preview/export/import/scan, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, dependency change, durable memory/audit write, and production deploy.

## Context Compression

- The pre-compression full checkpoint was moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- The pre-compression full root status/plan/backlog docs were moved to `docs/archive/*_FULL_PRE_CM0302.md`.
- P34.x closeout review was added at `docs/P34_GOVERNANCE_REVIEW_SURFACE_CLOSEOUT_REVIEW.md`.
- P35 policy gate planning is recorded at `docs/P35_GOVERNED_MEMORY_SPINE_POLICY_GATE_PLAN.md`.
- P36-T1 fixture/test/doc were added at `tests/fixtures/p36-scope-a5-boundary-contract-v1.json`, `tests/p36-scope-a5-boundary-contract-fixture.test.js`, and `docs/P36_SCOPE_A5_BOUNDARY_CONTRACT.md`.
- Active `CHECKPOINT.md` is now a short current-state checkpoint.
- Detailed historical validation remains in `.agent_board/VALIDATION_LOG.md`.
- Detailed task ledger remains in `.agent_board/TASK_QUEUE.md`.
- Current operational state remains in `.agent_board/RUN_STATE.md` and `.agent_board/HANDOFF.md`.

## Next Safe Step

Create a guarded local CM-0307 commit if staged diff remains scoped. Push remains user-directed and not authorized. Next safe task after CM-0307 is P36-T2 Task Risk Labels Contract, still fixture-only / dry-run-only.
