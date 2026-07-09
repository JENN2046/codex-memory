# 01｜Executive Summary

## 一句话结论

`codex-memory` 可以实现接近模型内置记忆的体验，但路线不是“开放更多 MCP 工具”，而是：

```text
read-only native realtime access
  -> memory context package
  -> task-start automatic recall
  -> governed memory delta
  -> operator-only full surface
  -> native write production proof
  -> default runtime policy review
```

## 正确目标表达

不建议继续使用：

```text
让 Codex 拥有 VCP 的无限完整记忆。
```

建议改为：

```text
让 Codex 通过 MCP 拥有对 VCPToolBox 原生记忆的完整、实时、受治理访问能力，并通过 memory context package 与任务前自动召回，获得接近模型内置记忆体验的外部长期记忆能力。
```

## 核心判断

| 判断项 | 结论 |
|---|---|
| Codex MCP 通道是否正确 | 是 |
| VCP native shim 通道是否正确 | 是 |
| 两个通道连通是否等于完整能力 | 否 |
| 默认 read-only 是否正确 | 是 |
| full surface 是否应默认开放 | 否 |
| operator-only full surface 是否可做 | 可以，需 gate |
| native write production 是否现实 | 现实，但必须 proof |
| 接近模型内置记忆体验是否现实 | 现实，但必须加入 memory context layer |
| 真正模型权重内置记忆是否现实 | 否，本项目不做 |

## 计划核心

Codex 回复中的路线适合作为“底座能力路线”：

```text
Phase 1: read-only realtime native memory
Phase 2: operator-only full surface
Phase 3: native write production proof
Phase 4: Codex default runtime policy
```

但它还缺“体验层”。本计划补充：

```text
prepare_memory_context
memory context package
task-start automatic recall
recall quality gate
propose_memory_delta
governed write-back pipeline
```

## 当前优先级

先做：

```text
Phase 1: blocker 修复 + read-only 基线重证
```

不要先做：

```text
默认 full surface
native write production
tombstone/supersede 默认开放
release/tag
production replacement claim
```
