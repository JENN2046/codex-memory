# Soft Read Policy Preflight

更新时间：2026-05-12

## 目的

这份文档回答 `PL-2` 的最小问题：

- 如果默认读路径开始排除 `proposal / rejected / tombstoned`，当前行为会变多少？
- 如果再叠加 `visibility=private` 的 client-aware 过滤，影响会不会比想象中更大？

当前交付是 fixture-backed preflight，不改 runtime。

对应回归：

- [policy-read-preflight.test.js](/A:/codex-memory/tests/policy-read-preflight.test.js)

## Fixture 场景

测试构造了两组混合记录，全部共享同一个 query phrase，确保当前默认 `search_memory` 会把它们一起召回。

涉及的 lifecycle / visibility 组合：

- `active + shared + codex`
- `proposal + shared + claude`
- `rejected + shared + claude`
- `tombstoned + shared + codex`
- `active + private + claude`
- `active + private + codex`

## 当前观察

### 1. 当前默认读路径仍然很宽

在没有显式 `scope` / status policy 的情况下，当前默认 `search_memory` 会把上面这些 mixed-governance records 一起返回。

这说明：

- lifecycle 目前还没有进入默认 read policy
- `visibility=private` 目前也没有自动变成 cross-client hard filter

### 2. 假设的 soft policy 收窄幅度不小

测试里的假设策略是：

- 只保留 `status IN ('active', 'stale')`
- 如果 `visibility='private'`，仅保留 `client_id === requestClientId`

在 fixture 场景里：

- baseline：`6` 条结果
- 加 `status` soft filter 后：`3` 条结果
- 再加 client-aware `private` filter 后：`2` 条结果

最终仅保留：

- `Active Shared`
- `Private Codex`

被收掉的则包括：

- `Proposal Shared`
- `Rejected Shared`
- `Tombstoned Shared`
- `Private Claude`

## 结论

### 结论 1

默认 read policy 一旦改变，不会只是“更干净一点”，而是会显著改变 mixed-governance fixture 的结果集合。

### 结论 2

`status` soft filter 和 `visibility` soft filter 不能混成一个无说明的内部优化。

因为它们影响的不是排序，而是：

- 哪些 record 能被看到
- 哪些 record 会从默认 recall 中消失

### 结论 3

如果未来推进 soft read policy，最安全的顺序应该是：

1. 先单独预演 status policy
2. 再单独预演 client-aware private visibility
3. 不要一次同时落两层默认过滤

## 推荐下一步

### PL-2a. Status-only preflight refinement

把 `proposal / rejected / tombstoned` 的默认排除单独做成更细的 fixture matrix，明确：

- `superseded` 是否也默认排除
- `stale` 是否默认保留
- `memory_overview` / `governance:report` 是否需要额外解释“默认 recall 未显示”

### PL-2b. Visibility-only preflight refinement

把 `private / workspace / project / shared` 单独跑 mixed-client fixture，明确：

- `workspace` 是否只做 scope hint，还是要变成 hard read rule
- `private` 是否只在 Claude/Codex 之间隔离，还是 Commander 也要显式 bypass

## 当前不做

- 改 `search_memory` 默认行为
- 改 MCP contract
- 在 dashboard / `http-observe` 上伪装成“只是更好解释”
- 直接上 hard enforcement

## 一句话

preflight 结果说明：soft read policy 不是小修，它会真实改变默认召回集合，所以必须先拆开 status 和 visibility 两层分别评估。
