# 07｜能力矩阵

| 能力 | 当前状态 | 默认开放 | operator-only | 需要新增 | production-ready |
|---|---|---:|---:|---:|---:|
| `search_memory` local/read bridge | 已有 | 是 | 否 | 否 | 部分 |
| `memory_overview` | 已有 | 是 | 否 | 否 | 部分 |
| `audit_memory` | 已有 | 是 | 否 | 否 | 部分 |
| default read-only MCP surface | 已有，需修 blocker 后重证 | 是 | 否 | 否 | 部分 |
| hidden tools hard reject | 已有 | 是 | 否 | 否 | 部分 |
| governed native realtime read | 部分已有 | 是 | 否 | 需要 repeatable proof | 否 |
| native response shape compatibility | 部分 | 是 | 否 | 是 | 否 |
| `prepare_memory_context` | 缺失 | 应默认开放 | 否 | 是 | 否 |
| memory context package | 缺失 | 应默认开放 | 否 | 是 | 否 |
| task-start automatic recall | 缺失 | 应默认启用 | 否 | 是 | 否 |
| recall quality gate | 部分 | 是 | 否 | 是 | 否 |
| `propose_memory_delta` | 缺失 | 可默认 proposal-only | 否 | 是 | 否 |
| `commit_memory_delta` | 缺失 | 否 | 是 | 是 | 否 |
| `record_memory` | 已有/部分 | 否 | 是 | 需要 write proof | 否 |
| `validate_memory` | 已有/部分 | 否 | 是 | 需要 operator proof | 否 |
| `tombstone_memory` | 已有/部分 | 否 | 是 | 需要 destructive mutation proof | 否 |
| `supersede_memory` | 已有/部分 | 否 | 是 | 需要 destructive mutation proof | 否 |
| native write delegation | 部分 | 否 | 是 | 是 | 否 |
| audit receipt | 部分 | 是 | 否 | 强化 write receipt | 否 |
| rollback posture | 部分 | 是 | 否 | 强化 write rollback | 否 |
| output disclosure budget | 部分 | 是 | 否 | 强化 end-to-end proof | 否 |
| Codex default full capability | 不应开放 | 否 | 否 | 需长期观察 | 否 |

## 能力解释

### 已有但不能过度宣称

```text
search_memory / memory_overview / audit_memory 默认只读可用
```

不能写成：

```text
Codex 已拥有完整实时记忆能力
```

### 新增核心

```text
prepare_memory_context
```

这是接近模型内置记忆体验的关键。

### 最高风险

```text
tombstone_memory
supersede_memory
native write production
Codex default expanded write authority
```

这些必须最后做。
