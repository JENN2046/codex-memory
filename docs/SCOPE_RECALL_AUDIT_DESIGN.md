# Scope Recall Audit Design

更新时间：2026-05-12

## 目的

`search_memory` 的 scope 已经完成两层执行：

- chunk SQL candidate pushdown
- adapter-level post-filter fallback

现在缺的不是“能不能按 scope 查”，而是“系统能不能把这次 scope 检索解释清楚”。

本文档定义 P9 下半段的最小设计：scope 是否继续下推到 recall / audit 语义层，先补观测与边界，再决定 runtime patch 的精确落点。

## 当前现实

### 已完成

- `search_memory.scope` 支持 `project_id` / `workspace_id` / `client_id` / `visibility`
- chunk SQL 候选层已按 scope 收窄
- 结果返回前保留 post-filter fallback
- 已有回归证明：`limit=1` 且高分 off-scope 结果挤满候选池时，仍能返回 in-scope 结果
- R1 已完成：recall audit 现在会记录低风险 scope annotation，但不写 raw `workspace_id`

### 当前缺口

recall audit 目前记录的是：

- 候选数
- rerank 模式
- query axes
- top result / memory ids

但不会记录：

- 本次检索是否显式带了 `scope`
- scope 是在哪一层生效的（SQL candidate / post-filter / future policy layer）
- scope 包含哪些维度
- strict mode 是否开启
- 这次检索的观测语义是“pipeline telemetry”还是“最终返回结果”

因此当前系统虽然能执行 scope 检索，但 `memory_overview` / dashboard / `http-observe` 还不能很好回答：

- “这次为什么只返回这些结果？”
- “这是没有命中，还是被 scope 收窄掉了？”
- “scope 检索最近是否活跃？”

## 关键设计问题

### 1. audit 的语义源头

当前 recall audit 写入发生在 `KnowledgeBaseRecallPipeline.search()` 内部。

这意味着 audit 天然更接近：

```text
pipeline telemetry
```

而不是：

```text
adapter-visible final response
```

这两者在当前实现里通常接近，但不是同一个语义：

- pipeline telemetry 关注候选、rerank、召回链是否正常
- final response 关注用户最终拿到了什么

一旦未来出现更复杂的 scope policy（例如 visibility policy、proposal gate、layered scope），这两层可能再次分叉。

结论：

- 不应在没有明确语义选择前，直接把“最终 scope 结果”假装写进当前 recall audit
- 当前 recall audit 更适合作为 retrieval telemetry

### 2. scope 字段的敏感度

并不是所有 scope 维度都适合原样写入 recall log。

风险最高的是：

- `workspace_id`：可能是绝对路径或本机目录结构

风险较低的是：

- `project_id`
- `client_id`
- `visibility`
- `strict`
- “本次是否启用了 scope”

结论：

- recall audit 不应默认写入原始 `workspace_id`
- 如果未来确实需要 workspace 观测，优先考虑：
  - presence flag
  - stable hash
  - normalized alias

## 最小设计

推荐分成 3 个小步，不合并成一个大 patch。

### R1. Recall audit annotation

目标：先让 recall audit 知道“scope 发生过”，但不改变 dashboard / CLI surface。

建议新增的 audit 字段：

```json
{
  "scopeApplied": true,
  "scopeMode": "sql-candidate+post-filter",
  "scopeDimensions": ["project_id", "visibility", "client_id"],
  "scopeStrict": false,
  "scopeProjectId": "codex-memory",
  "scopeClientId": "codex",
  "scopeVisibility": ["project", "shared"],
  "scopeWorkspace": {
    "present": true,
    "hash": "<optional future>"
  }
}
```

边界：

- 不记录原始 `workspace_id`
- 不回填历史 recall logs
- 不改变 MCP tool schema

当前状态：

- 已实现
- 当前字段包括：
  - `scopeApplied`
  - `scopeMode`
  - `scopeDimensions`
  - `scopeStrict`
  - `scopeProjectId`
  - `scopeClientId`
  - `scopeVisibility`
  - `scopeWorkspacePresent`

### R2. Overview aggregation

目标：`memory_overview` 能汇总“最近 scope recall 是否活跃”。

建议只加聚合，不先做 UI 强展示：

- `scopedRecallCount`
- `strictScopedRecallCount`
- `scopeModeBreakdown`
- `scopeDimensionBreakdown`

边界：

- 不输出高基数 workspace 分布
- 不把 scope summary 扩展成新的 policy engine

当前状态：

- 已实现
- 当前聚合位于 `memory_overview.recall.summary.scope`
- 当前字段包括：
  - `scopedRecallCount`
  - `strictScopedRecallCount`
  - `latestScopedHitAt`
  - `modeBreakdown`
  - `dimensionBreakdown`
  - `projectBreakdown`
  - `clientBreakdown`
  - `visibilityBreakdown`
- 仍不输出 workspace breakdown，也不暴露 raw `workspace_id`

### R3. Dashboard / observe rendering

目标：在 dashboard / `http-observe` 文本和 JSON 输出里补可解释性。

建议只显示低风险聚合：

- 最近 scoped recall 数
- strict recall 数
- 主要 scope mode / dimension

边界：

- 不显示原始 workspace 标识
- 不在这一层重新定义 recall contract

当前状态：

- 已实现
- `dashboard` 现在会输出最近 recall 总数、scoped recall 数、strict scoped recall 数
- `http-observe` 现在会在 summary 和 recall-audit section 输出 scoped recall 计数及 `scopeMode` / `scopeDimensions` breakdown
- 仍不输出 workspace breakdown，也不写 raw `workspace_id`

## 本轮决策

R1、R2、R3 已按拆分顺序全部落地。

当前边界保持不变：

1. recall audit 与 `memory_overview` 已经能表达“scope 发生过”和“最近 scoped recall 是否活跃”。
2. `workspace_id` 的敏感度边界仍按 `presence-only` 处理，避免 raw path 落盘。
3. dashboard / `http-observe` 只展示低风险 summary，没有把 observability surface 扩展成新的 policy layer。

## 推荐下一步

scope observability 这条线的下一条建议不再是继续下推 display，而是转回更高层治理或策略工作，例如：

```text
P8 / P10:
推进 governance-report CLI，
或单独评估 active-memory / policy-layer scope 是否需要独立设计。
```

当前独立设计入口：

- [POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md](/A:/codex-memory/docs/POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md)

## 明确不在本轮做

- active-memory scope policy
- visibility enforcement policy
- proposal / approval scope integration
- 原始 `workspace_id` audit 落盘
- dashboard / `http-observe` 大改版
- 新 MCP tool

## 一句话

scope 检索已经能工作；下一步不该盲目继续下推代码，而应该先把“scope recall 到底记录什么、暴露什么、隐藏什么”定清楚。
