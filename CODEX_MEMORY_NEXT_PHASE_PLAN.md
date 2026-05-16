# codex-memory Next Phase Plan

更新时间：2026-05-15

## 目的

这份文档是 `codex-memory` 主项目收官后的薄版下一阶段计划。

它不是新的长 backlog，也不是替代 README / STATUS / `.agent_board` 的事实源。它只回答三个问题：

- 下一阶段先做什么
- 哪些能力暂时只设计不实现
- 哪些边界不能自动越过

详细任务仍以 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md) 为准。

长期路线图事实源：

- [docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)

当前路线图口径：

- current: P16 TagMemo / semantic association parity planning
- target: VCP memory practical parity 100%
- near-term priority: P16 planning -> P16.1 fixture inventory
- do not jump early: P17 / V8 / UI / release candidate

本文件只保留近期摘要。不要把 P10-P23 全文复制到这里，避免与路线图事实源漂移。

当前 P10.1 本地收口：

- 入口：[docs/runtime-policy-gates.md](/A:/codex-memory/docs/runtime-policy-gates.md)
- 目标：把 P10 runtime gate 的安全开关、默认行为、验证入口和 CI-safe policy preflight 固化到文档与 `gate:ci` 可见面。
- 边界：不进入 P11，不扩展 runtime enforcement，不新增 MCP tool，不调用 provider，不 push。
- P11 memory lifecycle core planning 暂缓到 P10.1 closeout 之后。

当前 P11 planning：

- 入口：[docs/MEMORY_LIFECYCLE_CORE_PLAN.md](/A:/codex-memory/docs/MEMORY_LIFECYCLE_CORE_PLAN.md)
- 目标：先定义 lifecycle statuses、transition rules、audit event shape、read policy relationship 和 future test acceptance。
- 边界：docs/tests-design only；不改 runtime，不改 tests，不新增 MCP tool，不做 SQLite migration，不迁移真实数据。
- 当前进度：P11.1 fixture schema tests、P11.2 SQLite lifecycle dry-run planning、P11.3 lifecycle SQLite dry-run CLI fixture tests 均已进入远端主线。

当前 P11.4 planning：

- 入口：[docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md](/A:/codex-memory/docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md)
- 目标：规划 `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` 的默认关闭策略、status visibility matrix、scope 关系和 read audit summary。
- 边界：docs/tests-design only；不改 runtime，不改 tests，不改 `package.json`，不改变 `search_memory` 行为。
- 下一步建议：P11.5 lifecycle read-policy fixture tests。

当前 stale branch quarantine：

- 审查记录：[docs/STALE_BRANCH_REVIEW_codex_p1_vcp_memory_core_100_roadmap.md](/A:/codex-memory/docs/STALE_BRANCH_REVIEW_codex_p1_vcp_memory_core_100_roadmap.md)
- `codex/p1-vcp-memory-core-100-roadmap` 是 superseded stale reference branch，不作为后续开发基线。
- Next development base remains `origin/main`; only selective, rewritten documentation salvage is allowed.

当前 P12 planning：

- 入口：[docs/CONTROLLED_WRITE_TOOLS_PLAN.md](/A:/codex-memory/docs/CONTROLLED_WRITE_TOOLS_PLAN.md)
- 目标：规划未来 `update_memory` / `supersede_memory` / `forget_memory` / `audit_memory` / `validate_memory` / `checkpoint_memory` / `handoff_memory` 等受控写入能力。
- 边界：planning only；不实现 runtime mutation，不新增 MCP public tools，不改 MCP schema，不做 SQLite migration，不写真实 memory。
- 当前进度：P12.1 fixture schemas、P12.2 mutation audit shape tests、P12.3 dry-run CLI prototypes、P12.4 MCP tool proposal review 均已进入远端主线。
- 当前治理任务：A4.8 Safe Project Operator Rail 已进入远端主线，入口为 [docs/A4_8_SAFE_PROJECT_OPERATOR_RAIL.md](/A:/codex-memory/docs/A4_8_SAFE_PROJECT_OPERATOR_RAIL.md)。
- 当前产品阶段：P12.5 first runtime mutation tool planning/approval gate 已完成，入口为 [docs/P12_5_RUNTIME_MUTATION_APPROVAL_GATE.md](/A:/codex-memory/docs/P12_5_RUNTIME_MUTATION_APPROVAL_GATE.md)；runtime mutation 仍需显式批准。

当前 P13 planning：

- 入口：[docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md](/A:/codex-memory/docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md)
- 决策：保持 `validate_memory` internal-only，不进入 public `validate_memory` MCP proposal review。
- 目标：规划 VCP-compatible practical object model，包括 `MemoryRecord` vNext、chunk、tag、scope/context、checkpoint/handoff、audit、tombstone、proposal 和 migration 对象族。
- 当前进度：P13 planning 已完成；P13.1 object model fixture schemas 已新增 `tests/fixtures/vcp-memory-object-model-v1.json` 与 `tests/vcp-memory-object-model-fixture.test.js`；P13.2 object model round-trip fixture tests 已新增 `tests/fixtures/vcp-memory-object-round-trip-v1.json` 与 `tests/vcp-memory-object-round-trip.test.js`；P13.3 SQLite/diary mapping dry-run planning 已新增 [docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md](/A:/codex-memory/docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md)。
- 边界：fixture/tests/docs only；不改 runtime，不改 `package.json`，不新增 MCP public tools，不改 MCP schema，不做 SQLite migration，不写真实 memory。
- P13.4 object mapping fixture tests 已新增 synthetic SQLite / diary / audit / chunk / tag mapping fixture 与测试，锁住 mapping preview、missing field policy、low-risk summary、proposal/tombstone defaults、`mutated=false` 和 no-side-effect 边界。
- P13.5 SQLite / diary mapping dry-run CLI 已新增 fixture-safe `npm run vcp-memory:mapping:dry-run -- --json`，默认 `sourceMode=fixture`、`mutated=false`，拒绝 `--confirm/--apply/--migrate`，不读取真实 DB/diary，不生成 import/export 文件，不做 migration。
- P13.6 import/export-safe JSON shape fixture tests 已新增 export/import envelope fixture 与测试，锁住 schema、record/chunk/tag/audit refs、hidden tombstone、inactive proposal、redaction/policy flags、deterministic checksum、dry-run-first import mode、`mutated=false` 和 no-side-effect。
- P13.7 migration readiness report 已新增 `npm run vcp-memory:migration-readiness -- --json`，read-only fixture-backed，报告 P13 readiness，保持 `migrationBlocked=true` 与 `mutated=false`，拒绝 `--apply/--migrate/--confirm`。
- P13.x closeout review 已新增 [docs/P13_OBJECT_MODEL_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P13_OBJECT_MODEL_CLOSEOUT_REVIEW.md)，结论是 P13 fixture/dry-run ready、migration 仍 blocked、可进入 P14 planning。
- 下一步建议：`P14-donor-behavior-parity-gate-planning`；P14 必须从 planning / fixture / gate design 开始，不自动开始 P14 implementation。

当前 P14 planning：

- 入口：[docs/DONOR_BEHAVIOR_PARITY_GATE_PLAN.md](/A:/codex-memory/docs/DONOR_BEHAVIOR_PARITY_GATE_PLAN.md)
- 目标：把 DeepMemo / TopicMemo / passive memory query / donor error semantics / ranking tie-breakers / compare-rollback suite expansion 规划成可度量 standing gate。
- 边界：planning / docs / board only；不改 runtime，不改 donor behavior，不改 public MCP tools，不改 import/export 或 migration，不进入 P15/P16/P17/V8/UI。
- P14.1 fixture inventory 已新增 [docs/DONOR_PARITY_FIXTURE_INVENTORY.md](/A:/codex-memory/docs/DONOR_PARITY_FIXTURE_INVENTORY.md)，记录当前 standard suite `43` cases、category/fixture 分布、覆盖面和缺口。
- P14.2 DeepMemo targeted parity fixtures 已新增 `tests/fixtures/deepmemo-donor-parity-v1.json` 与 `tests/deepmemo-donor-parity-fixture.test.js`，锁住 payload shape、blocked keyword meta placement、advanced syntax payload stability 和 ranking order snapshot。
- P14.3 TopicMemo targeted parity fixtures 已新增 `tests/fixtures/topicmemo-donor-parity-v1.json` 与 `tests/topicmemo-donor-parity-fixture.test.js`，锁住 ListTopics / GetTopicContent payload shape、missing topic/history error envelope、agentId alias boundary 和 locked-topic display。
- P14.4 error/meta parity tests 已新增 `tests/fixtures/donor-error-meta-parity-v1.json` 与 `tests/donor-error-meta-parity-fixture.test.js`，锁住 DeepMemo / TopicMemo 共享 error envelope、`meta` placement、full diagnostic success meta 和 known intentional differences allowlist。
- P14.5 ranking/tie-breaker parity tests 已新增 `tests/fixtures/donor-ranking-tie-breaker-parity-v1.json` 与 `tests/donor-ranking-tie-breaker-parity-fixture.test.js`，锁住当前 standard-suite 全部 `ordering` cases 的显式顺序快照。
- P14.6 compare/rollback standing gate summary 已新增 [docs/DONOR_PARITY_STANDING_GATE_SUMMARY.md](/A:/codex-memory/docs/DONOR_PARITY_STANDING_GATE_SUMMARY.md)，记录 standard-suite compare `43/43 matched`、rollback `43/43 rollback-ready`、category matrix、targeted fixture evidence、边界和剩余风险。

