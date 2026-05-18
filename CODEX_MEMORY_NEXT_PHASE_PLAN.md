# codex-memory Next Phase Plan

更新时间：2026-05-18

## Purpose

This active plan is the short routing document for the current P51-P62 Runtime-Enforced Governed Memory Spine Completion program. The full pre-compression plan is archived at [docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/CODEX_MEMORY_NEXT_PHASE_PLAN_FULL_PRE_CM0302.md).

## Current Direction

1. Treat P46-P50 as complete local evidence enforcement bridge posture only, not runtime/mainline/RC readiness.
2. P51 post-push reconciliation is complete for pushed baseline `origin/main = 1ae4286`.
3. P52 schema/version boundary plan and minimal explicit-input helper are complete locally.
4. P53 separates ValidationAggregator inventory contracts from future full implementation.
5. P54 establishes the final RC runner local chain through safe command inventory, explicit command-result evaluation, execution preflight, and an injected-executor adapter contract.
6. P55 evidence-to-runtime trace contract and helper are complete locally; they map local evidence to runtime enforcement gaps without treating fixture/local evidence as runtime enforcement.
7. P56 governance review/approval/audit executable loop boundary and explicit-input helper are complete locally without durable writes or approval execution.
8. P57 recall isolation runtime proof boundary inventory and explicit-input evaluator are complete locally without executing the runtime proof or scanning real memory/runtime stores.
9. P58 migration/import-export/backup-restore approval boundary and explicit-input helper are complete locally using docs/fixture/test evidence only; approval execution and all apply/restore actions remain blocked.
10. P59 HTTP runtime observability / operation hardening boundary and explicit-input helper are complete locally as docs/fixture/test/helper evidence only; live HTTP operation readiness remains blocked.
11. P60 no-touch / no-leak / redaction long-term regression is complete locally without introducing runtime operations.
12. P61 RC evidence report boundary inventory and explicit-input report helper are complete locally without executing mainline strict gate or final RC runner.
13. P62 cutover preflight boundary, completion audit, prompt-to-artifact audit, A5 precondition matrix, and post-T6 audit/refinement closeout are complete locally.
14. P63-T1 implements and executes the local allowlisted final RC runtime evidence runner, including `gate:ci` and `gate:mainline:strict`, then bridges sanitized command evidence into ValidationAggregator.
15. P64-T1 implements runtime schema/version write-boundary enforcement for direct core `record_memory` payloads without expanding public MCP tools; the refreshed final runner passed 12/12 critical gates.
16. The remaining work is still blocked at runtime evidence and A5 authorization boundaries; do not convert P63/P64 local runner execution into final RC, cutover, push, release, deploy, config, watchdog, or `RC_READY` claims.
17. Treat `CMB-0005`, `CMD-0012`, and `RR-0004` as controlling records for resume and completion-boundary decisions.
18. Preserve all real memory, durable-write, public MCP, provider, migration/import-export, release, deploy, config, watchdog, and dependency blockers.

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
- P56-T1 governance review/approval/audit executable loop boundary contract is complete and validated.
- P56-T2 governance loop explicit-input helper is complete, validated, and locally committed in `f69fbbb`.
- P57-T1 recall isolation runtime proof boundary inventory is complete, validated, and locally committed in `c89a772`.
- P57-T2 recall isolation runtime proof explicit-input evaluator is complete, validated, and locally committed in `6f29757`.
- P58-T1 migration/import-export/backup-restore approval framework boundary inventory is complete, validated, and locally committed in `5326169` as docs/fixture/test evidence only.
- P58-T2 migration/import-export/backup-restore approval framework explicit-input helper is complete, validated, and locally committed in `2470634`.
- P59-T1 HTTP runtime observability / operation hardening boundary inventory is complete, validated, and locally committed in `c57be03` as docs/fixture/test evidence only.
- P59-T2 HTTP observability explicit-input evidence helper is complete, validated, and locally committed in `a036c8d`.
- P60-T1 no-touch / no-leak / redaction long-term regression is complete, validated, and locally committed in `66d1978`.
- P61-T1 mainline strict gate + RC evidence report boundary inventory is complete, validated, and locally committed in `360f4f9` as docs/fixture/test evidence only; post-commit board reconciliation is locally committed in `2811da3`.
- P61-T2 RC evidence report explicit-input helper is complete, validated, and locally committed in `15739cb`.
- P62-T1 v1.0 RC cutover preflight boundary inventory is complete, validated, and locally committed in `7baa384`.
- P62-T2 completion audit / gap report is complete, validated, and locally committed in `496d681`.
- P62-T3 prompt-to-artifact completion audit checklist is complete, validated, and locally committed in `4696482`.
- P62-T4 A5/runtime authorization precondition matrix is complete, validated, and locally committed in `c97736d`.
- P62-T5 A5/runtime authorization precondition explicit-input helper is complete, validated, and locally committed in `8535da1`.
- P62-T6 completion audit refresh is complete, validated, and locally committed in `d5808bd`; it maps P62-T5 helper evidence into the completion audit and prompt-to-artifact audit without granting runtime authority.
- P62 post-T6 audit wording refinement, prompt-to-artifact validation refs, and completion audit local-item mapping are complete, validated, and locally committed; current local `HEAD` is intentionally verified from Git commands instead of hard-coded in this routing file.
- P63-T1 final RC runtime evidence bridge is implemented locally with `src/core/FinalRcRuntimeEvidenceRunner.js`, `src/cli/final-rc-matrix-runner.js`, targeted tests, and `docs/P63_FINAL_RC_RUNTIME_EVIDENCE_BRIDGE.md`; the real runner execution passed 11/11 critical gates and recorded local evidence in `logs/p63-final-rc-runtime-evidence-report-01.md`.
- P64-T1 runtime schema/version write-boundary proof is implemented locally with `src/core/MemoryWriteService.js`, `tests/schema-version-runtime-boundary.test.js`, ValidationAggregator status updates, and `docs/P64_RUNTIME_SCHEMA_VERSION_WRITE_BOUNDARY_EVIDENCE.md`; the refreshed real runner execution passed 12/12 critical gates and recorded local evidence in `logs/p64-runtime-schema-version-write-boundary-evidence-report-01.md`.
- Preserve `NOT_READY_BLOCKED`; do not infer mainline/final-RC/push/release/deploy/config/watchdog readiness from P46-P50 local evidence completion, P52 helper evidence, P53 inventory evidence, P54 command chain evidence, P55 trace evidence, P56 boundary/helper evidence, P57 boundary/helper evidence, P58 boundary/helper evidence, P59 boundary/helper evidence, P60 regression evidence, P61 report helper evidence, P63 local runner evidence, or P64 write-boundary evidence.

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

