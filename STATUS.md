# codex-memory Status

更新时间：2026-06-01

## 当前结论

`codex-memory` 的目标是成为 Codex / Claude 可用的本地优先 VCP memory mainline：可审计、可回滚、provider-flexible、VCP-compatible，并保留稳定 MCP 工具契约。

当前控制状态保持：

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```

原因：文档面正在瘦身；A5 / P66 runtime gaps 尚未逐项关闭；personal RC dogfood 尚未开始。不得把 docs-only、fixture-only、本地 proof、历史 gate 或历史 HTTP evidence 解释为 runtime readiness、RC readiness、write reliability 或 recall reliability。

## 当前路线

正式后续路线见 [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)：

1. 先执行文档面瘦身。
2. 再逐个做 A5 / P66 runtime gap closure。
3. 最后做 personal RC dogfood。

当前最新已验证 A5 单元仍包括 `CM-1208 A5-GAP-5_STRICT_GATE_PREFLIGHT`：用户精确授权在 `main@d3b9bf9fb8cc92cc7b2f2112d6006940a68b3d9d` 运行 `npm run gate:mainline:strict`，且无 remote write。该 strict gate 已通过：health ok，contract `29/29`，test `2754/2754`，compare `43/43`，rollback `43/43`。

这是 target-bound strict-gate evidence，不是 runtime readiness、RC readiness、cutover readiness、write reliability 或 recall reliability。`CM-1210 A5-GAP-4_HTTP_EVIDENCE_REFRESH` 已在 `main@db5a4d66cf472d35e80b12d512816cda5de09220` 执行 endpoint-bound refresh：`/health` 和 `observe:http` 为 `ok`，HTTP log error `0`，watchdog recovery `0`，governance status `ok`，`noProvider=true`，`mutated=false`，`migrationApplied=false`。`CM-1211 A5-GAP-4_AUTHENTICATED_MCP_TOOL_LIST_EVIDENCE` 已在 `main@1a7d198f1f4758f0de3caf9b839cc59aa1b9802e` 执行：使用当前会话已存在 bearer token，未打印、未持久化 token，未执行 `tools/call`。Authenticated MCP `initialize` 返回 server `vcp_codex_memory` / version `0.1.0`，`tools/list` 返回且仅返回 3 个公开工具：`record_memory`、`search_memory`、`memory_overview`。

`CM-1213 A5-GAP-6_AGGREGATION_REFRESH_EVIDENCE` 已在 exact approval 下执行：`main@ae014397c63a68791c0f1dbe22c38dd4bba8c697`，只消费已批准的 `A5-GAP-4,A5-GAP-5` sanitized evidence。Aggregator 接受 explicit sanitized summary，结果保持 `decision=NOT_READY_BLOCKED`、`validationAggregatorFullImplementation=false`、`runtimeEvidenceSummaryLocallyEvidencedGapCount=2`、`runtimeEvidenceSummaryRemainingGapCount=5`、`commandsExecutedByAggregator=false`。历史 `A5-GAP-1/2/3` artifacts 未被消费。

`CM-1215 A5-GAP-1_GOVERNANCE_RUNTIME_LOOP_EVIDENCE` 已在 exact approval 下执行：`main@7d66d072ccb7828770cdb1ddffb5b756152b9af3`，subject 为 `cm1214-governance-runtime-loop-no-durable-write sanitized test subject`，`durable write no`。本次只执行 in-memory `evaluateGovernanceRuntimeApprovalAuditLoop(...)` sanitized proof；结果 `accepted=true`、`status=GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_ACCEPTED_NOT_EXECUTED_NOT_READY`、6 个 stage 均为 `evaluated_not_executed`，side-effect counters 全为 0。未执行 governed action，未写 durable audit/memory，未调用 provider，未读取真实记忆，未执行 MCP `tools/call`。

`CM-1216 A5-GAP-6_POST_GOVERNANCE_LOOP_AGGREGATION_PREFLIGHT` 正在准备下一次 evidence aggregation refresh 的精确授权边界：默认只消费当前已批准并已记录的 `A5-GAP-1,A5-GAP-4,A5-GAP-5` sanitized evidence；历史 `A5-GAP-2/3` artifacts 仅作背景，除非后续 exact approval 明确命名，否则不得被聚合器消费。CM-1216 不执行 ValidationAggregator，不扫描文件或 stores，不调用 MCP `tools/call`，不读取真实记忆，不写 durable memory/audit，不执行 governed action，不改变 config/watchdog/startup，不执行 provider、push、PR、release、deploy 或 cutover。

`CM-1218 A5-GAP-2_RECALL_ISOLATION_NO_MUTATION_EVIDENCE` 已在 exact approval 下执行：`main@d0f008133465b2c1be4ea66689b072fa4ca86dd9`，限定 stores 为 `real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit`，并要求 `no mutation`。本次只读扫描输出 sanitized counts/booleans，未输出 raw memory/audit 内容，未执行 normal recall/search pipeline，未调用 MCP `tools/call`，未写 durable memory/audit，未调用 provider，未改变 config/watchdog/startup。结果：`storeSnapshotsUnchanged=true`、`projectionLeakageTotal=0`、`rawContentOutput=false`、`durableMemoryWritten=false`、`durableAuditWritten=false`，但限制仍为 `NO_CLASSIFIED_REAL_SAMPLE_PRESENT`。

`CM-1220 A5-GAP-6_POST_RECALL_ISOLATION_AGGREGATION_EVIDENCE` 已在 exact approval 下执行：`main@57116c99ae430e8d883c73dbd871a3e68cc48e3e`，只消费已批准的 `A5-GAP-1,A5-GAP-2,A5-GAP-4,A5-GAP-5` sanitized evidence。Aggregator 接受 explicit sanitized summary，结果保持 `decision=NOT_READY_BLOCKED`、`validationAggregatorFullImplementation=false`、`runtimeEvidenceSummaryLocallyEvidencedGapCount=4`、`runtimeEvidenceSummaryRemainingGapCount=3`、`commandsExecutedByAggregator=false`。历史 `A5-GAP-3` artifacts 未被消费。

`CM-1221 A5-GAP-3_MIGRATION_READINESS_DRY_RUN_PREFLIGHT` 正在准备下一次 migration/import/export/backup/restore approval execution 的精确授权边界：仅限 future `npm run vcp-memory:migration-readiness -- --json` fixture-only dry-run。CM-1221 不执行 dry-run，不执行 apply/import/export/backup/restore，不扫描 real stores，不写 durable memory/audit，不调用 provider，不改变 config/watchdog/startup，不执行 push、PR、release、deploy 或 cutover。

`CM-1222 A5-GAP-6_POST_GAP3_PREFLIGHT_AGGREGATION_EVIDENCE` 已在 exact approval 下执行：`main@8700d5453a2c53584e821987d1539b30517944a1`，只消费已批准的 `A5-GAP-1,A5-GAP-2,A5-GAP-4,A5-GAP-5` sanitized evidence。Aggregator 接受 explicit sanitized summary，结果保持 `decision=NOT_READY_BLOCKED`、`validationAggregatorFullImplementation=false`、`runtimeEvidenceSummaryLocallyEvidencedGapCount=4`、`runtimeEvidenceSummaryRemainingGapCount=3`。CM-1221 / A5-GAP-3 migration-readiness dry-run output 未执行、未消费。

`CM-1223 VALIDATION_AGGREGATOR_FULL_GAP_ACCOUNTING` 已新增本地 source/test 结构化缺口核算：`p66ValidationAggregatorFullImplementationDefinition` 现在输出 remaining / locally evidenced full implementation gap ids/counts 和 next safe closure candidates。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不执行 runtime collector，不消费 A5-GAP-3，不改变 `validationAggregatorFullImplementation=false`、`runtimeReady=false`、`rcReady=false`。

`CM-1224 VALIDATION_AGGREGATOR_RUNTIME_SUMMARY_GAP_BINDING` 已把 accepted explicit sanitized runtime summary 绑定到 CM-1223 的 full gap accounting 输出：当 summary 被接受时，report 会输出该摘要内的 remaining / locally evidenced gap ids/counts；summary 缺失或被拒绝时不绑定。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不执行 runtime collector，不读取 evidence 文件或 stores，不消费新 A5 evidence，不改变 readiness。

`CM-1225 VALIDATION_AGGREGATOR_VALIDATION_EVIDENCE_GAP_BINDING` 已把 explicit validation evidence reader 的 freshness / gate readiness / command coverage / confidence posture 绑定到 full gap accounting 输出。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不读取 evidence 文件，不执行 validation commands 或 runtime collector，不改变 readiness。

`CM-1226 VALIDATION_AGGREGATOR_BLOCKER_GAP_BINDING` 已把当前 blocker taxonomy 绑定到 full gap accounting 输出：validation blockers、runtime-required blockers、A5-gated blockers 的 ids/counts 现在与 runtime-summary gap 和 validation-evidence gate posture 同屏呈现。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不执行 runtime collector，不读取 evidence 文件或 stores，不改变 readiness。

`CM-1227 VALIDATION_AGGREGATOR_CLOSURE_STATUS` 已把 full gap accounting 汇总为明确 closure 状态：`closureStatus=blocked_existing_blockers`、`closureReady=false`、`closureCanClaimReady=false`，并列出 closure criteria / missing criteria。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不执行 runtime collector，不读取 evidence 文件或 stores，不改变 readiness。

`CM-1228 A5-GAP-3_MIGRATION_READINESS_DRY_RUN_EVIDENCE` 已在 exact approval 下执行：`main@e23e86dd4a3f443a95c2a2b4aeda4da901dde797`，仅运行 `npm run vcp-memory:migration-readiness -- --json` fixture-only readiness report。结果保持 `status=blocked`、`fixtureOnly=true`、`mutated=false`、`migrationBlocked=true`、`noMigration=true`、`noSQLiteWrite=true`、`noDiaryWrite=true`、`noImportExportApply=true`、`noRealDbMemoryWrite=true`、`noMcpPublicToolExpansion=true`、`rawWorkspaceIdExposed=false`、`rawSecretExposed=false`。未执行 apply/import/export/backup/restore，未扫描 real stores，未写 durable memory/audit，未调用 provider，未改变 config/watchdog/startup。

`CM-1229 A5-GAP-6_POST_GAP3_DRY_RUN_AGGREGATION_PREFLIGHT` 已准备下一次 aggregation refresh 的精确授权边界：默认只消费当前已批准并已记录的 `A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5` sanitized evidence。CM-1229 不执行 ValidationAggregator，不扫描文件或 stores，不调用 MCP `tools/call`，不读取真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不执行 provider、push、PR、release、deploy 或 cutover。

`CM-1230 VALIDATION_AGGREGATOR_EFFECTIVE_GAP_ACCOUNTING` 已让 full gap accounting 同时保留 static baseline 与 accepted sanitized runtime summary 下的 effective gap view。无 accepted summary 时 `effectiveGapSource=static_baseline`；有 accepted summary 时切换为 `effectiveGapSource=accepted_runtime_summary`，并反映该 summary 的 remaining / locally evidenced gap ids/counts。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不执行 A5-GAP-6，不读取 evidence 文件或 stores，不改变 readiness。

`CM-1231 VALIDATION_AGGREGATOR_EFFECTIVE_GAP_CLOSURE_CRITERION` 已把 `effectiveRemainingGapsCleared` 纳入 closure criteria，并在 effective remaining gap list 非空时把 `effective_remaining_gaps_cleared` 放入 missing criteria。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不执行 A5-GAP-6，不读取 evidence 文件或 stores，不改变 readiness。

`CM-1232 VALIDATION_AGGREGATOR_EFFECTIVE_GAP_DELTA` 已让 full gap accounting 显示 static baseline 与 effective gap view 的差异：`staticBaselineClearedGapIds/count`、`staticBaselineStillRemainingGapIds/count` 与 `effectiveNonBaselineRemainingGapIds/count`。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不执行 A5-GAP-6，不读取 evidence 文件或 stores，不改变 readiness。

`CM-1233 VALIDATION_AGGREGATOR_NON_BASELINE_GAP_GUARD` 已把 `effectiveNonBaselineRemainingGapsAbsent` 纳入 closure criteria；若 accepted sanitized runtime summary 引入 static baseline 之外的 remaining gap，`closureMissingCriteria` 会包含 `effective_non_baseline_remaining_gaps_absent` 并继续 fail closed。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `22/22`。该变更不执行 A5-GAP-6，不读取 evidence 文件或 stores，不改变 readiness。

`CM-1234 A5-GAP-6_POST_GAP3_AGGREGATION_EVIDENCE` 已在 exact approval 下执行：`main@f7966ad152a9181f1bd912e07d095bb79f46bf09`，只消费已批准的 `A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5` sanitized evidence。Aggregator 接受 explicit sanitized summary，结果保持 `decision=NOT_READY_BLOCKED`、`validationAggregatorFullImplementation=false`、`runtimeEvidenceSummaryLocallyEvidencedGapCount=5`、`runtimeEvidenceSummaryRemainingGapCount=2`、`commandsExecutedByAggregator=false`、`effectiveGapSource=accepted_runtime_summary`、`effectiveRemainingFullImplementationGapCount=2`、`closureReady=false`。未扫描 files/stores，未调用 MCP/provider，未写 durable memory/audit，未执行 migration/import/export/backup/restore apply，未改变 config/watchdog/startup。

`CM-1235 VALIDATION_AGGREGATOR_EFFECTIVE_GAP_CLOSURE_MAP` 已新增本地 source/test 分类图：effective remaining gaps 现在区分 local implementation、A5-gated evidence 与 Red-lane cutover groups，并输出 `effectiveRemainingGapClosureItems`、`effectiveLocalImplementationGapIds/count`、`effectiveA5GatedGapIds/count`、`effectiveRedLaneGapIds/count`。closure criteria 也新增对应 `effective*GapsCleared` 布尔值和 missing criteria。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `22/22`。该变更不执行 A5-GAP-6，不读取 evidence 文件或 stores，不调用 MCP/provider，不写 durable memory/audit，不改变 readiness。

`CM-1236 VALIDATION_AGGREGATOR_CLOSURE_AUTHORITY_SUMMARY` 已新增本地 source/test action-routing summary：full gap accounting 现在输出 `closureAuthoritySummary`、`closureAuthorityStatus` 与 `nextClosureAuthority`，用于区分下一步是 local implementation、exact A5 approval、Red-lane approval、manual gap modeling、blocker clearance 还是 separate readiness authority。当前默认与 accepted-summary 路径仍为 `closureAuthorityStatus=local_implementation_required`、`nextClosureAuthority=local_source_test_implementation`。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `22/22`。该变更不执行 A5-GAP-6，不读取 evidence 文件或 stores，不调用 MCP/provider，不写 durable memory/audit，不改变 readiness。

`CM-1237 VALIDATION_AGGREGATOR_LOCAL_PROOF_CHAIN_ROUTING` 已把 P66 local-safe proof chain complete 状态接入 closure authority routing：`validation_aggregator_full_implementation_incomplete` 仍保持 open，但不再作为自动可继续的 local implementation next step。full gap accounting 新增 `effectiveLocalProofChainCompleteGapIds/count` 与 `effectiveActionableLocalImplementationGapIds/count`；当前默认与 accepted-summary 路径改为 `closureAuthorityStatus=red_lane_authorization_required`、`nextClosureAuthority=explicit_red_lane_owner_approval`。Targeted validation `node --check src\core\ValidationAggregatorService.js` 与 `node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `22/22`。该变更不执行 A5-GAP-6，不读取 evidence 文件或 stores，不调用 MCP/provider，不写 durable memory/audit，不改变 readiness。

