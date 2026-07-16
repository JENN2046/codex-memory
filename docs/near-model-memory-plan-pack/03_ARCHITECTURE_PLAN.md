# 03｜架构计划

## 1. 当前骨架

```text
Codex
  -> /mcp/codex-memory
  -> codex-memory governed bridge
  -> /mcp/vcp-native
  -> VCPToolBox native memory
```

这条骨架是正确的。

但它只解决：

```text
Codex 能连到 VCP native runtime。
```

它不自动解决：

```text
Codex 像自然记得一样使用记忆。
```

## 2. 目标架构

```text
Codex task starts
  -> prepare_memory_context
  -> codex-memory governance layer
  -> VCP native memory/context adapter
  -> memory context package
  -> Codex executes task with injected context
  -> propose_memory_delta
  -> local staging / audit / policy gate
  -> optional operator-approved commit_memory_delta
  -> optional VCPToolBox native durable write
  -> verify_write
  -> audit receipt + rollback posture
```

## 3. 组件职责

| 组件 | 职责 |
|---|---|
| Codex | 执行任务、读取 memory context、提出 memory delta |
| codex-memory MCP server | 对 Codex 暴露受治理 MCP surface |
| codex-memory governance layer | client_id、scope、visibility、runtime、权限、披露预算、审计、回滚 |
| existing local memory / SQLite shadow / vector index | fallback、audit、validation fixture、compatibility、offline continuity、context packaging 的本地支撑 |
| KnowledgeBaseRecallPipeline / CandidateGenerator | `prepare_memory_context` 的主要召回与候选生成底座 |
| TagMemoEngine / EPA / Residual Pyramid | experimental recall heuristics，只能辅助排序、分组、解释和 context packaging |
| scope / lifecycle filters | 保证 context package 不跨 scope、不误用 tombstoned / superseded / rejected 记忆 |
| AuditLogStore / MemoryOverviewService | 为 context package 提供审计、状态、概览和 source breakdown |
| local write governance pipeline | `propose_memory_delta`、staging、audit 的底座，不是默认 production write |
| VCP native shim / adapter | 把 codex-memory 调用转换成 VCPToolBox native memory 调用 |
| VCPToolBox native memory | 原生记忆行为 owner，真正 source of truth |

## 4. 必须新增的关键能力

### 4.1 `prepare_memory_context`

不是普通搜索工具，而是任务前上下文构建器。

它不从零开始实现召回。它应复用：

- `KnowledgeBaseRecallPipeline`
- `CandidateGenerator`
- `TagMemoEngine`
- local memory
- SQLite shadow
- vector index
- scope filters
- lifecycle filters
- `AuditLogStore`
- `MemoryOverviewService`

核心动作是把 bounded search results 转换成 task-oriented memory context
package。

输入：

```yaml
task:
  title:
  user_request:
  project_id:
  workspace_id:
  client_id:
  visibility:
  repo:
  current_branch:
  current_files:
options:
  max_items:
  max_bytes:
  include_risks:
  include_user_preferences:
```

输出：

```yaml
memory_context_package:
  must_know:
  recent_decisions:
  current_state:
  blockers:
  risks:
  forbidden_assumptions:
  recommended_next_step:
  source_breakdown:
  audit_receipt:
```

### 4.2 `propose_memory_delta`

任务结束后生成建议沉淀内容。

默认：

```text
proposal-only
no durable mutation
no production write
```

实现应复用现有本地 write pipeline / write governance：

- proposal construction
- staging
- validation
- audit receipt
- rollback posture metadata

它不是默认生产写入路径。

### 4.3 `commit_memory_delta`

operator-only / approval-only。

必须具备：

```text
exact approval
runtime target binding
scope binding
native receipt
audit receipt
rollback posture
verify_write
```

## 5. native adapter contract

VCP native shim 不应长期只是临时桥。需要逐步升级成标准 adapter contract。

必须明确：

```text
search shape
overview shape
audit shape
record shape
validate shape
tombstone shape
supersede shape
receipt shape
failure shape
rollback shape
low-disclosure shape
```

## 6. 关键原则

```text
通道连通不是能力完成。
read proof 不是 write proof。
search-shaped payload 不能冒充 overview/audit。
operator-only 不是 default runtime。
fallback 不是 native realtime。
本地 recall/write pipeline 必须保留并复用。
EPA / Residual Pyramid / TagMemo 高级叙事只是 experimental recall heuristics。
VCPToolBox native memory 继续是最终 memory intelligence owner。
```
