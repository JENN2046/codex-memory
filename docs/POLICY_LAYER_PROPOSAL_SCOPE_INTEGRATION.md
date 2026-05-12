# Policy Layer Proposal / Scope Integration

更新时间：2026-05-12

## 目的

`codex-memory` 现在已经有了三块基础：

- proposal / tombstone / supersession 的 schema 与 governance model
- `project_id / workspace_id / client_id / visibility` 的 scope 检索与审计观测
- `governance:report`、`dashboard`、`http-observe` 的只读治理 summary

下一步真正需要回答的，不是“还能不能多显示一点”，而是：

- proposal 什么时候只是 metadata，什么时候进入 policy
- scope 什么时候只是检索收窄，什么时候变成 visibility / status 的 enforcement
- 哪些规则先做只读解释，哪些规则未来才允许阻断写入或过滤读取

本文档定义这条线的最小设计和风险边界。当前交付仍是 docs-only，不改 runtime。

## 当前现实

### 已经成立的事实

- durable memory 仍通过现有 `record_memory` 写入
- 当前 writer 仍只有 Codex；Claude 仍是共享 reader
- `search_memory` 已支持 `project_id / workspace_id / client_id / visibility` scope
- recall audit / `memory_overview` / `dashboard` / `http-observe` 已能表达 scoped recall activity
- governance summary 已能表达 proposal / tombstone / supersession / stale signals

### 还没有做的事

- proposal admission policy
- proposal approval workflow
- status-based read policy
- visibility enforcement policy
- cross-client private-memory isolation
- new MCP governance tools

也就是说，当前系统已经能“看见治理和 scope 信号”，但还没有把这些信号升级成统一的 policy layer。

## 关键问题

### 1. proposal 是 lifecycle，还是 admission gate

现在的 `proposal` 更像 lifecycle state，而不是一个真正独立的写入入口。

如果未来把 proposal 直接变成 admission gate，就要回答：

- 哪些 memory 应自动降级为 `proposal`
- proposal 是否默认可检索
- Claude 是否能创建 proposal
- proposal 何时批准为 `active`

结论：

- 短期内，`proposal` 应继续被视为 lifecycle metadata
- 不要在没有 review workflow 的前提下，把 proposal 变成默认写入主路径

### 2. scope 是 retrieval hint，还是 access policy

当前 scope 已经进入检索候选层与观测层，但这还不是完整 access policy。

真正的 access policy 需要回答：

- `visibility=private` 是否对其他 client 硬过滤
- proposal 是否默认只对 Commander / Writer 可见
- `workspace_id` 是否能参与 enforcement 而不落 raw path
- default search 是否显式带 status / visibility policy

结论：

- 短期内，scope 仍以 retrieval + observability 为主
- visibility / client isolation 暂不自动升级为硬 enforcement

### 3. governance signal 应该在哪里收口

当前治理信号已经分散在：

- `memory_records.status` / scope fields
- recall audit
- `governance:report`
- `dashboard`
- `http-observe`

如果未来要做 policy layer，不能让每个 surface 自己解释规则。

结论：

- 未来需要一个统一的 policy decision model
- 但第一步应该先定义 decision shape，不要直接改写路径

## 最小设计

推荐把 proposal/scope policy 明确拆成四层，而不是一步到位做“总开关”。

### L0. Observability

目标：知道发生了什么。

当前已具备：

- governance lifecycle counts
- scoped recall counts / breakdowns
- low-risk governance hints

特点：

- 只读
- 不阻断
- 不改 contract

### L1. Classification

目标：对 record 做 policy classification，但不改变写入或检索结果。

建议未来统一收敛成内部 decision shape：

```json
{
  "statusClass": "active | proposal | stale | superseded | tombstoned | rejected",
  "scopeClass": "private | workspace | project | shared",
  "writerClass": "codex | claude | manual | unknown",
  "reviewLevel": "nominal | observe | needs-review | blocked",
  "policyReasons": ["proposal-pending-review", "stale-active", "cross-client-private"]
}
```

边界：

- 先做内部 helper / docs，不暴露为新 MCP contract
- 不在这一层阻断写入

