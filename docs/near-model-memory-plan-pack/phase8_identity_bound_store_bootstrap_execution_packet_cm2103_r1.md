# CM-2103-R1 Identity-bound Store Bootstrap Executor Packet

本 packet 冻结 claim atomicity 与 ambiguous receipt 修复后的非执行实现。它不携带未来
精确 bootstrap 决定，不授权或执行真实 store directory / identity 创建、empty-store
preflight 或任何 native memory 操作。

## 修复后的 claim 模型

```text
existing governance registry root
└── one atomic claim envelope created with wx
    ├── nonce hash
    ├── receipt ID hash
    ├── binding hash
    └── current state and low-disclosure counters
```

Claim 不再创建 action registry directory 或 registry identity，也不再分别写入 nonce
marker、receipt marker 和 claim record。

## Implementation binding

```yaml
implementation_commit: "bb0217419f0a24fadb7aafd0aca4a0a616dacb60"
implementation_tree: "730c18bc4a44eb964539f18fec2565585375d7ab"

r1_review_decision_commit: "237e7b9b3ff0ac6ca1dd970a856c346c98086d5f"
r1_review_decision_reference: "CM-2103-ER-20260711-CHANGES-REQUIRED-CLAIM-AMBIGUITY-RECEIPT-INCOMPLETE-D9D896AC"
```

## Receipt union

```yaml
variants:
  - CLAIM_REGISTRY_AMBIGUOUS
  - CONSUMED_SUCCESS
  - CONSUMED_PARTIAL_BOOTSTRAP
  - CONSUMED_AMBIGUOUS

tristate_effects:
  - storeDirectoryCreated
  - identityWriteAttempted
  - identityCreated
  - identityBytes
  - identitySha256
  - identityReadbackMatched
```

Partial/ambiguous receipts use `null` for unknown filesystem effects. Only `CONSUMED_SUCCESS`
may be accepted as bootstrap evidence; other variants are reconciliation evidence only。

## Isolated fault-injection evidence

真实文件系统测试只使用 OS 临时 synthetic fixture，并在测试结束后清理 fixture。测试不会
解析或写入真实 Git common-dir governance root。

覆盖：成功、既有 store 停线、claim 创建前失败、claim acknowledgement 丢失、claim
terminal persistence 失败、mkdir/identity acknowledgement 丢失、readback failure、三类
state persistence failure 和所有终态重放拒绝。

## Frozen non-authority

```yaml
future_decision_present: false
bootstrap_execution_authorized: false
store_directory_created: false
store_identity_created: false
nonce_claimed: false
receipt_created: false
governance_filesystem_effects: 0
native_reads: 0
native_writes: 0

rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```
