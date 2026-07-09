# 10｜外部审查申请书

## 审查目的

请求外部审查者判断 `codex-memory` 的目标调整是否正确，以及当前计划是否足以从“受治理 MCP bridge”走向“接近模型内置记忆体验的外部长期记忆运行时”。

## 当前目标表达

建议目标：

```text
Codex 通过 MCP 拥有对 VCPToolBox 原生记忆的完整、实时、受治理访问能力，并通过 memory context package、任务前自动召回、任务后 memory delta，逐步获得接近模型内置记忆的使用体验。
```

## 请求审查的问题

### 1. 目标表达

请判断：

```text
near-model-memory external runtime
```

是否比：

```text
Codex has full VCP realtime memory
```

更准确。

### 2. 通道判断

当前骨架：

```text
Codex
  -> /mcp/codex-memory
  -> /mcp/vcp-native
  -> VCPToolBox native memory
```

是否是正确骨架？

### 3. 缺失能力

是否同意通道之外还必须补：

```text
native shape compatibility
audit receipt
rollback posture
output disclosure budget
memory context package
recall quality gate
memory delta pipeline
```

### 4. 当前 blocker

请重点审查：

```text
hardened explicit public tools bypass
AtomicFileWriter stale lock cleanup TOCTOU
```

是否已经修复。

### 5. prepare_memory_context

请判断新增 `prepare_memory_context` 是否是让 Codex 接近“自然记得”的正确路线。

### 6. 默认权限

请判断默认 runtime 是否应保持：

```text
search_memory
memory_overview
audit_memory
prepare_memory_context
propose_memory_delta
```

并继续隐藏：

```text
record_memory
validate_memory
tombstone_memory
supersede_memory
commit_memory_delta
```

### 7. release 判断

请判断是否可以在 read-only/context milestone 后 tag，例如：

```text
v0.2.0-readonly-context-rc
```

同时不宣称 full capability。

## 希望输出格式

```text
review result:
  READY_FOR_READONLY_CONTEXT_TAG
  BLOCKED_NEEDS_FRESH_GATES
  BLOCKED_NEEDS_FIXES

blockers:
high:
medium:
low:

goal expression:
architecture:
memory context layer:
default runtime policy:
native write readiness:
release/tag recommendation:
production replacement recommendation:
```