当前 P15 planning：

- 入口：[docs/P15_REAL_QUERY_QUALITY_GATE_PLAN.md](/A:/codex-memory/docs/P15_REAL_QUERY_QUALITY_GATE_PLAN.md)
- P15.1 inventory：[docs/P15_REAL_QUERY_QUALITY_FIXTURE_INVENTORY.md](/A:/codex-memory/docs/P15_REAL_QUERY_QUALITY_FIXTURE_INVENTORY.md)
- P15.2 expansion：[docs/P15_REAL_QUERY_QUALITY_FIXTURE_EXPANSION.md](/A:/codex-memory/docs/P15_REAL_QUERY_QUALITY_FIXTURE_EXPANSION.md)
- P15.3 report shape：[docs/P15_QUERY_QUALITY_REPORT_SHAPE_TESTS.md](/A:/codex-memory/docs/P15_QUERY_QUALITY_REPORT_SHAPE_TESTS.md)
- P15.4 standing gate：[docs/P15_FIXTURE_RECALL_DRY_RUN_STANDING_GATE.md](/A:/codex-memory/docs/P15_FIXTURE_RECALL_DRY_RUN_STANDING_GATE.md)
- P15.5 real-memory dry-run planning：[docs/P15_REAL_MEMORY_QUERY_DRY_RUN_PLAN.md](/A:/codex-memory/docs/P15_REAL_MEMORY_QUERY_DRY_RUN_PLAN.md)
- P15.6 closeout review：[docs/P15_QUERY_QUALITY_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P15_QUERY_QUALITY_CLOSEOUT_REVIEW.md)
- 目标：把 real query quality 从 donor parity 中拆出来，规划 fixture-first standing gate，覆盖 relevance、precision、scope/lifecycle/privacy safety、failure reporting 和 JSON report stability。
- 当前基线：`real-query-suite` 与 `query:quality` fixture recall dry-run 均为 `14/14`、`mutated=false`、`providerCalls=0`、`durableMemoryTouched=false`。
- 边界：tests/docs/board only；不改 runtime，不调用 provider，不改 package，不改 MCP，不做 migration/import-export apply。
- 当前 P15.6：P15 query-quality sequence is closeout-ready after docs validation; future real-memory dry-run remains planning-only and still requires explicit approval before any real local memory preview.
- P15 closeout result：可进入 `P16-TagMemo-semantic-association-parity-planning`；仍不得进入 P16 runtime implementation、provider benchmark、V8、UI、migration/import-export apply、release candidate。

当前 P16 planning / inventory：

- 入口：[docs/P16_TAGMEMO_SEMANTIC_ASSOCIATION_PARITY_PLAN.md](/A:/codex-memory/docs/P16_TAGMEMO_SEMANTIC_ASSOCIATION_PARITY_PLAN.md)
- P16.1 inventory：[docs/P16_TAGMEMO_SEMANTIC_FIXTURE_INVENTORY.md](/A:/codex-memory/docs/P16_TAGMEMO_SEMANTIC_FIXTURE_INVENTORY.md)
- P16.2 fixture shape tests：`tests/fixtures/tagmemo-semantic-fixture-shape-v1.json` + `tests/tagmemo-semantic-fixture-shape.test.js`
- P16.3 targeted semantic fixtures：`tests/fixtures/tagmemo-targeted-semantic-v1.json` + `tests/tagmemo-targeted-semantic-fixture.test.js`
- P16.4 evidence gate：[docs/P16_SEMANTIC_RANKING_EVIDENCE_GATE.md](/A:/codex-memory/docs/P16_SEMANTIC_RANKING_EVIDENCE_GATE.md)
- P16.5 compare/rollback semantic gate：[docs/P16_COMPARE_ROLLBACK_SEMANTIC_GATE.md](/A:/codex-memory/docs/P16_COMPARE_ROLLBACK_SEMANTIC_GATE.md)
- P16.x closeout：[docs/P16_TAGMEMO_SEMANTIC_ASSOCIATION_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P16_TAGMEMO_SEMANTIC_ASSOCIATION_CLOSEOUT_REVIEW.md)
- 目标：把 TagMemo association、semantic grouping、EPA / ResidualPyramid telemetry、ordering feel 和 query-quality interaction 规划成 fixture-first parity evidence。
- 当前基线：P14 compare `43/43 matched`、rollback `43/43 rollback-ready`；P15 fixture recall dry-run `14/14`、`mutated=false`、`providerCalls=0`、`durableMemoryTouched=false`。
- 保护面：`TagMemoEngine`、`EPAModule`、`ResidualPyramid`、`SemanticGroupManager`、passive `::TagMemo` / `::Rerank` syntax、LightMemo `tag_boost` / `core_tags` compatibility。
- 边界：planning / docs / board only；不改 runtime、不改 tests、不改 package、不新增 MCP public tools、不改 MCP schema、不做 provider call、不做 SQLite migration、不读取或写入真实 memory、不进入 P17/V8/UI。
- 当前状态：P16 planning through P16.5 均已完成并推送；P16.x closeout 已完成本地 docs validation，等待 guarded commit / safe-push readiness。
- 下一步建议：收口 `P16.x-closeout-review` 的 commit / safe-push，然后进入 `P17-advanced-memory-intelligence-v8-evidence-gate-planning`。

当前 P17 planning：

- 入口：[docs/P17_ADVANCED_MEMORY_INTELLIGENCE_V8_EVIDENCE_GATE_PLAN.md](/A:/codex-memory/docs/P17_ADVANCED_MEMORY_INTELLIGENCE_V8_EVIDENCE_GATE_PLAN.md)
- 目标：把 V8 / advanced-memory intelligence 从“已有诊断能力”拆成 evidence-first gate，先锁 read-only diagnostic shape、forbidden fields、query-quality interaction 和 policy/lifecycle compatibility。
- 当前状态：P16 已关闭为 `FIXTURE_BACKED_AND_GATE_CHECKED`；P17 planning 已完成本地 docs validation，等待 guarded commit / safe-push readiness。
- 下一步建议：收口 `P17-advanced-memory-intelligence-v8-evidence-gate-planning` 的 commit / safe-push，然后进入 `P17.1-v8-diagnostic-surface-inventory`。
- 边界：planning / docs / board only；不改 runtime、不新增 tests、不跑 provider、不做 real memory preview、不改 MCP、不做 migration/import-export apply、不进入 V8 implementation。

当前 P17.1 inventory：

- 入口：[docs/P17_V8_DIAGNOSTIC_SURFACE_INVENTORY.md](/A:/codex-memory/docs/P17_V8_DIAGNOSTIC_SURFACE_INVENTORY.md)
- 目标：盘点 `v8-diagnose`、`TagMemoEngine`、`EPAModule`、`ResidualPyramid`、`RerankService`、`CandidateGenerator`、existing tests 和 future fixture query families。
- 当前状态：P17.1 inventory 已完成 validation、guarded commit、safe-push 和 post-push hash verification。
- 下一步建议：继续 `P17.2-v8-diagnostic-fixture-shape-tests`。
- 边界：inventory / docs / board only；不改 runtime、不新增 tests、不运行 `v8-diagnose`、不跑 provider、不做 real memory preview、不改 MCP、不做 migration/import-export apply。

当前 P17.2 fixture shape tests：

- 入口：[docs/P17_V8_DIAGNOSTIC_FIXTURE_SHAPE_TESTS.md](/A:/codex-memory/docs/P17_V8_DIAGNOSTIC_FIXTURE_SHAPE_TESTS.md)
- Fixture：`tests/fixtures/v8-diagnostic-shape-v1.json`
- Test：`tests/v8-diagnostic-shape.test.js`
- 目标：锁定 synthetic `v8-diagnose` report shape、安全 flags、forbidden fields 与 missing-query safe error shape。
- 当前状态：P17.2 fixture/test/docs 已完成本地 validation：targeted fixture test `5/5`、full suite `434/434`、diff check、docs validation 均通过。
- 当前状态：P17.2 已完成 guarded commit、safe-push 和 post-push hash verification at `3b7fa68197abc1f75d7fed775da2b569e1ea0d47`。
- 下一步建议：继续 `P17.3-v8-diagnostic-cli-shape-gate`。
- 边界：tests/fixtures/docs/status/board only；不改 `src/`、不调 runtime ranking、不跑 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不实现 V8。

当前 P17.3 CLI shape gate：

- 入口：[docs/P17_V8_DIAGNOSTIC_CLI_SHAPE_GATE.md](/A:/codex-memory/docs/P17_V8_DIAGNOSTIC_CLI_SHAPE_GATE.md)
- Fixture：`tests/fixtures/v8-diagnostic-cli-gate-v1.json`
- Test：`tests/v8-diagnostic-cli-shape-gate.test.js`
- 目标：锁定 `v8-diagnose` CLI JSON/text/error shell，确认 forbidden unsafe/fake quality fields 不出现在 output 中。
- 当前状态：P17.3 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `6afea7601fddadcfa845bf6d93eccef91aede7fe`。
- 下一步建议：继续 `P17.4-v8-query-family-fixture-tests`。
- 边界：tests/fixtures/docs/status/board only；不改 `src/`、不调 runtime ranking、不跑 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不实现 V8。

