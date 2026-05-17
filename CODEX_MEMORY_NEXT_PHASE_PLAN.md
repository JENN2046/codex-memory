# codex-memory Next Phase Plan

更新时间：2026-05-18

## Purpose

This active plan is the short routing document for the current P51-P62 Runtime-Enforced Governed Memory Spine Completion program. The full pre-compression plan is archived at [docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md).

## Current Direction

1. Treat P46-P50 as complete local evidence enforcement bridge posture only, not runtime/mainline/RC readiness.
2. P51 post-push reconciliation is complete for pushed baseline `origin/main = 1ae4286`.
3. P52 schema/version boundary plan and minimal explicit-input helper are complete locally.
4. P53 separates ValidationAggregator inventory contracts from future full implementation.
5. P54 establishes the final RC runner local chain through safe command inventory, explicit command-result evaluation, execution preflight, and an injected-executor adapter contract; it does not complete a real final RC matrix run.
6. P55 must connect P52/P53/P54 local evidence to runtime enforcement gaps without treating fixture/local evidence as runtime enforcement.
7. Preserve all real memory, durable-write, public MCP, provider, migration/import-export, release, deploy, config, watchdog, and dependency blockers.

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
- P35 security hardening and push reconciliation: superseded by later pushed baselines.
- P36-P40 boundary-first chain: complete locally through P40 commit `6f7ade4` and post-P40 board sync `ba59537`.
- P41-T1 closeout: complete locally in `08597d6`.
- P41-T2 evidence manifest contract fixture: complete locally in `8895816`.
- P42-T1 explicit-input evidence helper: complete locally in `169f5bc`.
- P43-T1 recall/migration isolation explicit-input helper: complete locally in `8af5c64`.
- P44-T1 ValidationAggregator P36-P40 evidence source map: complete locally in `ae7655a`.
- Post-P44 board reconciliation: complete locally in `93721b4`.
- P45-T1 fixture-only final RC matrix evaluator skeleton: complete locally in `5ea714b`.
- P45 strict input contract review fix: complete and pushed in `c0989b0`.
- CM-0320 governance evidence helper strict schema/version exact-set fix: complete and pushed in `2b4a956`.
- P46-0 post-push board/status reconciliation: complete and pushed in `ed01771`.
- P46-T1 HTTP no-token mutation + sensitive redaction hardening: complete and pushed in `056b639`.
- P47 evidence-to-enforcement gap map: complete and pushed in `9fba356`.
- P48 evidence-chain consistency guard: complete and pushed in `fa8c414`.
- P49 ValidationAggregator P45 posture bridge: complete and pushed in `922069d`.
- P50 no-touch boundary regression suite: complete and pushed in `97a43d4`.
- P50 review hardening for no-touch/redaction regressions: complete and pushed in `1ae4286`.

## Current Task

P51-P62 Runtime-Enforced Governed Memory Spine Completion:

- P51-T1 post-P50 push board/status reconciliation is complete locally in `1f89c63`.
- P52-T1 runtime schema-version enforcement boundary plan is complete and committed locally in `884f2f6`.
- P52-T2 minimal runtime enforcement helper is complete, validated, and locally committed.
- P53-T1 ValidationAggregator evidence inventory is complete and validated.
- P53-T2 ValidationAggregator inventory posture bridge is complete and validated.
- P53-T3 explicit evidence classification hardening is complete, validated, and locally committed in `0a5016d`.
- P54-T1 final RC runner safe command inventory is complete and validated.
- P54-T2 final RC runner explicit command-result helper is complete and validated.
- P54-T3 local runner execution harness preflight is complete and validated.
- P54-T4 allowlisted local runner execution adapter is complete and validated as an injected-executor contract only; tests use fake executor and no real shell/runtime command chain was run by the helper.
- P55-T1 evidence-to-runtime enforcement trace contract is complete and validated.
- P55-T2 evidence-to-runtime enforcement explicit-input helper is complete and validated.
- P56-T1 governance review/approval/audit executable loop boundary contract is the next candidate.
- Preserve `NOT_READY_BLOCKED`; do not infer runtime/mainline/final-RC/push/release/deploy/config/watchdog readiness from P46-P50 local evidence completion, P52 helper evidence, P53 inventory evidence, P54 command inventory evidence, P54 caller-provided command result evidence, P54 preflight evidence, P54 injected-executor adapter evidence, P55 trace evidence, or P55 trace helper evidence.

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

After P55-T2:

- Begin P56-T1 governance review/approval/audit executable loop boundary contract as docs/fixture/test first.
- Keep P56-T1 boundary-first: model dry-run/explicit-input/local-only review, approval, and audit steps without durable writes or real mutation, fail closed for missing/unknown/skipped/warning-only approval evidence, and do not run real runner commands, start services, call providers, scan real memory/runtime stores, apply migration/import/export/backup/restore, write durable state, expand public MCP, change dependencies, push/tag/release/deploy, or claim runtime/final RC readiness.
