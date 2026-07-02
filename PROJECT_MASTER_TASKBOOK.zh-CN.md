# PROJECT_MASTER_TASKBOOK.zh-CN.md

```yaml id="project-master-taskbook-zh-cn-summary"
document_type: project_master_taskbook_chinese_companion
schema_version: project_master_taskbook_chinese_companion.v1
status: companion_initial_draft
project: codex-memory
managed_project_name: codex-memory
created_at: 2026-07-02
authority_status: chinese_companion_reference_only
source_document: PROJECT_MASTER_TASKBOOK.md
source_sha256_at_creation: b359f2af96f8d4771f5754e7ce1b7056cb4cba6076794e91163b2b192cc96d7f
translation_mode: full_semantic_chinese_mirror
```

## 1. 目的

这份文件是 `PROJECT_MASTER_TASKBOOK.md` 的中文 companion。

`Project Master Taskbook` 的中文意思是：项目总任务书。它是
ColaMeta-managed `codex-memory` 项目的顶层规划锚点，用来固定长期目标、权限边界、
工作线、证据链、执行策略和第一条安全路线。

它不是当前状态源，不替代 `README.md`、`CURRENT_STATE.md`、`STATUS.md`、
`.agent_board/CURRENT_FACTS.json` 或源码/测试。当前 `HEAD`、`origin/main`、
ahead/behind、dirty worktree 等 live Git facts 仍必须由 fresh Git commands 获取。

## 2. 权威边界

Jenn 仍然是本地 agent 环境和本仓库的 root owner / final Commander authority。

在 Jenn 当前指令下，Nobao/Codex 可以临时占用本任务的 working Commander seat：准备
Master Taskbook、选择下一条安全本地路线、创建有边界的 ColaMeta plan version、运行安全
本地验证并报告证据。

这份文档不授权：

- live VCPToolBox runtime inspection；
- live VCPToolBox call；
- 读取 `.env`、`.env.*`、`config.env`、credentials、tokens、cookies、provider auth、
  proxy config 或 private runtime state；
- 读取 raw DailyNote、RAG、vector、prompt、sqlite、jsonl、audit、cache 或 private memory；
- broad memory scan、export、import、migration、sync 或 backfill；
- durable memory write、VCP write 或 `record_memory` call；
- provider/API call；
- public MCP tool/schema expansion；
- startup、watchdog、service install、service restart 或 config mutation；
- push、PR、merge、force push、tag、release、deploy、cutover 或 readiness claim。

任何 Red Lane 动作仍然需要单独、精确、当前有效的显式授权。

## 3. 北极星目标

`codex-memory` 的最终方向，是成为 Codex / Claude sustained workflows 使用
VCPToolBox native memory system 的治理桥，而不是把最终目标降级为 summary-only。

目标架构：

```text
Codex / Claude sustained conversation
  -> codex-memory governance bridge
    -> VCPToolBox memory runtime
      -> DailyNote / DailyNoteManager / KnowledgeBaseManager
      -> TagMemo / LightMemo / TDBKnowledge
      -> DeepMemo / TopicMemo / MeshMemo / RAGDiaryPlugin
```

VCPToolBox 保持 VCP memory behavior 的 native owner。`codex-memory` 负责 target/profile
治理、approval gates、low-disclosure projections、audit receipts、rollback posture、
client scope governance，以及 Codex/Claude workflow integration。

## 4. 当前项目现实

创建这份 Master Taskbook 时，项目现实如下：

- `codex-memory` 是独立的 `vcp_codex_memory` 实现。
- 必须保护的 public MCP tools 是 `record_memory`、`search_memory`、`memory_overview`；
  controlled mutation dry-run tools 只在 exact approval 边界下存在。
- 当前实现已经具备 HTTP / stdio MCP 入口、diary-compatible write、SQLite shadow store、
  vector index、recall/write audit、candidate cache、active-memory compatibility、
  DeepMemo/TopicMemo compatibility、compare/rollback harnesses、provider/profile tooling、
  mainline gates 和 safety hardening。
- Phase D/E default-mainline 已收口；后续是 parity hardening、memory governance、
  Codex/Claude scoping、observability 和 VCPToolBox bridge work。
- 当前 VCPToolBox 线仍是 fixture/source/docs governed；尚未执行 live target inspection、
  live VCPToolBox call、raw memory read 或 durable VCP write。
- `docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md` 是当前 VCPToolBox memory capability
  line 的愿景计划。

## 5. Master Workstreams

### Workstream A - VCPToolBox Target And Profile Governance

目标：表示真实 VCPToolBox target、transport、profile、budget 和 operator packet，同时不泄露
locator、endpoint、config、auth、token、secret 或 raw memory values。