`CM-1238 A5-GAP-5_FRESH_STRICT_GATE_PREFLIGHT` 已准备下一次 fresh strict gate 的 exact approval boundary：提交 CM-1238 后必须用新的 fresh `HEAD` 批准 `A5-GAP-5`，命令范围仅限 `npm run gate:mainline:strict`，且 `no remote write`。CM-1238 不执行 strict gate，不启动服务，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不执行 push、PR、release、deploy、cutover 或 readiness claim。

`CM-1239 A5_APPROVAL_LINE_VERIFIER` 已新增本地 explicit-input approval verifier：`src/core/A5ApprovalLineVerifier.js` 可以在后续 A5 执行前校验 approval line 是否精确匹配 expected unit / branch / commit，并拒绝 stale commit、placeholder、跨 unit reuse 与更宽泛措辞。Targeted validation `node --check src\core\A5ApprovalLineVerifier.js` 与 `node --test tests\a5-approval-line-verifier.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `9/9`。该变更不授予 approval，不执行 strict gate，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1240 A5_APPROVAL_CHECK_CLI` 已新增本地 explicit-input CLI wrapper：`src/cli/a5-approval-check.js` 可在后续 A5 执行前校验用户给出的 approval line 是否匹配 expected unit / branch / commit，并以 fail-closed exit code 暴露缺参或 stale commit。Targeted validation `node --check src\cli\a5-approval-check.js` 与 `node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js` 通过，测试 `9/9`。该 CLI 不发现 approval、不授予 approval、不执行被批准命令、不启动服务、不调用 provider/MCP、不读取真实记忆、不写 durable memory/audit、不改变 readiness。

