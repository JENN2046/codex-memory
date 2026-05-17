# codex-memory Next Phase Plan

更新时间：2026-05-17

## Purpose

This active plan is the short routing document for the current P28-P40 Governed Memory Spine program. The full pre-compression plan is archived at [docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md).

## Current Direction

1. Keep reducing stale context pollution in active docs.
2. Continue P35 governed memory spine policy gate work with small local, reversible, fixture-first/read-only slices.
3. Preserve all runtime, durable-write, public MCP, provider, migration/import-export, release, and deploy blockers.

## Current Completed Local Chain

- P34 inventory: future read-only governance review surface only.
- P34.1 fixture contract: synthetic review-surface fixture/test.
- P34.2 helper: pure explicit-input helper over caller-provided review surface objects.
- P34.3 ValidationAggregator evidence: static report-shape evidence only, committed locally in `c06436d`.
- CM-0301 context hygiene: active board checkpoint/handoff compressed, committed locally in `4d8d11a`.
- CM-0302 root docs hygiene: active status/plan/backlog docs compressed, committed locally in `3d774ad`.
- P34.x closeout: governance review surface safe-scope chain closed locally in `8220d64`.

## Current Task

P35 governed memory spine policy gate planning:

- Define a future fixture-first policy gate over P31-P34 evidence.
- Keep `decision=NOT_READY_BLOCKED`.
- Do not implement runtime policy enforcement.
- Do not approve governed actions or write durable state.

## Boundaries

- v1.0 RC remains `NOT_READY_BLOCKED`.
- Public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`.
- Do not implement runtime governance review.
- Do not run `governance:report` against a real DB for this task.
- Do not write durable audit/memory records.
- Do not run provider/model calls.
- Do not apply migration/import/export/backup/restore.
- Do not push/tag/release/deploy without explicit user instruction.

## Next Candidate

After P35 planning validates and commits, Commander should choose:

- `P35.1-governed-memory-policy-gate-fixture-contract`, synthetic fixture/test only.
