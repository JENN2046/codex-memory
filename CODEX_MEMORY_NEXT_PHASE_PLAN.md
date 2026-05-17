# codex-memory Next Phase Plan

更新时间：2026-05-17

## Purpose

This active plan is the short routing document for the current P41-P45 Evidence-First Gate Spine program. The full pre-compression plan is archived at [docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md).

## Current Direction

1. Treat P36-P40 as complete local evidence only, not runtime/mainline/RC readiness.
2. Keep P41-P45 local, fixture-only, dry-run-only, and explicit-input-only unless a task explicitly states otherwise.
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
- P36-P40 boundary-first chain: complete locally through P40 commit `6f7ade4` and post-P40 board sync `ba59537`.
- P41-T1 closeout: complete locally in `08597d6`.
- P41-T2 evidence manifest contract fixture: complete locally in `8895816`.
- P42-T1 explicit-input evidence helper: complete locally in `169f5bc`.

## Current Task

P43-T1 Recall / Migration Isolation Explicit-Input Helper:

- Add a pure helper over caller-provided recall/migration isolation objects only.
- Keep v1.0 RC `NOT_READY_BLOCKED`.
- Prove governance records, validation transcripts, policy decisions, readiness reports, and synthetic migration metadata stay out of normal recall/vector/candidate/ranking/projection/user-visible audit summary by explicit input only.
- Reject unsupported source types, warning-only/unknown/skipped/missing/ambiguous/unparsable evidence, malformed input, and readiness/runtime/public MCP/durable/provider claims.
- Do not read files, scan directories, execute commands, start services, call providers, write durable state, expand public MCP, connect recall runtime, or touch runtime policy kernel.

## Boundaries

- v1.0 RC remains `NOT_READY_BLOCKED`.
- Public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`.
- Do not implement runtime governance review.
- Do not scan diary, SQLite, vector index, candidate cache, or recall audit for this goal.
- Do not run `governance:report` against a real DB for this task.
- Do not write durable audit/memory records.
- Do not run provider/model calls.
- Do not apply migration/import/export/backup/restore.
- Do not push/tag/release/deploy without explicit user instruction.
- Critical gate skipped/unknown equals failure.
- Dry-run means synthetic fixtures or sanitized metadata only; it does not authorize touching real memory content.
- Readiness means local evidence report only, not operational cutover.

## Next Candidate

After P43-T1:

- Continue to P44 ValidationAggregator P36-P40 evidence source map only after P43-T1 is scoped, validated, and committed locally.