当前证据链包括 CM-1689 到 CM-1700。

下一条安全本地路线：继续做未来 CM-1701 target-specific runtime inspection execution path 的
boundary review，除非 Jenn 改向。

### Workstream B - Exact-Approved Runtime Proofs

目标：在 packet / approval contracts 完成后，只执行 exact-approved、bounded、no-memory 或明确
scope 的 runtime proof。

默认状态：这份 Master Taskbook 不授权执行。

### Workstream C - Read-Only VCP Recall Profiles

目标：在 target、auth、scope、output shape、budget 和 receipt evidence 都有边界后，从
`observe-lite` 逐步进入 `observe-full`，再进入 `trusted-full-read`。

默认状态：不做 broad scan，不持久化 raw output，不声称 readiness。

### Workstream D - Sustained Codex/Claude Workflow Integration

目标：在真实 Codex / Claude workflows 的有界时点使用 VCPToolBox recall：startup、resume、
task selection、validation failure、handoff、checkpoint、commit/push decision、用户请求历史上下文时。

默认状态：只允许 profile-gated 和 receipt-gated。

### Workstream E - Write Proposal Before Durable Write

目标：在任何 durable VCP write integration 前先加入 `trusted-write-proposal`。durable write 需要
exact approval、rollback/cleanup/tombstone posture 和 low-disclosure receipts。

默认状态：单独授权前只做 proposal-only。

### Workstream F - Mainline Protection And Runtime Hardening

目标：在推进 VCPToolBox bridge work 时，保护现有 `vcp_codex_memory` 行为、mainline gates、
rollback readiness、HTTP stability、provider fail-closed behavior 和 public MCP surface boundaries。

## 6. ColaMeta 执行策略

本项目已在 ColaMeta 中注册为 `project_name=codex-memory`，模式是 `managed`。

ColaMeta 应作为有治理的 planning / evidence layer 使用，不能作为绕过仓库规则的通道。

新 implementation version 的默认路线：

1. 通过 `analyze_project_state` 和 fresh Git commands 读取当前事实。
2. 通过 `manage_prompt_file preview -> apply` 保存 bounded version prompt。
3. 通过 `manage_plan_version insert_from_prompt_file_preview` 或 `insert_preview` 插入 plan version。
4. 保持 `allowed_files`、`forbidden_files`、`out_of_scope`、`acceptance_commands` 具体明确。
5. 适用时用 `manage_validation_run inspect -> preview -> run -> status` 做受控验证。
6. executor reports、receipts 和 previews 都是 evidence，不是 acceptance。
7. commit 只能按仓库 guarded local commit rules 进行。
8. push 只能在 exact push authorization 或完整通过 local safe-push policy 后进行。

任何 ColaMeta preview、receipt、runtime status、readiness packet 或 workflow run，本身都不是
ReviewDecision、GateEvent、Delivery State acceptance、runtime execution approval、stable replacement
approval、commit approval 或 push approval。

## 7. 第一条路线

Master Taskbook adoption route：

```yaml id="first-route-zh-cn"
route_id: CM-MASTER-0001
route_name: codex-memory Master Taskbook Anchor
lane: Green
type: docs-only planning anchor
allowed_files:
  - PROJECT_MASTER_TASKBOOK.md
  - PROJECT_MASTER_TASKBOOK.zh-CN.md
forbidden_actions:
  - live VCPToolBox call
  - target-specific runtime inspection
  - raw memory read
  - durable memory write
  - provider/API call
  - public MCP expansion
  - config/env/secret read or edit
  - executor run
  - push
validation:
  - inspect diff
  - git diff --check
  - docs validation when available
```

这份 Master Taskbook 被接受后，下一条 ColaMeta plan version 应该是一个小切片，例如：

```text
CM-1701 VCPToolBox target-specific runtime inspection execution boundary review
```

下一路线默认仍应保持 source/docs/fixture review。除非 Jenn 提供单独 exact approval line，并绑定
target、commit、scope、budget、expiry 和 output policy，否则不得执行 target-specific runtime
inspection。

## 8. 审查和接受口径

这份 Master Taskbook 可以进入本地接受的条件：

- 与 README / CURRENT_STATE / STATUS / VCPToolBox vision facts 不冲突；
- 不声称 runtime readiness、production readiness、release readiness、cutover readiness 或 complete V8；
- 不授权 Red Lane 动作；
- 把 ColaMeta 定位为 governed planning / evidence system；
- 提供窄 first route 和 validation boundary；
- diff inspection 和 docs validation 没有发现矛盾或格式错误。

接受这份文档仍不授权 live runtime work、memory writes、public MCP expansion 或 remote Git operations。
