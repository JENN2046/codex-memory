# codex-memory Phase 8 精确 Native Write 重新申请（CM-2091）

申请日期：2026-07-11

前次决定：`CM-2089-ER-20260711-FAIL-CLOSED-EXECUTION-BINDING-INCOMPLETE`

本次仍只申请一次 `record_memory` synthetic proof write 和一次低披露 verify；
不申请 rollback、compensation、重试、既有记忆修改或任何其他权限。

## 六项阻断修复

1. `Phase8OneShotNativeWriteExecutionGate` 通过文件锁原子 claim nonce 与
   receipt ID，状态机为 `UNCLAIMED → CLAIMED → CONSUMED_*`。进入 `CLAIMED`
   后永不重放。
2. `src/app.js` 的 Phase 8 enforcement 模式拒绝调用方提交
   `exactApprovalResult.accepted=true`；只有 registry 中仍为 `CLAIMED` 的
   内部 assertion 才能生成 exact approval，并且本地 fallback 被禁止。
3. Runtime commit `3ce0cc0…` 同时包含执行实现和 payload；payload 通过 Git
   blob `cde8e314…` 读取，不修改 clean detached checkout。
4. Context/allowlist 的完整 canonical 对象、序列化结果、字节数、SHA-256
   与 blob OID 均在 `phase8_execution_binding_cm2091.md` 可直接复算。
5. Verify 入口为实际导出的 `verifyPhase8NativeWriteAuditProjection`：只调用
   一次 `audit_memory`，family=`governance`、window=`1`、`include_raw=false`，
   并校验 claim/receipt 绑定及 selected bridge receipt fields。
6. Transport 明确为 outer isolated stdio MCP → codex-memory → inner local HTTP
   MCP → write-enabled VCPToolBox shim。最终 durable Markdown 269 字节及哈希
   已单独绑定，授权 metadata 不冒充持久化字段。

## 精确重新申请绑定

```yaml
phase8_native_write_authorized: false  # 申请改为 true
runtime_source_commit: "3ce0cc0fd842403de9aaf13d82c266a528d879d8"
runtime_source_tree: "0629b01a39d3ac66876b181829a0d623636f528c"
payload_source_commit: "3ce0cc0fd842403de9aaf13d82c266a528d879d8"
payload_blob_oid: "cde8e314a118e52e4beb9181401ee0bc7cc1dc68"
payload_bytes: 638
payload_file_sha256: "3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245"
payload_canonical_sha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"
context_sha256: "fc9deec9505fbadb52d76573434495358a65319b676dfa14e695b57a6884ceac"
allowlist_sha256: "4a36b22c27c28e952ce1598da0f86025e1d561e624a404f1b91c7d3b8281cf0b"
durable_markdown_bytes: 269
durable_markdown_sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"
tool: "record_memory"
exact_approval_action: "live_bridge_record_memory_proof"
expires_at: "2026-07-12T18:00:00+08:00"
nonce: "cm2091-phase8-record-memory-proof-001"
receipt_id: "cm2091-phase8-native-write-receipt-001"
authorization_use_count: 1
max_native_writes: 1
max_verify_operations: 1
max_rollback_or_compensation_operations: 0
```

## 模糊结果与补偿

进入 `CLAIMED` 后，预提交失败记为 `CONSUMED_FAILED_PRE_COMMIT`；成功并验证
记为 `CONSUMED_SUCCESS`；任何未知或 post-commit/verify 不明确结果记为
`CONSUMED_AMBIGUOUS_POST_COMMIT`。三者均不可重放 `record_memory`。

任何 rollback、tombstone、supersede 或 compensation 均是新的 native write，
需要新的 action-specific exact approval。本申请数量为零。

## 当前效力

当前 `phase8NativeWriteAuthorizationGranted=false`。本重新申请及实现测试没有
启动 runtime、声明 nonce、创建 receipt、执行 write/verify、读取真实记忆或
修改远端状态，也不构成 Phase 8 完成或 readiness 证据。
