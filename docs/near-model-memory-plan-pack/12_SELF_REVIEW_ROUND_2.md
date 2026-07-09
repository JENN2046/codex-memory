# 12｜第二轮自审报告

## 审查对象

第一轮修正后的计划包。

## 审查维度

1. 是否可执行。
2. 是否有明确阶段。
3. 是否有任务书。
4. 是否有验收标准。
5. 是否保留当前已知 blocker。
6. 是否防止计划过大导致发散。

## 发现的问题

### 问题 1：如果不先修 blocker，后续所有能力都不稳

当前必须先修：

```text
hardened explicit public tools bypass
AtomicFileWriter stale lock cleanup TOCTOU
```

修正：

```text
Phase 1 强制只做 blocker 修复与重跑 gate。
prepare_memory_context 放到 Phase 3。
```

### 问题 2：召回质量必须单独成 gate

如果只实现 `prepare_memory_context`，但不测试质量，容易形成：

```text
工具能返回，但返回内容不可靠。
```

修正：

```text
Phase 5 单独设置 recall quality gate。
```

### 问题 3：memory delta 容易变成自动写入

修正：

```text
propose_memory_delta 默认 proposal-only。
commit_memory_delta operator-only。
native write production proof 放到 Phase 8。
```

### 问题 4：release 命名容易过度声明

修正：

```text
允许 v0.2.0-readonly-context-rc。
禁止 full-vcp-memory / complete-realtime-memory / production-write-ready。
```

## 第二轮自审结论

计划现在可执行。  
推荐执行顺序：

```text
Phase 0 + Phase 1
  -> fresh gates
  -> Phase 2 read-only proof
  -> Phase 3 prepare_memory_context
```

不要并行推进 native write production。