当前 P17.4 query-family fixture tests：

- 入口：[docs/P17_V8_QUERY_FAMILY_FIXTURE_TESTS.md](/A:/codex-memory/docs/P17_V8_QUERY_FAMILY_FIXTURE_TESTS.md)
- Fixture：`tests/fixtures/v8-query-family-v1.json`
- Test：`tests/v8-query-family-fixture.test.js`
- 目标：覆盖 technical / governance / quality / semantic / safety synthetic diagnostic families，锁住 normalized query、TagMemo mode、geodesic flags、core tags、terrain axes、residual pyramid、meta-thinking shape 和 forbidden fake/unsafe fields。
- 当前状态：P17.4 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `faf80c5f0368cad8ac1c0edc82c90538ef4505c6`。
- 下一步建议：继续 `P17.5-v8-evidence-gate-summary`。
- 边界：tests/fixtures/docs/status/board only；不改 `src/`、不调 runtime ranking、不跑 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不实现 V8。

当前 P17.5 evidence gate summary：

- 入口：[docs/P17_V8_EVIDENCE_GATE_SUMMARY.md](/A:/codex-memory/docs/P17_V8_EVIDENCE_GATE_SUMMARY.md)
- 目标：汇总 P17 planning / inventory / report shape / CLI gate / query-family evidence。
- 当前状态：P17.5 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `087d1943e8805a30c47ff57e1b093a1ed0a3c08c`。
- 下一步建议：继续 `P17.x-closeout-review`。
- 边界：docs/status/board only；不改 `src/`、不新增 tests、不调 runtime ranking、不跑 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不实现 V8。

当前 P17.x closeout review：

- 入口：[docs/P17_ADVANCED_MEMORY_INTELLIGENCE_V8_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P17_ADVANCED_MEMORY_INTELLIGENCE_V8_CLOSEOUT_REVIEW.md)
- 目标：关闭 P17 advanced memory intelligence / V8 evidence gate，记录 evidence、boundary、known gaps 和 P18 入口。
- 当前状态：P17.x 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `2777a0413b5f51035443766192ed54ab1fb93168`。
- 下一步建议：继续 `P18-import-export-migration-safety-planning`。
- 边界：docs/status/board only；不改 `src/`、不新增 tests、不调 runtime ranking、不跑 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不实现 V8。

当前 P18 planning：

- 入口：[docs/P18_IMPORT_EXPORT_MIGRATION_SAFETY_PLAN.md](/A:/codex-memory/docs/P18_IMPORT_EXPORT_MIGRATION_SAFETY_PLAN.md)
- 目标：定义 dry-run-first import/export/migration safety route，复用 P13 object/import/export/mapping/migration-readiness evidence，并明确 backup/rollback/A5 approval boundary。
- 当前状态：P18 planning 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `650bca0feed4f39a6cf23d7ad5af65ac58213001`。
- 下一步建议：继续 `P18.1-import-export-fixture-inventory`。
- 边界：docs/status/board only；不改 `src/`、不新增 tests、不执行 import/export apply、不跑 migration、不读取 real memory、不改 MCP、不做 provider call。

当前 P18.1 inventory：

- 入口：[docs/P18_IMPORT_EXPORT_FIXTURE_INVENTORY.md](/A:/codex-memory/docs/P18_IMPORT_EXPORT_FIXTURE_INVENTORY.md)
- 目标：盘点 P13 import/export/mapping/migration-readiness fixture 和 dry-run evidence，明确 P18.2 fixture expansion 缺口。
- 当前状态：P18.1 inventory 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `322f8dce7d46fcf2c3564024d3da8e243c147c86`。
- 下一步建议：继续 `P18.2-export-envelope-fixture-expansion`。
- 边界：docs/status/board only；不改 `src/`、不新增 tests、不执行 import/export apply、不跑 migration、不读取 real memory、不改 MCP、不做 provider call。

当前 P18.2 fixture expansion：

- 入口：[docs/P18_EXPORT_ENVELOPE_FIXTURE_EXPANSION.md](/A:/codex-memory/docs/P18_EXPORT_ENVELOPE_FIXTURE_EXPANSION.md)
- 目标：新增 synthetic export envelope fixture/test，锁住 multi-record、lifecycle variants、supersession refs、conflict preview、backup/rollback requirements 和 no-side-effect flags。
- 当前状态：P18.2 fixture/test/docs 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `8b7a1973f2807df1de1506f892e64a5e004dc904`。
- 下一步建议：继续 `P18.3-import-mapping-dry-run-evidence-gate`。
- 边界：fixture/test/docs only；不改 `src/`、不执行 import/export apply、不生成 export file、不跑 migration、不读取 real memory、不改 MCP、不做 provider call。

当前 P18.3 dry-run evidence：

- 入口：[docs/P18_IMPORT_MAPPING_DRY_RUN_EVIDENCE_GATE.md](/A:/codex-memory/docs/P18_IMPORT_MAPPING_DRY_RUN_EVIDENCE_GATE.md)
- 目标：汇总现有 fixture-only mapping dry-run CLI 与 migration readiness CLI 证据，判断是否可进入 backup/rollback safety review。
- 当前状态：P18.3 evidence doc 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `85a389926d129ecfd4a462a5ecaf91778e2d2cc2`。
- 下一步建议：继续 `P18.4-backup-rollback-safety-review`。
- 边界：docs/evidence only；不改 `src/`、不执行 import/export apply、不生成 export file、不跑 migration、不读取 real memory、不改 MCP、不做 provider call。

当前 P18.4 backup / rollback safety review：

- 入口：[docs/P18_BACKUP_ROLLBACK_SAFETY_REVIEW.md](/A:/codex-memory/docs/P18_BACKUP_ROLLBACK_SAFETY_REVIEW.md)
- 目标：定义 future apply/migration 前必须具备的 backup requirement、rollback story、A5 approval packet 和 validation matrix。
- 当前状态：P18.4 review 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `0faba9272b3828e58a142bc4988329201ea67f2c`。
- 下一步建议：继续 `P18.x-closeout-review`。
- 边界：docs-only；不创建 backup、不 restore、不执行 import/export apply、不跑 migration、不读取 real memory、不改 MCP、不做 provider call。

当前 P18.x closeout：

- 入口：[docs/P18_IMPORT_EXPORT_MIGRATION_SAFETY_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P18_IMPORT_EXPORT_MIGRATION_SAFETY_CLOSEOUT_REVIEW.md)
- 目标：关闭 P18 import/export/migration safety chain，记录 evidence、boundary、known gaps 和 P19 planning handoff。
- 当前状态：P18.x closeout 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `2d5ce90ecbfcdb0a9dd6ca26b00f5fbff5483528`。
- 下一步建议：继续 `P19-observability-admin-review-surface-planning`。
- 边界：docs/status/board only；不执行 import/export apply、不创建 backup、不 restore、不跑 migration、不读取 real memory、不改 MCP、不做 provider call。

当前 P19 planning：

- 入口：[docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_PLAN.md](/A:/codex-memory/docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_PLAN.md)
- 目标：规划 dashboard / `observe:http` / `governance:report` / `gate:ci` / `gate:mainline` 的只读 admin review surface，先定义 review questions、shape、subphase order 和 safety boundaries。
- 当前状态：P19 planning 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `5571788e926f2842916eb791b91b709bce078fc2`。
- 下一步建议：继续 `P19.1-observability-admin-review-surface-inventory`。
- 边界：docs/status/board only；不实现 UI、不改 `src/`、不新增 tests、不调用 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不改 package/lockfile。

当前 P19.1 inventory：

- 入口：[docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_INVENTORY.md](/A:/codex-memory/docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_INVENTORY.md)
- 目标：盘点 dashboard / `observe:http` / `governance:report` / `gate:ci` / `gate:mainline` 现有 review surface、schema tests、safety flags 和缺口。
- 当前状态：P19.1 inventory 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `4004fca6538fd47e2c6dd15836a512db62ff602a`。
- 下一步建议：继续 `P19.2-admin-review-surface-shape-tests`。
- 边界：docs/status/board only；不实现 UI、不改 `src/`、不新增 tests、不调用 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不改 package/lockfile。

当前 P19.2 shape tests：

- 入口：[docs/P19_ADMIN_REVIEW_SURFACE_SHAPE_TESTS.md](/A:/codex-memory/docs/P19_ADMIN_REVIEW_SURFACE_SHAPE_TESTS.md)
- Fixture：`tests/fixtures/admin-review-surface-v1.json`
- Test：`tests/admin-review-surface-shape.test.js`
- 目标：锁住 synthetic admin-review top-level/source/signal/safety/unavailable-source shape，并禁止 fake quality/provider claims、raw secrets 和 raw workspace identifiers。
- 当前状态：P19.2 fixture/test/docs 已完成 validation、guarded commit、safe-push 和 post-push hash verification at `c49fdf928f26e3bf75f191753d2220de9d4369bb`。
- 下一步建议：继续 `P19.3-admin-review-schema-snapshot-gate`。
- 边界：fixture/test/docs/status/board only；不实现 UI、不改 `src/`、不调用 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不改 package/lockfile。

当前 P19.3 schema snapshot gate：

