# Memory Lifecycle Read Policy Plan

更新时间：2026-05-13

本文是 `P11.4-lifecycle-read-policy-runtime-flag-planning` 的规划事实源，用来定义 lifecycle read policy runtime flag 的目标、默认关闭策略、status visibility、scope 关系、audit shape 和后续验收路线。

本阶段是 docs/tests-design planning：

- 不实现过滤。
- 不修改 `search_memory` runtime 行为。
- 不修改 `src/`、`tests/`、`package.json`。
- 不新增 MCP public tools。
- 不做 SQLite migration。
- 不迁移真实数据。
- 不调用 provider。
- 不 push / tag / release / deploy。

## Purpose

Lifecycle read policy 的目标是让未来 `search_memory` 能够按 lifecycle status 过滤普通召回结果，避免 `proposal`、`rejected`、`superseded`、`tombstoned` 默认进入普通记忆召回。

这不是删除或迁移策略。它只定义未来 read path 可以如何在 feature flag 下选择默认候选集合，让记忆生命周期治理不会污染日常 recall。

设计目标：

- 默认兼容当前行为，避免突然改变召回结果。
- 在显式 flag 开启后，默认只让 `active` / `stale` 进入普通召回候选。
- 将 `proposal`、`rejected`、`superseded`、`tombstoned` 留给 audit/admin/review surface，而不是普通 `search_memory`。
- 保持 visibility / client scope 约束继续生效。
- 在 audit summary 中记录策略是否生效，但不暴露 raw `workspace_id`。

## Proposed Flags

候选 feature flags：

| Flag | Default | Purpose |
|---|---:|---|
| `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` | `false` | P10 已有 soft read policy flag，用于在开启后过滤 proposal/rejected/tombstoned 与 cross-client private。 |
| `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` | `false` | 未来 lifecycle 专用 read policy flag，用于按 lifecycle status 过滤默认召回候选。 |

默认值必须保持 `false`，避免破坏现有行为。

未来切换默认策略只能在 gate 或 migration 之后单独进行，且需要：

- fixture-backed read-policy tests。
- 默认关闭回归测试。
- `gate:ci` policy summary。
- `gate:mainline:strict`。
- 明确 closeout 说明是否改变默认行为。

## Status Visibility Matrix

当 lifecycle read policy 开启时，普通 `search_memory` 默认候选建议如下：

| Status | Default visibility | Notes |
|---|---|---|
| `active` | visible | 默认可信记忆，可进入普通召回候选。 |
| `stale` | visible | 默认可见，但必须标记为 stale，未来可用于降权或提示。 |
| `proposal` | hidden | 未审核候选，不应污染普通召回。 |
| `rejected` | hidden | 已拒绝候选，只保留治理/audit 价值。 |
| `superseded` | hidden | 默认隐藏，除非未来显式 `include_superseded` review/admin mode。 |
| `tombstoned` | hidden | 默认始终隐藏，只有显式 audit/admin mode 才可查看 minimal record。 |

Future option notes:

- `include_superseded` 只能作为 future review/admin mode 选项，不能成为普通召回默认值。
- `tombstoned` 不应通过普通 `search_memory` 暴露；如果未来需要查看，应走 audit/admin surface。
- `stale` 可见不等于高置信；未来 ranking/read policy 可以对 stale 结果打标或降权。

## Relationship With Visibility And Client Scope

Lifecycle policy 与 scope policy 的建议顺序：

1. Lifecycle policy 先过滤 status。
2. Scope policy 再过滤 `project_id` / `workspace_id` / `client_id` / `visibility`。
3. Ranking、rerank、candidate cache 和 audit summary 在过滤后的候选集合上继续工作。

Scope relationship:

- `visibility=private` 继续要求 same-client。
- `visibility=shared` 仍受 workspace / project scope 约束。
- `visibility=project` 仍受 project scope 约束。
- `visibility=workspace` 仍受 workspace scope 约束。
- Lifecycle policy 不放宽 scope policy。
- Scope policy 不放宽 lifecycle policy。

如果两个策略都启用，任一策略隐藏的 memory 都不应进入普通召回候选。

## Audit Shape

未来 read audit summary 建议新增低风险字段：

```json
{
  "readPolicyApplied": true,
  "lifecyclePolicyApplied": true,
  "lifecycleIncludedStatuses": [
    "active",
    "stale"
  ],
  "lifecycleExcludedStatuses": [
    "proposal",
    "rejected",
    "superseded",
    "tombstoned"
  ],
  "hiddenByLifecycleCount": 0,
  "staleResultCount": 0
}
```

Audit rules:

- `readPolicyApplied` 表示任何 read policy 是否参与本次召回。
- `lifecyclePolicyApplied` 表示 lifecycle status filter 是否参与本次召回。
- `lifecycleIncludedStatuses` 记录本次允许进入候选的 status。
- `lifecycleExcludedStatuses` 记录本次默认隐藏的 status。
- `hiddenByLifecycleCount` 记录因 lifecycle policy 被隐藏的候选数量。
- `staleResultCount` 记录最终结果中 stale memory 数量。
- raw `workspace_id` 不进入 audit summary。
- audit summary 不记录 secret、token、cookie、private key 或 `.env` 值。

## Runtime Non-Goals For This Phase

- 本阶段不实现过滤。
- 本阶段不改 `search_memory`。
- 本阶段不新增 MCP tools。
- 本阶段不迁移 SQLite。
- 本阶段不新增 CLI。
- 本阶段不更改 `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` 当前默认行为。
- 本阶段不读取或修改 `.env` / secrets。
- 本阶段不调用 provider。

## Future Phases

### P11.5 Lifecycle Read Policy Fixture Tests

目标：

- 用 fixture 固化 lifecycle read policy 的 include/exclude 集合。
- 覆盖 `active/stale` 默认可见。
- 覆盖 `proposal/rejected/superseded/tombstoned` 默认隐藏。
- 覆盖 stale result count 与 hidden-by-lifecycle count 的 expected shape。
- 不接入 runtime，不改 `search_memory`。

### P11.6 Optional Runtime Flag Implementation

目标：

- 在 `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=false` 默认关闭下实现可选过滤。
- 开启 flag 后按 lifecycle status 过滤默认召回候选。
- 保持 MCP public tools 不变。
- 保持默认行为不变。
- 增加 runtime tests 和 strict gate。

### P11.7 Lifecycle Policy Gate-CI Summary

目标：

- 将 lifecycle read policy summary 以 fixture-only 形式纳入 `gate:ci`。
- 不依赖真实 HTTP MCP。
- 不调用 provider。
- 不写真实 memory。
- 不读 `.env`。

### P12 Controlled Mutation Tools

目标：

- 在 P11 schema、dry-run、read policy 都稳定后，评估 controlled mutation tools。
- 候选能力包括 proposal accept/reject、supersede、tombstone/forget、lifecycle audit review。
- 任何 MCP public tool 扩展都必须单独明确授权。
