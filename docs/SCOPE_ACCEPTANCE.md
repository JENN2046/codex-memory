# Codex/Claude Scope Acceptance

更新时间：2026-05-08

## 验证

`search_memory` 现已支持可选 `scope` 参数（I-003）。验证结果：

| 测试 | 操作 | 预期 | 结果 |
|------|------|------|------|
| 后向兼容 | 无 scope filter | 正常返回结果 | PASS |
| 正确 project | `project_id: "codex-memory"` | 返回结果 | PASS |
| 错误 project | `project_id: "other"` | 0 results | PASS |
| 正确 visibility | `visibility: "project"` | 返回结果 | PASS |
| 错误 visibility | `visibility: "private"` | 0 results | PASS |
| 组合过滤 | `project_id + visibility` | 返回结果 | PASS |
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

- 采用 post-filter 方式（搜索结果返回后按 scope 字段过滤）
- 不修改 recall pipeline
- 依赖于 H-002c migration 中新增的 scope 列（project_id、visibility、workspace_id、client_id）
- 若 memory record 缺少 scope 列，则该 record 不会被过滤（安全兜底）

## 已知限制

- post-filter 方式下，如果 scope 过滤后结果不足 limit，不会补回更多结果
- 未来可考虑在 recall pipeline 中直接下推 scope filter 到 SQL 查询以提升效率
