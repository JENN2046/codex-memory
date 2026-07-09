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
  -> approval / policy gate
  -> commit_memory_delta
  -> VCPToolBox native durable write
  -> verify_write
  -> audit receipt + rollback posture
```

## 3. 组件职责

| 组件 | 职责 |
|---|---|
| Codex | 执行任务、读取 memory context、提出 memory delta |
| codex-memory MCP server | 对 Codex 暴露受治理 MCP surface |
| codex-memory governance layer | client_id、scope、visibility、runtime、权限、披露预算、审计、回滚 |
| VCP native shim / adapter | 把 codex-memory 调用转换成 VCPToolBox native memory 调用 |
| VCPToolBox native memory | 原生记忆行为 owner，真正 source of truth |
| local memory | fallback、audit、validation fixture、compatibility、offline continuity |

## 4. 必须新增的关键能力

### 4.1 `prepare_memory_context`

不是普通搜索工具，而是任务前上下文构建器。

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
```