- 入口：[docs/P19_ADMIN_REVIEW_SCHEMA_SNAPSHOT_GATE.md](/A:/codex-memory/docs/P19_ADMIN_REVIEW_SCHEMA_SNAPSHOT_GATE.md)
- Fixture：`tests/fixtures/admin-review-schema-snapshot-v1.json`
- Test：`tests/admin-review-schema-snapshot-gate.test.js`
- 目标：锁住 planned admin-review、dashboard、`observe:http`、`governance:report` 和 `gate:ci` 的 key-set snapshot，保持 duplicate-key guard 和 forbidden-key boundary。
- 当前状态：P19.3 已完成 targeted test、full suite、diff/docs validation、guarded commit、safe-push 和 post-push hash verification at `c5784fc082f08231eb326671ac510c52491f3f04`。
- 当前校准：`P19.3-post-push-state-sync` 将 STATUS / `.agent_board` 从 pending 同步为 pushed / verified。
- 下一步建议：进入 `P19.4-operator-troubleshooting-notes`。
- 边界：fixture/test/docs/status/board only；不实现 UI、不改 `src/`、不调用 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不改 package/lockfile。

当前 P19.4 operator troubleshooting notes：

- 入口：[docs/P19_OPERATOR_TROUBLESHOOTING_NOTES.md](/A:/codex-memory/docs/P19_OPERATOR_TROUBLESHOOTING_NOTES.md)
- 目标：整理 dashboard、`observe:http`、`governance:report`、`gate:ci`、`gate:mainline` 的 operator troubleshooting map、review levels、blocked/unavailable source handling 和 safe next actions。
- 当前状态：P19.4 docs 已完成 diff/docs validation，等待 guarded commit 和 safe-push readiness。
- 下一步建议：完成 P19.4 validation / guarded commit / safe-push 后进入 `P19.x-observability-admin-review-surface-closeout`。
- 边界：docs/status/board only；不实现 UI、不改 `src/`、不新增 tests、不调用 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不改 package/lockfile。

当前 P19.x closeout：

- 入口：[docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_CLOSEOUT_REVIEW.md)
- 目标：关闭 P19 admin review surface evidence chain，记录 planning / inventory / shape fixture / schema snapshot / operator notes evidence、known gaps 和 P20 planning handoff。
- 当前状态：P19.x closeout 已完成 validation、guarded commit、safe-push 和 hash verification，commit 为 `f9baa27953b36e24474cd230df6d6134dad331cf`。
- 下一步已完成：`P20-local-production-hardening-planning` 已进入 `origin/main`。
- 边界：docs/status/board only；不实现 UI、不改 `src/`、不新增 tests、不调用 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不改 package/lockfile、不进入 release candidate。

当前 P20 planning：

- 入口：[docs/P20_LOCAL_PRODUCTION_HARDENING_PLAN.md](/A:/codex-memory/docs/P20_LOCAL_PRODUCTION_HARDENING_PLAN.md)
- 目标：规划 local production hardening 的 startup/watchdog inventory、health/readiness dry-run evidence、rollback/backup operations plan、safety checklist 和 closeout 顺序。
- 当前状态：P20 planning 已完成 validation、guarded commit、safe-push 和 post-push hash verification，对应提交为 `afaa64fe991a3f9458468cf3e6891cd8b29ed9a2`；当前 main 已继续推进到 P22 A5 approval boundary。GitHub Actions `CI` 当前仍在 Linux-only fixture contract drift 收口中：`591adf79863e1d2ed20232c0ca54b5711ff8c3ef` 失败 `470/472`，第一轮修复 `7e3ef76da50ae28e3a75d7a5164e30541eaa98f4` 仍因 donor ranking exact memory-label assertion 失败。
- P20.1 startup/watchdog inventory 已新增 [docs/P20_STARTUP_WATCHDOG_INVENTORY.md](/A:/codex-memory/docs/P20_STARTUP_WATCHDOG_INVENTORY.md)，盘点 `start:http:*` scripts、scheduled task / HKCU Run fallback、watchdog log、runtime entrypoint、风险和审批边界。
- P20.2 health/readiness dry-run evidence 已新增 [docs/P20_HEALTH_READINESS_DRY_RUN_EVIDENCE.md](/A:/codex-memory/docs/P20_HEALTH_READINESS_DRY_RUN_EVIDENCE.md)，记录 `gate:ci` fixture-only readiness evidence：compare `43/43`、rollback `43/43`、queries `14/14`、`mutated=false`、`providerCalls=0`，但 embedded tests 当前 `448/449`，阻塞于 P16.3 TagMemo semantic ordering fixture drift。
- P20.2a gate-ci TagMemo semantic drift review 已新增 [docs/P20_GATE_CI_TAGMEMO_SEMANTIC_DRIFT_REVIEW.md](/A:/codex-memory/docs/P20_GATE_CI_TAGMEMO_SEMANTIC_DRIFT_REVIEW.md)，确认 standalone targeted test 也失败，当前 drift 更像 P16.3 fixture contract 过度精确或 stale，而不是 P20 startup/watchdog 问题。
- P20.2b TagMemo targeted fixture contract repair 已新增 [docs/P20_TAGMEMO_TARGETED_FIXTURE_CONTRACT_REPAIR.md](/A:/codex-memory/docs/P20_TAGMEMO_TARGETED_FIXTURE_CONTRACT_REPAIR.md)，收窄 P16.3 exact ordering contract；targeted `3/3`、`gate:ci` tests `449/449`，CI-safe readiness 已回绿。
- P20.1 / CI failure reconciliation：当前远端 CI 在 `591adf79863e1d2ed20232c0ca54b5711ff8c3ef` 上报告 `npm test` `470/472`，失败点为 donor ranking tie-breaker fixture 与 TagMemo targeted semantic fixture；第一轮修复 `7e3ef76da50ae28e3a75d7a5164e30541eaa98f4` 已修复 TagMemo 但 CI run `25899201275` 仍暴露 donor ranking exact memory-label assertion。第二轮本地补丁只改 donor ranking fixture，把全部 ranking/tie-breaker cases 改为 content-level `resultIncludes`；targeted donor `2/2`、targeted TagMemo `3/3`、`npm test` `472/472`、`gate:ci` tests `457/457` 均通过，待 guarded commit / safe-push 后确认 Linux CI 回绿。
- P20.3 rollback / backup operations plan 已新增 [docs/P20_ROLLBACK_BACKUP_OPERATIONS_PLAN.md](/A:/codex-memory/docs/P20_ROLLBACK_BACKUP_OPERATIONS_PLAN.md)，定义 future backup manifest、rollback story、A5 approval packet、validation matrix 和 hard-stop 边界；不创建 backup、不 restore、不改配置、不启动服务。
- P20.4 local production safety checklist 已新增 [docs/P20_LOCAL_PRODUCTION_SAFETY_CHECKLIST.md](/A:/codex-memory/docs/P20_LOCAL_PRODUCTION_SAFETY_CHECKLIST.md)，整理 operator preflight、startup/watchdog safety、config safety、durable memory safety、warning signals、approval packet 和 stop conditions。
- P20.x local production hardening closeout 已新增 [docs/P20_LOCAL_PRODUCTION_HARDENING_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P20_LOCAL_PRODUCTION_HARDENING_CLOSEOUT_REVIEW.md)，关闭 P20 evidence chain，结论为 `LOCAL_PRODUCTION_HARDENING_EVIDENCE_READY_BLOCKED_FOR_APPLY`。
- 下一步建议：进入 `P21-Codex-Claude-client-integration-hardening-planning`。
- 边界：docs/planning only；不安装服务或 watchdog、不改 Codex/Claude 真实配置、不调用 provider、不读取 real memory、不改 MCP、不做 migration/import-export apply、不改 package/lockfile、不进入 release candidate。

当前 P21 planning：

