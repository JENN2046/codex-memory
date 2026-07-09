# 11｜第一轮自审报告

## 审查对象

`codex-memory｜接近模型内置记忆体验计划包 v1.0`

## 审查维度

1. 目标是否准确。
2. 是否过度承诺。
3. 是否区分外部记忆和模型内置记忆。
4. 是否吸收 Codex 回复中的正确判断。
5. 是否补足 Codex 回复中缺少的 memory context layer。

## 发现的问题

### 问题 1：原目标表达过满

原始表达：

```text
让 Codex 拥有 VCP 完整实时记忆能力
```

风险：

```text
容易被读成无限、默认、无边界、模型内部式完整记忆。
```

修正：

```text
Codex 通过 MCP 拥有对 VCPToolBox 原生记忆的完整、实时、受治理访问能力，并通过 memory context package 获得接近模型内置记忆体验。
```

### 问题 2：只讲 MCP 通道不够

Codex 回复正确指出通道骨架：

```text
Codex -> /mcp/codex-memory -> /mcp/vcp-native -> VCPToolBox native memory
```

但这只解决连接问题，不解决自然记得的问题。

修正：

```text
新增 prepare_memory_context / memory context package / task-start automatic recall。
```

### 问题 3：full surface 容易过早开放

修正：

```text
默认 read-only + context + proposal。
record / validate / tombstone / supersede 先 operator-only。
native write production 放到最后。
```

## 第一轮自审结论

计划方向正确，但必须强调：

```text
接近模型内置记忆体验的关键不是 full tools，而是 memory context layer。
```

已在计划包中修正。
