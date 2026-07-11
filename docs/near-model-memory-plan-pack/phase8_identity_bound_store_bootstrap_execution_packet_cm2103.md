# CM-2103 Identity-bound Synthetic Store Bootstrap Executor Packet

本 packet 供独立审查 CM-2103 一次性 bootstrap 实现。它不携带未来精确决定，
不授权或执行 store directory / identity 创建，不运行 empty-store preflight，也不调用
任何 native memory 工具。

## Frozen implementation

```yaml
implementation_commit: "809ec09b1909efe5602c5a46a5a2b6e3e367dc16"
implementation_tree: "a9f6b7ef58828951a39e2d5502e8e703500d23ff"

foundation_decision_commit: "9f73db8c6d1b7cba1a24d262880c7d37b953d2a0"
foundation_packet_commit: "0c80561ae6ce2145becf438624ffdd21d1a62726"
```

## Exact future executor inputs

```text
execution_packet_commit
+
future_exact_bootstrap_decision_commit
```

调用者不能提供 store path、environment path override、identity bytes、store/lifecycle
override、write callback 或 reconciliation callback。

## One-shot state

```text
UNCLAIMED
→ CLAIMED
→ STORE_DIRECTORY_CREATE_CONSUMED
→ STORE_DIRECTORY_CREATED
→ IDENTITY_WRITE_CONSUMED
→ IDENTITY_CREATED
→ CONSUMED_SUCCESS
```

`CONSUMED_PARTIAL_BOOTSTRAP` 与 `CONSUMED_AMBIGUOUS` 都是不可重放终态。
`STORE_DIRECTORY_CREATE_CONSUMED` 在实际 `mkdir` 前持久化，确保一次尝试即消费。

## Frozen non-authority

```yaml
future_decision_present: false
bootstrap_execution_authorized: false
store_directory_created: false
store_identity_created: false
empty_store_preflight_authorized: false
empty_store_preflight_executed: false
record_memory_authorized: false
tombstone_memory_authorized: false
verify_authorized: false
nonce_claimed: false

native_reads: 0
native_writes: 0
rollback_or_compensation_operations: 0

rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```