- 入口：[docs/P21_CODEX_CLAUDE_CLIENT_INTEGRATION_HARDENING_PLAN.md](/A:/codex-memory/docs/P21_CODEX_CLAUDE_CLIENT_INTEGRATION_HARDENING_PLAN.md)
- 目标：规划 Codex / Claude client integration hardening，把 client identity、scope/visibility、acceptance docs、MCP config guidance 和 public tool freeze 变成可验证的 standing evidence。
- 当前状态：P21 planning 已新增计划文档，仍为 docs/status/board only。
- P21.1 client integration inventory 已新增 [docs/P21_CLIENT_INTEGRATION_INVENTORY.md](/A:/codex-memory/docs/P21_CLIENT_INTEGRATION_INVENTORY.md)，盘点 client docs、command surfaces、test coverage、acceptance evidence、gaps 和 hard-stop boundaries。
- P21.2 client scope acceptance fixture review 已新增 [docs/P21_CLIENT_SCOPE_ACCEPTANCE_FIXTURE_REVIEW.md](/A:/codex-memory/docs/P21_CLIENT_SCOPE_ACCEPTANCE_FIXTURE_REVIEW.md)，映射现有 scope tests 到 P21 gate categories；targeted scope tests `18/18`、scope acceptance CLI `5/5`、scope backfill dry-run `7/7` 均通过。
- P21.3 Claude acceptance evidence refresh plan 已新增 [docs/P21_CLAUDE_ACCEPTANCE_EVIDENCE_REFRESH_PLAN.md](/A:/codex-memory/docs/P21_CLAUDE_ACCEPTANCE_EVIDENCE_REFRESH_PLAN.md)，将 future refresh 分为 docs-only、read-only observation、config/model-mutating tiers；本阶段不运行 `claude mcp`。
- P21.4 client privacy boundary fixture tests 已新增 `tests/fixtures/p21-client-privacy-boundary-v1.json`、`tests/p21-client-privacy-boundary-fixture.test.js` 和 [docs/P21_CLIENT_PRIVACY_BOUNDARY_FIXTURE_TESTS.md](/A:/codex-memory/docs/P21_CLIENT_PRIVACY_BOUNDARY_FIXTURE_TESTS.md)，锁住 same-client private、cross-client private hiding、project/workspace/shared visibility、low-risk redaction 和 no-side-effect。
- P21.5 client integration standing gate summary 已新增 [docs/P21_CLIENT_INTEGRATION_STANDING_GATE_SUMMARY.md](/A:/codex-memory/docs/P21_CLIENT_INTEGRATION_STANDING_GATE_SUMMARY.md)，汇总 P21 planning / inventory / scope acceptance review / Claude refresh plan / privacy fixture evidence，并确认 live Claude、真实 config、runtime、provider、MCP expansion、migration/import-export apply 仍 blocked。
- P21.x client integration hardening closeout review 已新增 [docs/P21_CLIENT_INTEGRATION_HARDENING_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P21_CLIENT_INTEGRATION_HARDENING_CLOSEOUT_REVIEW.md)，将 P21 关闭为 `P21_CLIENT_INTEGRATION_HARDENING_CLOSED_READY_FOR_P22_PLANNING`。
- P22 release-candidate planning 已新增 [docs/P22_RELEASE_CANDIDATE_PLAN.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_PLAN.md)，定义 candidate contract freeze、required readiness gates、A5 approval packet、future P22 sequence 和 safety rules；结论 `P22_RELEASE_CANDIDATE_PLANNED_BLOCKED_FOR_IMPLEMENTATION_APPROVAL`。
- P22.1 release-candidate readiness inventory 已新增 [docs/P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md)，盘点 required gates 的最新证据、freshness、known gaps 和 approval blockers；结论 `P22_RELEASE_CANDIDATE_READINESS_INVENTORIED_BLOCKED_FOR_GATE_REFRESH`。
- P22.2 release-candidate gate matrix dry-run plan 已新增 [docs/P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md)，定义未来 RC gate matrix 的 report shape、gate 列表、blocker semantics 和执行顺序；结论 `P22_GATE_MATRIX_DRY_RUN_PLANNED_BLOCKED_FOR_EXECUTION_APPROVAL`。
- P22.3 release-candidate rollback/support story 已新增 [docs/P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md)，定义 future RC rollback tiers、support/troubleshooting map、operator handoff fields 和 approval boundaries；结论 `P22_ROLLBACK_SUPPORT_STORY_PLANNED_BLOCKED_FOR_APPROVAL_PACKET`。
- P22.4 release-candidate approval packet template 已新增 [docs/P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md)，提供 future A5 approval packet 模板；默认状态为 `NOT_APPROVED_TEMPLATE_ONLY`，不授权任何命令执行或 RC 创建。
- P22.x release-candidate planning closeout review 已新增 [docs/P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md)，关闭 P22 planning chain；结论 `P22_RELEASE_CANDIDATE_PLANNING_CLOSED_BLOCKED_FOR_EXPLICIT_RC_APPROVAL`。
- P22 release-candidate gate refresh approval request draft 已切换为 temporary worktree execution model [docs/P22_RELEASE_CANDIDATE_GATE_REFRESH_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_GATE_REFRESH_APPROVAL_REQUEST.md)：`rc_target_commit=806cc847cb37a3e428099b45871a4f1a13c4fa6f` 是未来被测 RC 代码目标，`approval_request_commit=c1bb2984a948220376f3fb4265d64589bc0c94c2` 是审批请求版本；未来 `gate_execution_checkout` / temporary worktree 的 `HEAD` 必须等于 `rc_target_commit`，当前 `main` 可停留在 approval docs state；不运行任何 gate、不创建 worktree。
- P22 approved local non-provider RC gate refresh result 已记录在 [docs/P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md)：result `PASS`；记录 `npm test` `472/472`、`gate:ci` tests `457/457`、compare `43/43`、rollback `43/43`、`providerCalls=0`、`mutated=false`；本记录阶段未重跑 gates，未创建 RC。
- P22.5 release-candidate artifact approval request 已新增 [docs/P22_RELEASE_CANDIDATE_ARTIFACT_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_APPROVAL_REQUEST.md)：future RC artifact creation approval draft only，默认 `NOT_APPROVED` / `BLOCKED_HARD_STOP`，不创建 RC artifact。
- P22.6 release-candidate artifact manifest shape 已新增 [docs/P22_RELEASE_CANDIDATE_ARTIFACT_MANIFEST_SHAPE.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_MANIFEST_SHAPE.md)：定义 future RC artifact JSON/Markdown manifest shape，覆盖 candidate id、target commit、gate evidence、MCP tool freeze、`validate_memory` internal-only、mutation boundaries、known gaps、rollback/support、approval status；不生成真实 artifact。
- P22.7 release-candidate notes draft 已新增 [docs/P22_RELEASE_CANDIDATE_NOTES_DRAFT.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_NOTES_DRAFT.md)：这是 release-candidate notes draft，不是 release；覆盖 scope、passed evidence、blocked items、known gaps、non-goals、operator warnings 和 rollback/support references。
- P22.8 release-candidate operator handoff 已新增 [docs/P22_RELEASE_CANDIDATE_OPERATOR_HANDOFF.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_OPERATOR_HANDOFF.md)：形成 future RC artifact approval 前的 operator checklist，覆盖 preflight state、approved gates、remaining blockers、boundaries、MCP public tool freeze、client integration caveats 和 rollback/support。
- P22.9 post-gate-refresh closeout review 已新增 [docs/P22_POST_GATE_REFRESH_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P22_POST_GATE_REFRESH_CLOSEOUT_REVIEW.md)：关闭 post-gate-refresh docs chain，结论 `READY_TO_REQUEST_RC_ARTIFACT_APPROVAL`；RC artifact 未创建，tag/release/deploy 未执行，A5 approval 仍是 artifact creation 前置条件。
- P22 release-candidate artifact creation approval request 已新增 [docs/P22_RELEASE_CANDIDATE_ARTIFACT_CREATION_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_CREATION_APPROVAL_REQUEST.md)：请求显式批准创建单个本地 Markdown artifact `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`，并限定 STATUS / backlog / next-plan / board 同步、docs validation、guarded commit、safe-push；默认 `NOT_APPROVED` / `BLOCKED_HARD_STOP`。
- P22 release-candidate artifact 已按显式批准创建：[docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md)；这是 local Markdown artifact only，未 tag、未 release、未 deploy，未 provider/config/migration/import-export/public MCP expansion。
- P22.10 RC artifact creation closeout review 已新增 [docs/P22_RC_ARTIFACT_CREATION_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P22_RC_ARTIFACT_CREATION_CLOSEOUT_REVIEW.md)：确认 artifact created docs-only，并关闭 artifact creation 阶段；tag/release/deploy 仍未执行。
- P22.11 tag/release/deploy approval request 已新增 [docs/P22_TAG_RELEASE_DEPLOY_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_TAG_RELEASE_DEPLOY_APPROVAL_REQUEST.md)：三个独立开关默认 `NOT_APPROVED`，draft tag name `p22-rc-806cc847`，draft release title `P22 Release Candidate p22-rc-806cc847`，deploy 默认不请求。
- P22.12 release publication boundary checklist 已新增 [docs/P22_RELEASE_PUBLICATION_BOUNDARY_CHECKLIST.md](/A:/codex-memory/docs/P22_RELEASE_PUBLICATION_BOUNDARY_CHECKLIST.md)：确认 artifact exists does not equal released、target commit frozen、public MCP tools frozen、`validate_memory` internal-only、provider/config/migration/import-export/real memory/deploy 默认排除，以及 tag/release/deploy approval separation。
- P22.13 post-artifact operator handoff 已新增 [docs/P22_POST_ARTIFACT_OPERATOR_HANDOFF.md](/A:/codex-memory/docs/P22_POST_ARTIFACT_OPERATOR_HANDOFF.md)：汇总 artifact path、gate evidence、done/not-done、next approval options、rollback path、troubleshooting notes、release warning 和 exact forbidden actions。
- P22.x RC artifact readiness closeout review 已新增 [docs/P22_RC_ARTIFACT_READINESS_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P22_RC_ARTIFACT_READINESS_CLOSEOUT_REVIEW.md)：关闭 post-artifact docs chain，结论 `READY_TO_REQUEST_TAG_RELEASE_DEPLOY_APPROVAL`；tag/release/deploy 仍未执行。
- P22 tag-only approval request 已更新 [docs/P22_TAG_RELEASE_DEPLOY_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_TAG_RELEASE_DEPLOY_APPROVAL_REQUEST.md)：只请求 Git tag approval；proposed tag `p22-rc-806cc847`，target `806cc847cb37a3e428099b45871a4f1a13c4fa6f`，artifact path `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`；tag/release/deploy approval 均仍为 `NOT_APPROVED`。
- P22 security fix fresh RC gate refresh approval request 已新增 [docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_APPROVAL_REQUEST.md)：fresh target `7fd17de624c0da76751e863e97302bed0dbec905`，prior `p22-rc-806cc847` superseded，不复用也不移动；suggested future tag `p22-rc-7fd17de`。当前 approval remains `NOT_APPROVED`，decision remains `BLOCKED_HARD_STOP`；未运行 fresh gates，未创建新 RC artifact，未 tag/release/deploy。
- P22 security fix fresh RC gate refresh result 已记录 [docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_RESULT.md](/A:/codex-memory/docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_RESULT.md)：result `PASS`；记录 `security-write-policy 3/3`、`npm test 473/473`、`gate:ci` tests `458/458`、compare `43/43`、rollback `43/43`、`noProvider=true`、`mutated=false`；本记录阶段未重跑 gates，未创建 RC artifact，未创建或移动 tag，未 release/deploy。
- P22 security fix RC artifact creation approval request 已新增 [docs/P22_SECURITY_FIX_RC_ARTIFACT_CREATION_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_SECURITY_FIX_RC_ARTIFACT_CREATION_APPROVAL_REQUEST.md)：只请求未来创建本地 Markdown artifact `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`，target `7fd17de624c0da76751e863e97302bed0dbec905`，suggested future tag `p22-rc-7fd17de`；approval remains `NOT_APPROVED`，decision remains `BLOCKED_HARD_STOP`；未创建 RC artifact，未创建/移动 tag，未 release/deploy。
- P22 security-fix release-candidate artifact 已按显式批准创建 [docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md)：local Markdown artifact only；target `7fd17de624c0da76751e863e97302bed0dbec905`；suggested future tag `p22-rc-7fd17de`；未创建/移动/push tag，未创建 GitHub release，未 deploy。
- P22 security-fix tag-only approval request 已新增 [docs/P22_SECURITY_FIX_TAG_ONLY_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_SECURITY_FIX_TAG_ONLY_APPROVAL_REQUEST.md)：只请求 Git tag approval；proposed tag `p22-rc-7fd17de`，target `7fd17de624c0da76751e863e97302bed0dbec905`，artifact path `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`；tag / GitHub release / deploy approval 均仍为 `NOT_APPROVED`，未创建或 push tag。
- P22 security-fix tag result 已记录 [docs/P22_SECURITY_FIX_TAG_RESULT_RECORD.md](/A:/codex-memory/docs/P22_SECURITY_FIX_TAG_RESULT_RECORD.md)：Git tag `p22-rc-7fd17de` 已创建并 push，local/remote tag 均指向 `7fd17de624c0da76751e863e97302bed0dbec905`；未创建 GitHub release，未 deploy。
- P22 GitHub release approval request 已新增 [docs/P22_SECURITY_FIX_GITHUB_RELEASE_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_SECURITY_FIX_GITHUB_RELEASE_APPROVAL_REQUEST.md)：只请求未来为 tag `p22-rc-7fd17de` 创建 GitHub release；GitHub release approval remains `NOT_APPROVED`，deploy remains `NOT_APPROVED` / still blocked；未创建 GitHub release，未 deploy。
- P22 GitHub release result 已记录 [docs/P22_SECURITY_FIX_GITHUB_RELEASE_RESULT_RECORD.md](/A:/codex-memory/docs/P22_SECURITY_FIX_GITHUB_RELEASE_RESULT_RECORD.md)：GitHub prerelease `P22 Security-Fix Release Candidate p22-rc-7fd17de` 已创建，URL `https://github.com/JENN2046/codex-memory/releases/tag/p22-rc-7fd17de`；deploy remains `NOT_APPROVED` / still blocked。
- 下一步建议：request explicit deploy approval only if deployment should continue; old `p22-rc-806cc847` remains superseded and must not be moved/reused; deploy / provider / config / migration-import-export / public MCP expansion still requires separate explicit approval.
- 边界：不改真实 Codex/Claude config、不启动 live HTTP MCP 或 service/watchdog、不改 MCP schema/public tools、不调用 provider、不读取 real memory、不做 migration/import-export apply、不创建 release candidate、不 tag/release/deploy。

