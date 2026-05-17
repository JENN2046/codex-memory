# codex-memory Next Phase Plan

更新时间：2026-05-17

## Purpose

This active plan is the short routing document for the current P28-P40 Governed Memory Spine program. The full pre-compression plan is archived at [docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md).

## Current Direction

1. Keep reducing stale context pollution in active docs.
2. Close P34 governance review surface as safe-scope / fixture / explicit-input helper / static ValidationAggregator evidence only.
3. Continue P35+ with small local, reversible, fixture-first/read-only governance slices.

## Current Completed Local Chain

- P34 inventory: future read-only governance review surface only.
- P34.1 fixture contract: synthetic review-surface fixture/test.
- P34.2 helper: pure explicit-input helper over caller-provided review surface objects.
- P34.3 ValidationAggregator evidence: static report-shape evidence only, committed locally in `c06436d`.
- CM-0301 context hygiene: active board checkpoint/handoff compressed, committed locally in `4d8d11a`.

## Current Task

CM-0302 root active docs compression:

- Archive full pre-compression `STATUS.md`, `MAINTENANCE_BACKLOG.md`, and `CODEX_MEMORY_NEXT_PHASE_PLAN.md`.
- Replace active files with compact current-state summaries.
- Preserve detailed history in archive files, git history, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md`.

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

After CM-0302 validates and commits, Commander should choose either:

- `P34.x-governance-review-surface-closeout-review`, docs/status/board only; or
- another small docs-context hygiene pass if active docs still produce obvious stale context pollution.
