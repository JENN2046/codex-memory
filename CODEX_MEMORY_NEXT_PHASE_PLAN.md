# codex-memory Next Phase Plan

更新时间：2026-05-17

## Purpose

This active plan is the short routing document for the current P28-P40 Governed Memory Spine program. The full pre-compression plan is archived at [docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md).

## Current Direction

1. P36-P39 boundary, policy, recall-isolation, and synthetic migration dry-run fixtures are complete locally.
2. Keep P36-P40 local, fixture-only, dry-run-only unless a task explicitly states otherwise.
3. Preserve all real memory, durable-write, public MCP, provider, migration/import-export, release, deploy, config, watchdog, and dependency blockers.

## Current Completed Local Chain

- P34 inventory: future read-only governance review surface only.
- P34.1 fixture contract: synthetic review-surface fixture/test.
- P34.2 helper: pure explicit-input helper over caller-provided review surface objects.
- P34.3 ValidationAggregator evidence: static report-shape evidence only, committed locally in `c06436d`.
- CM-0301 context hygiene: active board checkpoint/handoff compressed, committed locally in `4d8d11a`.
- CM-0302 root docs hygiene: active status/plan/backlog docs compressed, committed locally in `3d774ad`.
- P34.x closeout: governance review surface safe-scope chain closed locally in `8220d64`.
- P35 planning: governed memory spine policy gate plan committed locally in `29858e6`.
- P35.1 fixture contract: governed memory policy gate fixture/test committed locally in `c8325b6`.
- P35 security hardening and push reconciliation: remote/local baseline is `3e3f76d`.

## Current Task

P40 Local Readiness Report:

- Establishes a local readiness evidence report over P36-P39.
- Keep `decision=NOT_READY_BLOCKED`.
- Do not implement runtime policy enforcement or a runtime policy kernel.
- Readiness means local evidence report only, not runtime, mainline, push, release, deploy, config, watchdog, or v1.0 RC readiness.
- Does not approve governed actions or write durable state.

## Boundaries

- v1.0 RC remains `NOT_READY_BLOCKED`.
- Public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`.
- Do not implement runtime governance review.
- Do not run `governance:report` against a real DB for this task.
- Do not write durable audit/memory records.
- Do not run provider/model calls.
- Do not apply migration/import/export/backup/restore.
- Do not push/tag/release/deploy without explicit user instruction.
- Critical gate skipped/unknown equals failure.
- Dry-run means synthetic fixtures or sanitized metadata only; it does not authorize touching real memory content.
- Readiness means local evidence report only, not operational cutover.

## Next Candidate

After the guarded P40 commit, Commander may choose:

- Close P36-P40 locally and stop at push authorization boundary, unless the user explicitly requests push.