After P64-T1 local schema/version write-boundary evidence:

- Stop before any push, tag, release, deploy, config switch, watchdog/startup install, final RC cutover, live/provider operation, runtime execution, or `RC_READY` claim unless explicitly authorized.
- Current local-only candidate: P65-T1 ValidationAggregator explicit runtime evidence summary ingestion. This is a stricter ValidationAggregator full-implementation evidence slice, but it remains explicit-input-only and cannot claim runtime readiness, final RC readiness, v1.0 RC readiness, or `RC_READY`.
- P65.1 Final RC runner executed-field semantics hardening is the immediate follow-up: local allowlisted runner execution must be reported through `localRuntimeEvidenceMatrixExecuted` / `allowlistedFinalRcEvidenceRunnerExecuted`, while `finalRcMatrixExecuted=false`, `fullFinalRcMatrixExecuted=false`, and explicit full-matrix execution/readiness rejection continue to block full RC matrix readiness claims.
- P65.2 push readiness approval request is the current docs/board phase: it records that local `main` is ahead of `origin/main` by the validated P65 chain and requests explicit approval before any `git push origin main`. Approval remains `NOT_APPROVED`; push remains blocked.
- P66 remaining runtime gap inventory refresh records the current post-P65 truth: P63/P64 locally evidenced `runtime_schema_version_enforcement_not_fully_proven` and `final_rc_matrix_runner_not_executed_as_real_matrix`; seven runtime gaps remain open and sixteen A5 hard stops remain blocked.
- P66.1 ValidationAggregator full-implementation definition is the current local fixture/test slice. It defines full implementation criteria, fail-closed cases, seven remaining runtime gaps, and sixteen A5 hard stops while preserving `NOT_READY_BLOCKED`.
- P66.2 ValidationAggregator definition static bridge is complete locally. 中文解释：ValidationAggregator 现在只把 P66.1 定义作为静态、非授权 report-shape evidence 展示；它不读取 fixture、不执行 runtime、不声明 readiness。
- P66.3 ValidationAggregator full-implementation runtime plan is complete locally. 中文解释：P66.3 只把 7 个剩余 runtime gap 的本地安全推进顺序、A5 边界和 fail-closed 规则锁进 docs/fixture/test；它不执行 runtime 或声明 readiness。
- P66.4 ValidationAggregator gap priority fixture tests is complete locally. 中文解释：P66.4 只锁定第一个剩余 gap 的验收证据组和禁用动作；它不关闭 gap、不实现 runtime、不声明 readiness。
- P66.5 ValidationAggregator source registry proof helper is complete locally. 中文解释：P66.5 只新增纯 explicit-input helper 来校验 source registry exact-set；它不读文件、不执行命令、不启动服务、不声明 readiness。
- P66.6 ValidationAggregator source registry static bridge is complete locally. 中文解释：P66.6 只把 P66.5 helper 能力作为静态、非授权证据展示到 ValidationAggregator report；aggregator 不执行 helper、不读文件、不声明 readiness。
- P66.7 ValidationAggregator source registry closeout is complete locally. 中文解释：P66.7 只关闭 source-registry proof slice，并选择 `evidence_freshness_proof` 作为下一个本地安全证据组；它不关闭整个 runtime gap。
- P66.8 ValidationAggregator evidence freshness proof fixture is complete locally. 中文解释：P66.8 只用 fixture/test 定义 freshness 字段、UTC timestamp、baseline binding、freshness window 和 fail-closed 规则；它不读真实 evidence 文件、不执行命令、不声明 readiness。
- P66.9 ValidationAggregator evidence freshness proof helper is complete locally. 中文解释：P66.9 只新增纯 explicit-input helper 来校验 freshness proof；它不读文件、不执行命令、不启动服务、不声明 readiness。
- P66.10 ValidationAggregator evidence freshness static bridge is complete locally. 中文解释：P66.10 只把 P66.9 helper 能力作为静态、非授权证据展示到 ValidationAggregator report；aggregator 不执行 helper、不读文件、不声明 readiness。
- P66.11 ValidationAggregator evidence freshness closeout is complete locally. 中文解释：P66.11 只关闭 evidence freshness proof slice，并选择 `baseline_binding_proof` 作为下一个本地安全证据组；它不关闭整个 runtime gap。
- P66.12 ValidationAggregator baseline binding proof fixture is complete locally. 中文解释：P66.12 只用 fixture/test 定义 baseline binding 字段、commit role 分离、target/evidence subject 绑定和 fail-closed 规则；它不 checkout/reset/detach、不执行命令、不声明 readiness。
- P66.13 ValidationAggregator baseline binding proof helper is complete locally. 中文解释：P66.13 只新增纯 explicit-input helper 来校验 baseline binding proof；它不 checkout/reset/detach、不查远端、不读文件、不执行命令、不启动服务、不声明 readiness。
- Recommended next local phase: P66.14 ValidationAggregator baseline binding static bridge. 中文解释：下一步可以把 P66.13 helper 能力作为静态、非授权 report-shape evidence 展示到 ValidationAggregator；aggregator 不能 import/execute helper、读文件、执行命令、查远端、启动服务、调用 provider、写 durable state 或声明 `RC_READY`。
- After P65-T1, continue one remaining runtime proof gap at a time; any push, tag, release, deploy, config switch, watchdog/startup install, final RC cutover, live/provider operation, durable write, migration/import-export apply, public MCP expansion, or readiness claim still requires separate explicit authorization.