### L2. Soft Policy

目标：默认行为更保守，但保留显式 override。

只推荐两类未来候选：

1. default read policy  
   例如默认不返回 `rejected / tombstoned`，而 `proposal` 仅在显式 include 时返回

2. review-only write downgrade  
   例如低置信度、低 provenance、跨 client 不确定写入时，先标为 `proposal`

边界：

- 必须是 soft policy，不是 silent hard block
- 必须有 clear explanation / audit signal
- 必须有 targeted tests 和 fallback path

### L3. Hard Enforcement

目标：真正的 access control / approval gate。

例子：

- Claude 不能直接 durable-write
- `visibility=private` 对其他 client 硬隔离
- proposal 未批准前不可进入默认 recall

边界：

- 这已经不是“小 patch”
- 需要单独设计、单独测试、单独验收
- 当前不进入实现

## Proposal / Scope 的推荐关系

建议未来按下面这张表理解，而不是把 proposal 和 scope 混成一个字段。

| 维度 | 作用 | 当前状态 | 未来可能动作 |
|---|---|---|---|
| `status` | lifecycle | 已存在 | soft read policy / review gate |
| `visibility` | 可见范围 | 已存在 | client-aware enforcement |
| `client_id` | 写入/归属 client | 已存在 | private-memory isolation |
| `workspace_id` | 物理工作区 | 已存在 | presence/hash-based policy only |
| `project_id` | 默认检索边界 | 已存在 | default search policy |
| `confidence` | 置信度 | 已存在 | proposal downgrade heuristic |
| `provenance` | 来源解释 | 已存在 | review prioritization |

核心原则：

- `status` 决定 lifecycle
- `visibility` 决定理论可见范围
- `scope fields` 决定组织边界
- `confidence/provenance` 决定 review 优先级

不要让单个字段承担全部 policy 语义。

## 明确的风险边界

### 1. 不把 raw `workspace_id` 带入新的 audit / dashboard 粒度

`workspace_id` 仍然保持低风险表达：

- presence flag
- future hash / alias

不做：

- raw path logging
- workspace-level breakdown export

### 2. 不在没有 approval workflow 的情况下自动 proposal 化所有不确定写入

否则会出现：

- proposal 堆积
- recall 语义混乱
- 用户看不出哪些是 durable facts、哪些只是候选

### 3. 不在没有 contract 设计的情况下让 `search_memory` 偷偷附带新默认过滤

status / visibility 默认过滤一旦改变，就是行为变化，不该伪装成内部重构。

### 4. 不把 observability surface 当成 control plane

`dashboard` / `http-observe` / `governance:report` 目前只负责解释，不负责修改状态。

## 推荐下一步

这条线下一步仍不建议直接改 runtime 主路径。

最小可行的后续候选，按顺序建议是：

### PL-1. Policy decision design note

把 L1 classification 的 decision shape 固定下来，明确：

- 哪些输入字段参与 decision
- 哪些 reasons 会进入 reviewLevel
- 哪些 reasons 只允许只读展示

类型：docs-only

### PL-2. Soft read policy preflight

在不改默认 `search_memory` 行为的前提下，先做 fixture-based preflight，回答：

- 如果默认排除 `proposal / rejected / tombstoned`，现有 suite 会不会变化
- 如果引入 visibility-aware filtering，哪些回归会受影响

类型：test/design-first

当前入口：

- [SOFT_READ_POLICY_PREFLIGHT.md](/A:/codex-memory/docs/SOFT_READ_POLICY_PREFLIGHT.md)

### PL-3. Runtime candidate（需要单独批准）

只在前两步清楚后，才考虑：

- `proposal` 的默认 read policy
- `visibility=private` 的 client-aware read enforcement

## 当前不做

- 新 MCP governance tools
- Claude durable write
- automatic proposal approval
- raw `workspace_id` policy logging
- dashboard / observe 的写操作
- silent status/visibility hard filtering

## 一句话

proposal 和 scope 现在已经“看得见”；下一步不是立刻把它们变成硬规则，而是先把 policy decision shape 和软边界定义清楚。
