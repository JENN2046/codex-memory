# CM-2096 Frozen Rollback Execution Packet v2

本 packet 绑定已通过的语义决定 `CM-2096-ER-20260711-SEMANTIC-PACKET-PASS-51F21F60-NO-EXECUTION`，但仍是非执行申请材料。

## 精确目标

CM-2094 durable Markdown SHA-256 为 `4f863f52…3828`。冻结 shim 的引用算法是 `vcp-kb- + sha256(markdown).slice(0,16)`，因此安全目标引用为：

```text
vcp-kb-4f863f52455147c6
```

该引用由冻结 record SHA 和运行时源码复算，不读取物理路径或原始记忆正文。

## 实际 durable marker

Payload canonical JSON 为 331 bytes，SHA-256 `661e7eaf…1166`。它通过真实 shim `createMutationMarkdown('tombstone_memory', payload)` 序列化为 507-byte Markdown：

```text
27a5e58649908bbc4f835d891149d028e71dcc5042dcb13daaa597bd4286263a
```

这替代旧 packet 中只描述设计对象的 301-byte hash。旧 hash 不是 durable marker proof。

## Marker-aware verify

新增纯 selected-field projection 合同，要求 marker receipt、目标引用、原始 269-byte hash、`tombstoned` 状态和有效 retrieval 返回数 `0` 精确关联。合同测试只能证明 shape fail-closed，当前不接受为 rollback evidence。

## 权限边界

```yaml
executionAuthorized: false
tombstoneExecutionAuthorized: false
verifyAuthorized: false
authorizationDecisionPresent: false
nativeActionCount: 0
verifyOperationCount: 0
rollbackDrillPassed: false
phase8Completed: false
```

冻结 executor 的 execution 方法始终抛出 `cm2096_tombstone_execution_not_authorized`。只有未来新的 action-specific 决定完成 Git intake 后，才可替换为受治理的一次性执行路径。