`CM-1241 A5_APPROVAL_CHECK_ENTRYPOINTS` 已把该只读 CLI 暴露为标准本地入口：`npm run a5:approval-check -- ...` 与 bin `codex-memory-a5-approval-check`。Targeted validation `node --check src\cli\a5-approval-check.js`、`node --test tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js` 与 `npm run a5:approval-check -- --help` 通过；fixture-only `npm run gate:ci` 也通过，包含 docs script target check `43 scripts, all targets exist` 和 CI-safe tests `2765/2765`。该变更只改 package metadata/test/docs，不改依赖或 lockfile，不授予 approval，不执行被批准命令，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1242 A5_APPROVAL_PATTERN_COVERAGE` 已补齐本地 approval checker 对仓库已记录真实 A5 句式的覆盖：`A5-GAP-3` migration-readiness dry-run 的完整 no-apply/no-import/no-export/no-backup/no-restore/no-durable-write 边界、`A5-GAP-4` authenticated MCP initialize/tools-list 证据句式，以及残缺 no-apply 边界的 fail-closed 拒绝。Targeted validation `node --check src\core\A5ApprovalLineVerifier.js` 与 `node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `17/17`。该变更不授予 approval，不执行被批准命令，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1243 A5_APPROVAL_PATTERN_COVERAGE_EXTENDED` 已继续补齐本地 approval checker 对 P66 文档句式的覆盖：`A5-GAP-1` read-only governance report、`A5-GAP-2` classified isolation read-only proof、`A5-GAP-6` 带空格 unit list / included evidence filename / `no new runtime action` 的 evidence-only aggregation 句式。Targeted validation `node --check src\core\A5ApprovalLineVerifier.js` 与 `node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `20/20`。该变更不授予 approval，不执行被批准命令，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1244 A5_GAP6_APPROVAL_SCOPE_NORMALIZATION` 已让本地 approval checker 对 `A5-GAP-6` exact approval line 输出结构化 `parsedApprovalScope`：`approvedEvidenceUnits`、`approvedEvidenceUnitCount`、`includedEvidenceFile` 与 `noNewRuntimeAction`。Targeted validation `node --check src\core\A5ApprovalLineVerifier.js`、`node --check src\cli\a5-approval-check.js` 与 `node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `21/21`。该变更不授予 approval，不执行被批准命令，不运行 ValidationAggregator，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1245 A5_GAP6_APPROVAL_TEMPLATE_RENDERING` 已为本地 `a5:approval-check` 增加 `--template` 模式，可按 caller-provided branch/commit/unit list 渲染 `A5-GAP-6` exact approval template。模板模式仍输出 `approvalAccepted=false`、`authorizationGranted=false`、`executesApprovedAction=false`；退出码 `0` 只表示模板渲染成功，不表示授权成功。Targeted validation `node --check src\cli\a5-approval-check.js` 与 `node --test tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\a5-approval-line-verifier.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `23/23`。该变更不读取 Git，不授予 approval，不执行被批准命令，不运行 ValidationAggregator，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1246 A5_GAP6_TEMPLATE_UNIT_GUARD` 已让本地 `a5:approval-check --template` 对 `A5-GAP-6` 的 `--approved-units` fail closed：未知 unit、非 `A5-GAP-N` 文本和重复 unit 均拒绝渲染。Targeted validation `node --check src\cli\a5-approval-check.js` 与 `node --test tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\a5-approval-line-verifier.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `26/26`。该变更不读取 Git，不授予 approval，不执行被批准命令，不运行 ValidationAggregator，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1247 A5_GAP6_TEMPLATE_SELF_CHECK` 已让本地 `a5:approval-check --template` 在渲染 `A5-GAP-6` approval text 后，用同一个 `evaluateA5ApprovalLine(...)` 做 round-trip self-check，并输出 `templateSelfCheck`。如果模板文本与 exact verifier grammar 漂移，模板模式会 fail closed。Targeted validation `node --check src\cli\a5-approval-check.js` 与 `node --test tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\a5-approval-line-verifier.test.js tests\no-touch-boundary-regression.test.js` 通过，测试 `26/26`。该变更不读取 Git，不授予 approval，不执行被批准命令，不运行 ValidationAggregator，不调用 provider/MCP，不读取真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1248 A5_GAP6_POST_TEMPLATE_GUARD_AGGREGATION_EVIDENCE` 已在 exact approval 下执行：`main@818f41369777ef418a3b4dc4057dcc84f706bea7`，只消费已批准的 `A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5` sanitized evidence。Aggregator 接受 explicit sanitized summary，结果保持 `decision=NOT_READY_BLOCKED`、`validationAggregatorFullImplementation=false`、`runtimeEvidenceSummaryLocallyEvidencedGapCount=5`、`runtimeEvidenceSummaryRemainingGapCount=2`、`commandsExecutedByAggregator=false`、`effectiveGapSource=accepted_runtime_summary`、`effectiveRemainingFullImplementationGapCount=2`、`closureAuthorityStatus=red_lane_authorization_required`、`closureReady=false`。未扫描 files/stores，未调用 MCP/provider，未写 durable memory/audit，未执行 migration/import/export/backup/restore apply，未改变 config/watchdog/startup。

