# 02｜最终目标与禁止声明

## 1. 最终目标

`codex-memory` 的最终目标是：

```text
让 Codex 通过 MCP、codex-memory 治理层和 VCPToolBox native memory runtime，获得接近模型内置记忆体验的外部长期记忆能力。
```

这意味着完整实现本计划包，而不是只实现其中一个阶段。

这个目标包含两层。

### 1.1 底座能力目标

```text
Codex 通过 MCP 拥有对 VCPToolBox 原生记忆的完整、实时、受治理访问能力。
```

包含：

- search
- overview
- audit
- record
- validate
- tombstone
- supersede
- audit receipt
- rollback posture
- output disclosure budget
- runtime target binding
- scope / visibility isolation

### 1.2 体验目标

```text
Codex 在任务开始前自动获得当前应记得的 memory context package，使其工作体验接近“自然记得”。
```

包含：

- 任务前自动召回
- 当前任务相关记忆包
- 用户偏好
- 项目状态
- 最近决策
- 当前 blocker
- 风险与禁止假设
- 任务后 memory delta
- 受控写回

## 2. 非目标

本项目不追求：

```text
真正模型权重内置记忆
无边界完整记忆
默认 full write surface
默认 tombstone / supersede 权限
无审批 durable mutation
无 audit receipt 的写入
无 rollback posture 的生产写入
把 fallback 伪装成 native realtime
把 codex-memory 变成新的记忆智能 owner
绕过 VCPToolBox native memory runtime
重写一套 VCPToolBox 原生记忆智能
把 EPA / Residual Pyramid / TagMemo 高级叙事包装成已验证生产智能
```

本地记忆、SQLite shadow、向量索引、recall pipeline、write governance
必须保留。它们的角色是 fallback、audit、validation fixture、
compatibility、offline continuity、context packaging、proposal/staging。

VCPToolBox native memory 继续是最终 memory intelligence owner。

EPA / Residual Pyramid / TagMemo 高级叙事降级为 experimental recall
heuristics；可以辅助 candidate ranking、grouping、explanation 和
`prepare_memory_context`，但不能作为生产记忆智能声明。

## 3. 禁止声明

任何 README、release note、closeout、审查申请不得宣称：

```text
Codex 已经拥有 VCP 完整实时记忆能力
Codex 已经拥有模型内置式记忆
production replacement complete
native write production accepted
default full surface safe
tag/release ready
read proof 等于 write proof
operator-only 等于 Codex default
fixture proof 等于 production-provider proof
fallback read 等于 native realtime read
```

## 4. 允许声明

在对应 gate 通过后，允许声明：

```text
default MCP surface is read-only
Codex can perform governed read-only MCP access
native realtime read path is proofed under specified runtime
memory context package MVP passed fixture gate
operator-only full surface passed local proof
native write production proof passed under specified runtime
```

每个声明必须绑定：

- 日期
- commit
- runtime
- evidence artifact
- gate result
- scope limitation
