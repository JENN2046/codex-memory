# codex-memory Status

更新时间：2026-05-31

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

当前下一步是用 fresh `HEAD` 给出 exact A5-GAP-3 approval 后才可执行 migration readiness dry-run，或继续做 ValidationAggregator full implementation 的后续本地实现。不得把 CM-1210/CM-1211/CM-1212/CM-1213/CM-1214/CM-1215/CM-1216/CM-1217/CM-1218/CM-1219/CM-1220/CM-1221/CM-1222/CM-1223/CM-1224 解释为 runtime readiness、RC readiness、production readiness、cutover readiness、write reliability、recall reliability、governance readiness、migration readiness 或 `RC_READY`。

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