`CM-1249 SQLITE_SCHEMA_STARTUP_HARD_GATE` 已实现 CM-1180 计划中的第一段 runtime-source hard gate：`SqliteShadowStore.ensureReady()` 会在普通 runtime table 初始化前维护并校验内部 `codex_memory_schema_meta/sqlite_schema_version`，当前 expected version 为 `1`；新库初始化当前版本，当前版本继续启动，invalid metadata 或 unknown future version 在 startup 阶段 fail closed。`getHealth()` 现在暴露 sanitized `schemaStartupGate`。Targeted validation `node --check src\storage\SqliteShadowStore.js`、`node --test tests\sqlite-schema-startup-gate.test.js` 通过 `3/3`，相邻 storage/restart/startup/no-touch tests 通过 `37/37`；默认 `npm test` 通过 `2780/2780`。该变更不安装或修改 watchdog/startup，不改 Codex/Claude config，不启动 HTTP MCP，不调用 provider/MCP，不扫描真实记忆，不执行 migration/import/export/backup/restore apply，不改变 readiness。

`CM-1250 SCHEMA_GATED_STARTUP_RECOVERY_POLICY` 已把 CM-1249 的 `schemaStartupGate` 接入 startup recovery policy preflight：`buildStartupRecoverySafetyPreflight(...)` 现在要求 sanitized `shadowHealth.schemaStartupGate`，并在 schema gate 缺失、blocked、状态不被接受、version malformed 或 future-versioned 时 fail closed。Targeted validation `node --check src\core\MemoryWriteReconcileStartupSafetyPolicy.js` 与 `node --test tests\memory-write-reconcile-startup-safety-policy.test.js tests\sqlite-schema-startup-gate.test.js tests\no-touch-boundary-regression.test.js` 通过 `26/26`；默认 `npm test` 通过 `2781/2781`。该变更不启用 automatic startup recovery，不执行 recovery/reconcile/rebuild apply，不安装 watchdog/startup，不改 config，不启动 HTTP MCP，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1251 SCHEMA_GATE_DOWNSTREAM_POLICY_BINDING` 已把 CM-1250 的 schema gate 接受条件绑定到 downstream guarded startup recovery policy acceptance：`hasAcceptedStartupRecoveryPreflight(...)` 现在要求 accepted preflight report 内的 `shadowHealth.schemaStartupGate` 也处于 accepted 状态；缺失 schema gate 或 blocked schema gate 的旧形状 preflight 不再能推进 `buildGuardedStartupRecoveryPolicyDesign(...)`。Targeted validation `node --check src\core\MemoryWriteReconcileStartupSafetyPolicy.js` 与 `node --test tests\memory-write-reconcile-startup-safety-policy.test.js tests\sqlite-schema-startup-gate.test.js tests\no-touch-boundary-regression.test.js` 通过 `27/27`；默认 `npm test` 通过 `2782/2782`。该变更不启用 automatic startup recovery，不执行 recovery/reconcile/rebuild apply，不安装 watchdog/startup，不改 config，不启动 HTTP MCP，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1252 SCHEMA_GATE_DRY_RUN_POLICY_INVARIANT` 已把 schema-gated prior-preflight 约束显式传播到 guarded policy design 输出：`buildGuardedStartupRecoveryPolicyDesign(...)` 现在写出 `policyDesign.priorPreflightSchemaGateAccepted`；`hasAcceptedGuardedStartupRecoveryPolicyDesign(...)` 要求它为 true，因此 downstream `buildTempLocalStartupRecoveryDryRunHarness(...)` 不再接受缺少该 invariant 的旧形状 policy design。Targeted validation `node --check src\core\MemoryWriteReconcileStartupSafetyPolicy.js` 与 `node --test tests\memory-write-reconcile-startup-safety-policy.test.js tests\sqlite-schema-startup-gate.test.js tests\no-touch-boundary-regression.test.js` 通过 `27/27`；默认 `npm test` 通过 `2782/2782`。该变更不启用 automatic startup recovery，不执行 dry-run，不执行 recovery/reconcile/rebuild apply，不安装 watchdog/startup，不改 config，不启动 HTTP MCP，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1253 SCHEMA_GATE_DRY_RUN_EXECUTION_PREFLIGHT_INVARIANT` 已把 schema-gated policy invariant 显式传播到 dry-run harness 输出：`buildTempLocalStartupRecoveryDryRunHarness(...)` 现在写出 `dryRunPlan.priorPolicySchemaGateAccepted`；`hasAcceptedTempLocalStartupRecoveryDryRunHarness(...)` 要求它为 true，因此 downstream `buildTempLocalStartupRecoveryDryRunExecutionPreflight(...)` 不再接受缺少该 invariant 的旧形状 dry-run harness。Targeted validation `node --check src\core\MemoryWriteReconcileStartupSafetyPolicy.js` 与 `node --test tests\memory-write-reconcile-startup-safety-policy.test.js tests\sqlite-schema-startup-gate.test.js tests\no-touch-boundary-regression.test.js` 通过 `27/27`；默认 `npm test` 通过 `2782/2782`。该变更不启用 automatic startup recovery，不执行 dry-run，不执行 recovery/reconcile/rebuild apply，不安装 watchdog/startup，不改 config，不启动 HTTP MCP，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1254 RUNTIME_TRUTH_TABLE_NO_TOKEN_OVERVIEW_REBASE` 已做 docs-only 状态面修正：`docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` 的 CM-1182 段落不再把 pre-CM-1183 的 no-token `memory_overview` 允许行为写成当前 source fact；该段随后由 CM-1255 继续更新为 selected projection 当前事实。CM-1254 本身不改 runtime/source/test/config，不启动 HTTP MCP，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1255 NO_TOKEN_MEMORY_OVERVIEW_SELECTED_PROJECTION` 已实现 no-token HTTP `memory_overview` selected projection：no-token JSON-RPC `tools/call` 现在返回 `no_token_selected_overview`，绕过 full `MemoryOverviewService.getOverview(...)`，并省略 paths、embedding fingerprint、recent audit rows、recent files、memory links、recent recall rows、memory ids、titles、file paths、source files。Bearer-token authorized `memory_overview` 仍使用 full overview；no-token `record_memory` 与 `search_memory` 仍被阻断。Targeted validation `node --check src\core\MemoryOverviewService.js`、`node --check src\app.js`、`node --check src\adapters\codex-mcp\http.js` 与 `node --test tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js tests\phase-b-sync-cache-rerank.test.js` 通过 `44/44`；默认 `npm test` 通过 `2782/2782`；`npm run test:hardening` 通过 hardening `73/73` + override evidence `6/6`，fixture-only `gate:ci` PASS。该变更不改公开 MCP 工具名，不调用 provider，不扫描真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不改变 readiness。

`CM-1256 NO_TOKEN_OVERVIEW_CORE_SANITIZER_TEST` 已补充 direct core-level sanitizer test：`tests/memory-overview-no-token-selected-projection.test.js` 直接调用 `MemoryOverviewService.getNoTokenSelectedOverview(...)`，用包含 raw paths、memory ids、titles、file/source paths、embedding fingerprints、project/client ids、schema DB path 和 candidate-cache revision targets 的 fake dependency outputs 验证 selected projection 只输出 sanitized summary/health fields，且不会调用 full-overview-only `diaryStore.listRecentFiles(...)`。Targeted validation `node --check tests\memory-overview-no-token-selected-projection.test.js`、`node --test tests\memory-overview-no-token-selected-projection.test.js` 与 HTTP boundary regression set `node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js` 已通过 `29/29`；默认 suite 与 docs validation 见 `.agent_board/VALIDATION_LOG.md`。CM-1256 是 test/docs-only hardening，不改 runtime behavior，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 readiness。

`CM-1257 NO_TOKEN_OVERVIEW_COUNT_ONLY_WRITE_SUMMARY` 已继续收窄 no-token selected projection：`MemoryOverviewService.getNoTokenSelectedOverview(...)` 现在使用 count-only write summary，不再返回 `latestAcceptedAt` / `latestRejectedAt` 活动时间戳；bearer-token authorized `memory_overview` 仍走 full overview。Targeted validation `node --check src\core\MemoryOverviewService.js`、`node --check tests\memory-overview-no-token-selected-projection.test.js` 与 `node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js` 已通过 `29/29`；默认 suite 与 docs validation 见 `.agent_board/VALIDATION_LOG.md`。CM-1257 不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不改变 readiness。

`CM-1258 NO_TOKEN_OVERVIEW_PROJECTION_VERSION` 已给 no-token `memory_overview` selected projection 增加显式 contract marker：`access.selectedProjectionVersion=1`。该字段用于 Codex/Claude 客户端与审计面稳定识别 selected projection 输出形状，不暴露 full overview fields。Targeted validation `node --check src\core\MemoryOverviewService.js`、`node --check tests\memory-overview-no-token-selected-projection.test.js` 与 `node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js` 已通过 `29/29`；默认 suite 与 docs validation 见 `.agent_board/VALIDATION_LOG.md`。CM-1258 不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不改变 readiness。

`CM-1259 NO_TOKEN_OVERVIEW_CONTRACT_ALLOWLIST` 已给 no-token `memory_overview` selected projection 增加 explicit key allowlist regression test：direct core test 现在锁定 selected overview top-level fields、`access` fields、count-only write `summary`、`recall` 与 count-only `recall.summary` 的允许键集合，防止后续把 full overview fields 意外扩回无 token 输出面。Targeted validation 与默认 suite 见 `.agent_board/VALIDATION_LOG.md`。CM-1259 是 test/docs/status-only hardening，不改 runtime behavior，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不改变 readiness。

`CM-1260 NO_TOKEN_OVERVIEW_HTTP_CONTRACT_ALLOWLIST` 已把 no-token `memory_overview` selected projection 的 allowlist guard 扩展到 HTTP JSON-RPC 边界：`tests/http-no-token-search-rejection.test.js` 与 `tests/mcp-http.test.js` 现在锁定客户端实际收到的 selected overview top-level fields 与 `access` disclosure flags。Targeted validation 与默认 suite 见 `.agent_board/VALIDATION_LOG.md`。CM-1260 是 test/docs/status-only hardening，不改 runtime behavior，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不改变 readiness。

`CM-1261 MEMORY_OVERVIEW_SCHEMA_DESCRIPTION_SYNC` 已同步客户端可见契约说明：`memory_overview` 的 `tools/list` description 现在明确 HTTP no-token calls 只返回 selected low-disclosure overview projection，而 bearer-token calls 返回 full overview；README 的 no-token 行为说明也同步到 CM-1255+ 当前事实。Targeted validation 与默认 suite 见 `.agent_board/VALIDATION_LOG.md`。CM-1261 只改 source metadata/test/docs/status，不改 runtime execution path，不扩 public MCP tools，不改变 readiness。

`CM-1262 MEMORY_OVERVIEW_HTTP_CLIENT_CONTRACT` 已补齐 HTTP client-visible contract regression：no-token HTTP `tools/list` 现在被测试证明会向客户端暴露 `memory_overview` selected low-disclosure projection 说明；bearer-token HTTP `tools/call memory_overview` 也被测试证明仍返回 full overview 专属字段如 `paths` 与 `embeddingProfile`，避免 selected projection 误降级授权客户端。CM-1262 是 test/docs/status-only hardening，不改 runtime behavior，不调用 provider/MCP，不扫描真实记忆，不写 durable memory/audit，不改变 config/watchdog/startup，不改变 readiness。

CM-1255/CM-1256/CM-1257/CM-1258/CM-1259/CM-1260/CM-1261/CM-1262 关闭的是 no-token `memory_overview` selected-output implementation/test/privacy/contract/client-description-hardening slice；如需执行真实 dry-run、recovery/apply、watchdog/startup 安装、strict gate、runtime collector、cutover 或其他 A5/Red-lane 动作，用户仍需使用 fresh HEAD 给出 exact approval。不得把 CM-1210/CM-1211/CM-1212/CM-1213/CM-1214/CM-1215/CM-1216/CM-1217/CM-1218/CM-1219/CM-1220/CM-1221/CM-1222/CM-1223/CM-1224/CM-1225/CM-1226/CM-1227/CM-1228/CM-1229/CM-1230/CM-1231/CM-1232/CM-1233/CM-1234/CM-1235/CM-1236/CM-1237/CM-1238/CM-1239/CM-1240/CM-1241/CM-1242/CM-1243/CM-1244/CM-1245/CM-1246/CM-1247/CM-1248/CM-1249/CM-1250/CM-1251/CM-1252/CM-1253/CM-1254/CM-1255/CM-1256/CM-1257/CM-1258/CM-1259/CM-1260/CM-1261/CM-1262 解释为 runtime readiness、RC readiness、production readiness、cutover readiness、write reliability、recall reliability、governance readiness、migration readiness 或 `RC_READY`。

## 当前权威入口

恢复上下文优先读：

1. [README.md](/A:/codex-memory/README.md)
2. [STATUS.md](/A:/codex-memory/STATUS.md)
3. [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
4. [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
5. [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)

导航规则见 [PHASE_NAVIGATION.md](/A:/codex-memory/PHASE_NAVIGATION.md)。文档职责边界见 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)。

## Git 事实使用规则

本文件不再把 post-commit / post-push `HEAD` 或 `origin/main` 当作长期权威事实写死。提交和推送会改变这些值；当前 Git 事实必须以 fresh command output 为准。

CM-1204 / CM-1205 本地验证时的历史快照是：

- 分支：`main`
- 本地 `HEAD = abb1a266b4a74915d7242b701782a5ef90511e32`
- `origin/main = 13922dac462a6d9709160b27f9be6fb5dd4506dc`
- 验证时 branch state：`main...origin/main [ahead 1]`
- 验证时 tracked worktree 有 docs/board 瘦身改动。

该快照只用于解释 CM-1204 / CM-1205 的验证上下文，不代表读取本文件时的当前分支状态。

仍保持未跟踪且未处理：

- `CLAUDE.md`
- `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md`

任何 merge、push、release、runtime gap closure、dogfood、approval packet 或 readiness 判断前，必须重新运行：

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

## 最近验证锚点

`13922da chore: salvage branch review artifacts` 已推送到 `origin/main`。该提交把已审查旧分支中的仍有价值内容移植到主线：

- `tests/governance-schema.test.js`
- `docs/VCP_MEMORY_CORE_100_PERCENT_IMPLEMENTATION_PLAN.md`
- `docs/personal-production-readiness.md`

已验证：

- `node --test tests\governance-schema.test.js` passed `5/5`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed
- `git diff --check` passed
- `npm test` passed `2754/2754`

历史 hardening 证据也曾通过：`npm run test:hardening` hardening `73/73` + override evidence `6/6`；fixture-only `gate:ci` PASS。它们不构成 runtime readiness。

CM-1202 through CM-1207 是 docs-only 状态面瘦身 / runtime-scope preflight：

- 不改 source/runtime/test/package/lock/config/env/secret/watchdog/startup。
- 不执行 provider/API。
- 不调用真实 `record_memory` / `search_memory` / `memory_overview`。
- 不关闭 runtime gaps。
- 不把 push / PR / tag / release / deploy 当作 docs 证据或 readiness 证据；remote sync 只在用户明确授权下执行。
- 不声明 readiness 或 reliability。
- CM-1207 只推荐下一步 A5 approval scope；不运行 `gate:mainline:strict`、HTTP observe、provider、real memory scan 或 durable write。

## 当前分支清理事实

已完成：

- `main` 已推送到 `origin/main`。
- 远端旧分支 `origin/p0-reliability-fixes` 已删除。
- 远端旧分支 `origin/codex/p1-vcp-memory-core-100-roadmap` 已删除。

本地仍可能存在未 ancestry-merged 的 `salvage/review-*` 标记分支。安全删除曾被 Git 拒绝；不要用强制删除绕过项目规则。

## Runtime 状态

Public MCP tools 仍冻结为：

```text
record_memory
search_memory
memory_overview
```

当前 runtime gap / A5 状态以这些文件为索引入口：

- [docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md](/A:/codex-memory/docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md)
- [docs/P66_RUNTIME_GAP_TRUTH_TABLE.md](/A:/codex-memory/docs/P66_RUNTIME_GAP_TRUTH_TABLE.md)
- [docs/P66_A5_RUNTIME_GAP_CLOSURE_APPROVAL_PACKET.md](/A:/codex-memory/docs/P66_A5_RUNTIME_GAP_CLOSURE_APPROVAL_PACKET.md)
- [docs/CM1207_RUNTIME_GAP_CLOSURE_SCOPE_PREFLIGHT.md](/A:/codex-memory/docs/CM1207_RUNTIME_GAP_CLOSURE_SCOPE_PREFLIGHT.md)

真实 runtime gap closure 仍需要单独 exact approval、fresh Git facts、fresh evidence binding、明确验证和 fail-closed 记录。

## 历史归档

历史 CM/Pxx 流水不再保存在 active status surface 中。查看历史：

- 归档索引：[docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md)
- Backlog 归档索引：[docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md)
- Memory 归档索引：[docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md)
- Git 中的压缩前 active surfaces：

```powershell
git show abb1a26:MEMORY.md
git show abb1a26:MAINTENANCE_BACKLOG.md
git show 13922da:STATUS.md
git show 13922da:.agent_board/HANDOFF.md
git show 13922da:.agent_board/CHECKPOINT.md
git show 13922da:.agent_board/TASK_QUEUE.md
git show 13922da:.agent_board/VALIDATION_LOG.md
git show 13922da:.agent_board/AUTOPILOT_LEDGER.md
```

仓库事实、源码行为和当前命令输出始终高于历史状态面。