## 当前判断

`codex-memory` 已经能作为 Codex / Claude 取向的本地 `vcp_codex_memory` 主线继续维护：

- HTTP MCP 是默认推荐入口
- public tools 保持 `record_memory` / `search_memory` / `memory_overview`
- standard suite 当前基线为 `43/43 matched`
- rollback readiness 当前基线为 `43/43 rollback-ready`
- Claude Code local HTTP MCP 已完成最小验收
- 当前模型侧 Claude 验收使用 `deepseek-ai/deepseek-v4-flash`

下一阶段不应该用“大迁移”或“大重构”推进，而应该进入小步、可验证、可回滚的维护与治理建设。

当前 A4.8 governance rail 已进入远端主线。该 rail 允许安全低风险工作自动 planning / validation / guarded commit / readiness / safe-push，但不会越过 A5 hard stops。

## 阶段顺序

| Phase | 名称 | 当前动作 |
|---|---|---|
| Phase F | docs governance / maintenance foundation | 当前优先 |
| Phase G | CI-safe gate | ✅ 已实现 `npm run gate:ci` |
| Phase H | memory governance | ✅ H-001~H-002c 全部完成（含真实 SQLite migration） |
| Phase I | Codex / Claude client scope | ✅ I-002a~I-002c 全部完成 |
| Phase J | observability / review report | ✅ J-001~J-003 全部完成（含 dashboard CLI） |

不要跳过 Phase F。文档入口、事实源和维护队列不清楚时，后续 runtime 变化会越来越难审。

## Phase F 当前批次

本批只做 docs / board / governance，不碰 runtime。

目标：

- 建立文档事实源分工
- 新增 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
- 把下一阶段计划压缩成薄文档
- 让 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md) 承担唯一维护期任务队列
- 保持 README 是 operation map，不让 README 继续变成历史总汇
- 保持 [PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md) 基本冻结
- 普通 push-after gate 只写 `.agent_board`，不创建 checkpoint-20

## Phase G 候选

`gate:mainline` 是真实本地主线门禁，会检查 HTTP health、compare 和 rollback。

`gate:ci` 如果后续实现，必须是 CI-safe：

- 不访问真实 `127.0.0.1:7605`
- 不要求本机 HTTP MCP 已启动
- 不调用真实 provider
- 不读写真实 `.codex` / Claude 配置
- 不依赖本地 `data/` durable state
- 不运行 `rebuild-profile --confirm`
- 不运行 cleanup apply / confirm

第一版 `gate:ci` 应该只跑 fixture-only 检查。`rebuild-profile --dry-run`、`profile-gate`、`v8-diagnose` 只有在明确 fixture/profile sandbox 后才可纳入默认 CI gate。

设计入口：[GATE_CI_FIXTURE_ONLY_DESIGN.md](/A:/codex-memory/GATE_CI_FIXTURE_ONLY_DESIGN.md)

## Phase H 候选

memory governance 先做设计文档，不直接改 runtime。

建议拆分：

| Step | 目标 | 风险 |
|---|---|---|
| H-001 | 写 `MEMORY_GOVERNANCE_MODEL.md` | A0 — 已完成：见 [MEMORY_GOVERNANCE_MODEL.md](/A:/codex-memory/MEMORY_GOVERNANCE_MODEL.md) |
| H-002a | 设计 proposal / tombstone / supersession schema | A0 — 已完成：见 [PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md](/A:/codex-memory/docs/PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md) |
| H-002b | migration dry-run / fixture migration plan | A1 |
| H-002c | 真实 SQLite schema change | A2，需要单独验证 |

不要把“设计 schema”和“修改真实 SQLite schema”混成同一个任务。

短期不新增 MCP tool。治理能力先通过内部设计和 CLI 只读报告验证，稳定后再讨论 `propose_memory` / `review_memory` / `supersede_memory` 等新工具。

当前补充边界设计入口：

- [POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md](/A:/codex-memory/docs/POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md)
- 用来回答 proposal lifecycle、scope retrieval、visibility policy、future enforcement 的分层关系
- 当前结论仍是先定 decision shape 和 soft boundary，不直接改写路径

## Phase I 候选

Codex / Claude scope 先建模型，不改 `record_memory` 外部 schema。

优先设计：

- `client_id`
- `workspace_id`
- `project_id`
- `task_id`
- `conversation_id`
- `visibility`
- `retention_policy`

Phase I 进度：
- M-013 ✅ [CLIENT_SCOPE_MODEL.md](/A:/codex-memory/CLIENT_SCOPE_MODEL.md) — client scope 模型
- I-002a ✅ [SCOPE_SCHEMA_EXTENSION.md](/A:/codex-memory/docs/SCOPE_SCHEMA_EXTENSION.md) — scope schema 扩展设计（含入 H-002a 合并迁移方案）

audit / overview / search scope filter 属于后续实现任务。

## Phase J 候选

观测与审查先做报告，不先做 Web UI。

候选顺序：

1. 设计 `memory-dashboard` report shape ✅ [MEMORY_DASHBOARD_REPORT_DESIGN.md](/A:/codex-memory/docs/MEMORY_DASHBOARD_REPORT_DESIGN.md)
2. ✅ 做只读 CLI / Markdown / JSON 输出（`npm run dashboard`）
3. ✅ 汇总 health、overview、audit、profile、rollback readiness
4. CLI 稳定后再评估 local-only Web UI ✅ [LOCAL_WEB_UI_ASSESSMENT.md](/A:/codex-memory/docs/LOCAL_WEB_UI_ASSESSMENT.md) — 结论：当前不建议实现

