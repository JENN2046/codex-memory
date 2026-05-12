# Codex/Claude Scope Acceptance

更新时间：2026-05-12

## 验证

`search_memory` 现已支持可选 `scope` 参数（I-003）。验证结果：

| 测试 | 操作 | 预期 | 结果 |
|------|------|------|------|
| 后向兼容 | 无 scope filter | 正常返回结果 | PASS |
| 正确 project | `project_id: "codex-memory"` | 返回结果 | PASS |
| 错误 project | `project_id: "other"` | 0 results | PASS |
| 正确 visibility | `visibility: "project"` | 返回结果 | PASS |
| 错误 visibility | `visibility: "private"` | 0 results | PASS |
| 正确 workspace | `workspace_id: "/workspace/accepted"` | 返回结果 | PASS |
| 错误 workspace | `workspace_id: "/workspace/wrong"` + `strict: true` | 0 results | PASS |
| 正确 client | `client_id: "codex"` | 返回结果 | PASS |
| 错误 client | `client_id: "claude"` + `strict: true` | 0 results | PASS |
| 组合过滤 | `project_id + visibility` | 返回结果 | PASS |
| 组合过滤扩展 | `project_id + workspace_id + client_id + visibility` | 仅返回完整匹配记录 | PASS |
| 候选下推 | `scope + limit=1` 且更高分 off-scope 记录超过候选池 | 仍返回 in-scope 结果 | PASS |
| audit annotation | scoped search recall audit | 记录 `scopeApplied / scopeMode / scopeDimensions / strict / low-risk fields`，且不写 raw `workspace_id` | PASS |
| overview aggregation | `memory_overview.recall.summary.scope` | 聚合 scoped recall 活跃度与低风险 breakdown，且不输出 workspace 明细 | PASS |
| 无记录 fallback | record 缺失 scope 字段 | 不过滤（安全兜底） | PASS |

## Scope Filter 参数

```json
{
  "scope": {
    "project_id": "codex-memory",   // optional
    "visibility": "project",        // optional, or ["project", "shared"]
    "workspace_id": "...",          // optional
    "client_id": "codex"            // optional
  }
}
```

所有参数均为可选，默认不启用过滤（向后兼容）。

## 实现说明

- `search_memory` 会先把 `project_id` / `workspace_id` / `client_id` / `visibility` 下推到 chunk SQL 候选查询
- 搜索结果返回后仍保留 post-filter，作为 legacy / record 缺失 / strict 模式下的 defense-in-depth 兜底
- recall audit 现已记录低风险 scope annotation：`scopeApplied`、`scopeMode`、`scopeDimensions`、`scopeStrict` 以及 `project/client/visibility` 等低风险字段；`workspace_id` 只记录 presence，不落 raw 值
- `memory_overview.recall.summary.scope` 现已聚合 scoped recall 的计数、strict 数、mode/dimension breakdown，以及低风险的 `project/client/visibility` breakdown
- 依赖于 H-002c migration 中新增的 scope 列（project_id、visibility、workspace_id、client_id）
- 若 memory record 缺少 scope 列，则该 record 不会被过滤（安全兜底）

## 已知限制

- 当前下推发生在 chunk SQL 候选层，active-memory 路径与更深层 recall 策略仍未引入独立 scope policy
- 若未来引入更复杂的 scope policy（例如 proposal/approval 或 layered visibility），需要单独扩展查询与审计语义
- recall / audit 语义层的最小设计见 [SCOPE_RECALL_AUDIT_DESIGN.md](/A:/codex-memory/docs/SCOPE_RECALL_AUDIT_DESIGN.md)