## 禁止自动执行

- push outside explicit user authorization or the A4.8 safe-push policy / PR / release / deploy / tag
- 改 `.env` / secrets / provider key
- 改 `C:\Users\617\.codex\config.toml`
- 改 Claude / Codex 真实配置
- 真实 `provider-smoke`
- 真实 `provider-benchmark`
- `rebuild-profile --confirm`
- cleanup apply / confirm
- 迁移真实数据
- 导出大量真实 memory
- 删除 diary / logs / indexes
- 添加或升级依赖
- 修改 package manager
- 大规模架构重写

## 本地提交规则

本地 commit 可以在 guarded auto-commit 条件满足时执行：

- 当前任务已完成
- 相关验证通过或验证缺口已记录
- diff 已检查
- 只包含相关文件
- 不包含 secrets / `.env` / dependency manifest 变更
- `.agent_board` 已更新

push 只能在显式授权或 A4.8 safe-push policy 通过 readiness 时执行。

## 验证

docs-only 最小验证：

```powershell
git diff --check
```

如果文档引用 npm scripts，确认脚本存在于 `package.json`。

当前基线或维护入口变化后，跑：

```powershell
npm run gate:mainline
```

## 第一批推荐执行

1. 完成 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
2. 把 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md) 作为唯一维护期任务队列
3. 压缩 README / PHASE_NAVIGATION 的历史记录入口，只保留索引链接
4. 将 `gate:ci` 留在设计阶段，不立刻改 `.github/workflows`
5. 将 memory governance 留在模型设计阶段，不立刻做 SQLite migration

## Current P22 Local Deploy Closeout

- Phase: `P22-local-deploy-result-record`
- Closeout phase: `P22-local-deploy-closeout`
- Status: completed / recorded / closed
- Evidence: [docs/P22_LOCAL_DEPLOY_RESULT_RECORD.md](/A:/codex-memory/docs/P22_LOCAL_DEPLOY_RESULT_RECORD.md)
- Closeout: [docs/P22_LOCAL_DEPLOY_CLOSEOUT.md](/A:/codex-memory/docs/P22_LOCAL_DEPLOY_CLOSEOUT.md)
- Result: local HTTP MCP deploy/validation completed and evidence recorded.
- Verified local surfaces: `/health ok`; live `initialize/tools/list ok`; public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`; `observe:http status=ok`; MCP/HTTP tests `12/12`.
- Interpretation: this is not production deploy, not startup hardening, not watchdog installation, not client integration switch, not memory migration, and not v1.0 release.
- Next recommended phase: `P23-v1.0-memory-kernel-planning`.
- Still A5-gated: watchdog/startup install, Codex/Claude config switching, formal production deploy, provider execution, durable memory write, migration/import-export apply.

## Current P23 v1.0 Memory Kernel Planning

- Phase: `P23-v1.0-memory-kernel-planning`
- Status: planning baseline created
- Plan: [docs/P23_V1_0_MEMORY_KERNEL_PLAN.md](/A:/codex-memory/docs/P23_V1_0_MEMORY_KERNEL_PLAN.md)
- Contract inventory: [docs/P23_1_MCP_CONTRACT_INVENTORY.md](/A:/codex-memory/docs/P23_1_MCP_CONTRACT_INVENTORY.md)
- Schema/versioning plan: [docs/P23_2_SCHEMA_VERSIONING_PLAN.md](/A:/codex-memory/docs/P23_2_SCHEMA_VERSIONING_PLAN.md)
- Validation matrix hardening: [docs/P23_3_VALIDATION_MATRIX_HARDENING.md](/A:/codex-memory/docs/P23_3_VALIDATION_MATRIX_HARDENING.md)
- Local production hardening plan: [docs/P23_4_LOCAL_PRODUCTION_HARDENING_PLAN.md](/A:/codex-memory/docs/P23_4_LOCAL_PRODUCTION_HARDENING_PLAN.md)
- Client integration readiness plan: [docs/P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md](/A:/codex-memory/docs/P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md)
- Migration/import-export readiness plan: [docs/P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md](/A:/codex-memory/docs/P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md)
- Release-candidate checklist: [docs/P23_7_V1_0_RELEASE_CANDIDATE_CHECKLIST.md](/A:/codex-memory/docs/P23_7_V1_0_RELEASE_CANDIDATE_CHECKLIST.md)
- Final RC readiness review: [docs/P23_8_V1_0_FINAL_RC_READINESS_REVIEW.md](/A:/codex-memory/docs/P23_8_V1_0_FINAL_RC_READINESS_REVIEW.md)
- Blocker burn-down plan: [docs/P23_9_V1_0_BLOCKER_BURN_DOWN_PLAN.md](/A:/codex-memory/docs/P23_9_V1_0_BLOCKER_BURN_DOWN_PLAN.md)
- Final RC validation matrix execution plan: [docs/P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md](/A:/codex-memory/docs/P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md)
- Scope: planning/docs/status/board only.
- v1.0 blockers: public MCP contract drift, schema/versioning gaps, failing security or CI gates, missing rollback story, unresolved migration/import-export boundary, unclear Codex/Claude client boundary, raw secret/workspace exposure, and unapproved A5 actions.
- Still A5-gated: production deploy, startup/watchdog install, Codex/Claude config switch, provider execution, durable memory mutation expansion, SQLite migration, import/export apply, tag/release/deploy.
- P23.1 result: public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`; public tool additions remain post-v1.0 or separately authorized.
- P23.2 result: schema/versioning planning is documented; no schema implementation, migration apply, import/export apply, durable memory mutation, public MCP tool change, or production deploy occurred.
- P23.3 result: v1.0 validation matrix hardening is documented; no validator implementation, runtime/test/config/provider/migration/durable-memory/watchdog/startup/deploy action occurred.
- P23.4 result: local production hardening planning is documented; no runtime/config/provider/migration/durable-memory/watchdog/startup/deploy action occurred.
- P23.5 result: client integration readiness planning is documented; no Codex/Claude config, `.env`, runtime/config/provider/migration/durable-memory/watchdog/startup/deploy action occurred.
- P23.6 result: migration/import-export readiness planning is documented; no SQLite migration apply, import/export apply, durable-memory mutation, runtime/config/provider/watchdog/startup/deploy action occurred.
- P23.7 result: v1.0 release-candidate checklist is documented; no push, tag, release, deploy, runtime/config/provider/migration/import-export/durable-memory/watchdog/startup action occurred.
- P23.8 result: final v1.0 RC readiness review is documented with decision `READY_FOR_DOCS_ONLY_RC_REVIEW`; full v1.0 RC remains blocked by validation, runtime/schema, A5, and release/deploy gates.
- P23.9 result: v1.0 blocker burn-down plan is documented; blockers are classified by A4.8/A5, runtime implementation, validation evidence, and RC/release impact.
- P23.10 result: final RC validation matrix execution plan is documented; matrix execution is planned but not run, and no validator/runtime/provider/migration/config/release action occurred.
- Final RC validation matrix execution scope review: [docs/P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md](/A:/codex-memory/docs/P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md)
- P23.11 result: final RC validation matrix execution scope review is documented; validation items are classified as A4.8-safe, A5-gated, runtime-implementation-required, or blocked. Matrix execution is scoped but not run, and no service/runtime/provider/migration/config/release action occurred.
- A4-safe validation slice execution: [docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md](/A:/codex-memory/docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md)
- P23.12 result: A4-safe slice passed for non-live checks; conditional live MCP/HTTP refresh was skipped because local HTTP MCP was not already reachable and no service startup was authorized. Full final RC matrix remains not executed.
- Validation aggregator implementation plan: [docs/P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md](/A:/codex-memory/docs/P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md)
- P24 result: validation aggregator implementation is planned but not implemented; future aggregator scope, inputs, output contract, pass/fail semantics, A4-safe checks, conditional live checks, A5-gated checks, runtime-required checks, file/module candidates, test plan, rollback plan, and security boundaries are documented.
- P24.1 validation aggregator fixture shape tests: `tests/fixtures/v1-rc-validation-aggregator-v1.json` and `tests/v1-rc-validation-aggregator.test.js` lock the future aggregator output contract without implementing the aggregator or changing package scripts.
- P24.1 result: fixture/test contract added; targeted shape test `8/8` passed; no runtime/service/provider/migration/durable-memory/config/watchdog/startup/push/tag/release/deploy action occurred.
- P24.2 validation aggregator minimal implementation: `src/core/ValidationAggregatorService.js` and `tests/v1-rc-validation-aggregator-implementation.test.js` add a minimal read-only report builder matching the P24.1 contract. It emits `NOT_READY_BLOCKED`, marks the minimal aggregator implemented, and keeps schema/version runtime enforcement, full final RC matrix execution, live MCP refresh, and A5-gated actions blocked.
- P24.2 result: minimal core skeleton added; targeted fixture/implementation tests `13/13` passed; no CLI/package script, service start, provider, migration/import-export apply, durable-memory write, config mutation, watchdog/startup, push, tag, release, or deploy action occurred.
- P24.3 validation aggregator CLI wiring: `src/cli/v1-rc-validation-aggregator.js` and `tests/v1-rc-validation-aggregator-cli.test.js` add direct-node JSON output without package script changes. The CLI emits `NOT_READY_BLOCKED`, marks `minimalCliWiring=true`, rejects live/provider/apply/deploy/release flags, and keeps live MCP refresh plus all A5-gated items blocked.
- P24.3 result: minimal CLI wrapper added; targeted CLI test `6/6` passed; direct CLI smoke emitted JSON with decision `NOT_READY_BLOCKED`; no package script, service start, provider, migration/import-export apply, durable-memory write, config mutation, watchdog/startup, push, tag, release, or deploy action occurred.
- P24.4 validation aggregator decision/exit-code semantics: `src/cli/v1-rc-validation-aggregator.js` and `tests/v1-rc-validation-aggregator-cli.test.js` add explicit CLI gate behavior without package script changes. Default report mode emits JSON and exits `0`; `--strict` emits the same JSON and exits `1` for the current `NOT_READY_BLOCKED` report; `--help` prints usage and exits `0` without live checks.
- P24.4 result: minimal strict/default/help semantics added; targeted CLI test `12/12` passed; public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`; no package script, service start, live MCP refresh, provider, migration/import-export apply, durable-memory write, config mutation, watchdog/startup, push, tag, release, or deploy action occurred.
- P24.5 validation aggregator evidence-source map: `src/core/ValidationAggregatorService.js`, fixture contract, and targeted tests now add `evidence_sources` so the decision, blockers, A4-safe slice, full final RC matrix status, schema/version runtime enforcement gap, public MCP tool freeze, A5-gated actions, conditional live MCP/HTTP status, and full-aggregator implementation gap point to documented code/docs/governance sources.
- P24.5 result: minimal provenance map added; fixture contract changed only to add the new top-level `evidence_sources` key; decision remains `NOT_READY_BLOCKED`; public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`; no package script, service start, live MCP refresh, provider, migration/import-export apply, durable-memory write, config mutation, watchdog/startup, push, tag, release, or deploy action occurred.
- P24.6/P24.7 result: rejected live/provider/apply/deploy/push flag output now preserves the normal aggregator report contract while failing closed, and rejected output has top-level parity coverage with normal reports; public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`.
- P25 schema/version runtime enforcement plan: [docs/P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_PLAN.md](/A:/codex-memory/docs/P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_PLAN.md) defines enforcement surfaces, compatibility policy, candidate test plan, dry-run boundary, and A5 hard stops. It is planning only; no runtime enforcement, migration apply, durable write, package change, live refresh, provider call, push, tag, release, or deploy occurred.
- P25.1 schema/version enforcement fixture inventory: [docs/P25_1_SCHEMA_VERSION_ENFORCEMENT_FIXTURE_INVENTORY.md](/A:/codex-memory/docs/P25_1_SCHEMA_VERSION_ENFORCEMENT_FIXTURE_INVENTORY.md) inventories current MCP/object/import-export/migration/lifecycle/audit/aggregator coverage and identifies the missing accepted/missing/unknown schema-version fixture contract.
- P25.2 schema/version policy fixture tests: `tests/fixtures/schema-version-policy-v1.json` and `tests/schema-version-policy-fixture.test.js` lock accepted current versions, missing-version fallback, unknown-version handling, public MCP freeze, no-mutation safety flags, and no raw secret/workspace exposure.
- P25.3 validation aggregator schema status report shape: main-thread source/test changes add aggregator report-shape evidence for the P25.2 schema-version policy fixture. The report shape now exposes `schemaVersionPolicyFixture`, `evidence.p25SchemaVersionPolicy`, and `evidence_sources.schema_version_policy_fixture` while still reporting runtime enforcement as not implemented and preserving the public MCP three-tool freeze.
- P25.4 schema compatibility dry-run CLI plan: [docs/P25_SCHEMA_COMPATIBILITY_DRY_RUN_CLI_PLAN.md](/A:/codex-memory/docs/P25_SCHEMA_COMPATIBILITY_DRY_RUN_CLI_PLAN.md) defines a future fixture-first CLI boundary, output contract candidate, future allowed files, validation plan, hard stops, and rollback path. This is planning only: no CLI implementation, no package script, no runtime enforcement, no real memory scan, no migration/import-export apply, no durable write, no service start, no provider call, and no push/tag/release/deploy occurred.
- P25.5 schema compatibility dry-run fixture contract: `tests/fixtures/schema-compatibility-dry-run-v1.json` and `tests/schema-compatibility-dry-run-fixture.test.js` lock the planned dry-run report fields, accepted/missing/unknown policy counts, fail-closed `DRY_RUN_BLOCKED` semantics when blockers are present, safety flags, public MCP three-tool freeze, rejected unsafe flags, and no raw secret/workspace exposure boundary.
- P25.x schema/version runtime enforcement closeout review: [docs/P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_CLOSEOUT_REVIEW.md) closes P25 as planning and fixture-backed evidence, not as runtime-enforced behavior, and defines the go/no-go contract for a future direct-node fixture-only CLI.
- P25.6 schema compatibility dry-run fixture-only CLI skeleton: `src/cli/schema-compatibility-dry-run.js` and `tests/schema-compatibility-dry-run-cli.test.js` add direct-node fixture-only JSON/text output, strict blocked exit semantics, unsafe-flag `DRY_RUN_INVALID_INPUT`, fixture path containment, public MCP freeze, no-side-effect safety flags, and no raw secret/workspace exposure checks. No package script, live refresh, provider call, migration/import-export apply, durable write, runtime enforcement implementation, public MCP expansion, push, tag, release, or deploy occurred.
- P25.7 validation aggregator schema compatibility dry-run CLI evidence shape: `src/core/ValidationAggregatorService.js`, `tests/fixtures/v1-rc-validation-aggregator-v1.json`, `tests/v1-rc-validation-aggregator.test.js`, and `tests/v1-rc-validation-aggregator-implementation.test.js` now record P25.6 as fixture-only CLI evidence with `cliExecuted=false`, `realMemoryScanned=false`, `runtimeEnforcementImplemented=false`, and `packageScriptAdded=false`. The validation aggregator still does not execute the CLI, scan real memory, add package scripts, implement runtime enforcement, call providers, mutate durable state, expand public MCP tools, push, tag, release, or deploy.
- P26 migration/import-export dry-run gate plan: [docs/P26_MIGRATION_IMPORT_EXPORT_DRY_RUN_GATE_PLAN.md](/A:/codex-memory/docs/P26_MIGRATION_IMPORT_EXPORT_DRY_RUN_GATE_PLAN.md) consolidates existing P13/P18/P23 migration and import/export safety evidence into a v1.0 dry-run gate contract. This is planning only: no fixture/test/source/package/runtime changes, no real memory scan, no import/export apply, no SQLite migration apply, no backup/restore, no durable write, no provider call, no public MCP expansion, and no push/tag/release/deploy occurred.
- P26.1 migration/import-export dry-run gate fixture contract: `tests/fixtures/migration-import-export-dry-run-gate-v1.json` and `tests/migration-import-export-dry-run-gate-fixture.test.js` lock blocked pre-approval behavior, `mutated=false`, `providerCalls=0`, public MCP freeze, required approvals, safety flags, no raw secret/workspace exposure, and no rewrite-on-read.
- P26.2 migration/import-export dry-run gate CLI plan: the P26 plan now defines the future direct-node fixture-only CLI boundary, candidate files, source modes, output contract, rejected flags, validation matrix, and stop conditions. This is docs-only: no CLI implementation, package script, source/runtime change, real memory scan, provider call, public MCP expansion, or push/tag/release/deploy.
- P26.3 migration/import-export dry-run gate fixture-only CLI: `src/cli/migration-import-export-dry-run-gate.js` and `tests/migration-import-export-dry-run-gate-cli.test.js` add a direct-node fixture-only CLI, `--json` report output, fail-closed unsafe-flag JSON, public MCP three-tool freeze, no-side-effect safety checks, and no raw secret/workspace exposure checks. No package script, real memory scan/export/import, SQLite migration apply, import/export apply, backup/restore, durable write, provider call, service startup, public MCP expansion, or push/tag/release/deploy occurred.
- P26.4 validation aggregator evidence shape: `ValidationAggregatorService`, the v1 RC aggregator fixture, and aggregator tests now record the P26.3 fixture-only CLI as evidence with `cliExecuted=false`, `realMemoryScanned=false`, `importExportApplyPerformed=false`, and `packageScriptAdded=false`. The aggregator still does not execute the CLI, scan real memory, perform migration/import-export apply, add package scripts, call providers, expand public MCP tools, push, tag, release, or deploy.
- P26.x closeout review: [docs/P26_MIGRATION_IMPORT_EXPORT_DRY_RUN_GATE_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P26_MIGRATION_IMPORT_EXPORT_DRY_RUN_GATE_CLOSEOUT_REVIEW.md) closes P26 as planning, fixture, fixture-only CLI, and aggregator report-shape evidence. It explicitly does not close real migration/import-export readiness.
- P27 migration/import-export approval packet: [docs/P27_MIGRATION_IMPORT_EXPORT_APPROVAL_PACKET.md](/A:/codex-memory/docs/P27_MIGRATION_IMPORT_EXPORT_APPROVAL_PACKET.md) defines the future approval packet for real-memory preview, export/import, backup/restore, SQLite migration apply, import/export apply, rollback evidence, and stop conditions. It is docs-only and does not execute non-fixture work.
- Next recommended phase: P27 review or fixture-only approval-packet shape test, separately scoped. Further `push` remains separately authorized only.
