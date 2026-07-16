# CM-2103-R1 Bootstrap Claim Atomicity and Ambiguous Receipt Repair

本文件记录独立审查决定
`CM-2103-ER-20260711-CHANGES-REQUIRED-CLAIM-AMBIGUITY-RECEIPT-INCOMPLETE-D9D896AC`。

审查接受 decision intake、Git/runtime 绑定、governance/store-root 派生和 store effect
前消费设计，但要求修复 claim 部分落盘、三值未知语义、失败回执合同和真实隔离文件系统
故障注入测试。

## 允许的修订

```yaml
task: "CM-2103-R1"
claim_atomicity_repair: true
three_value_receipt_repair: true
receipt_union_contract: true
isolated_temp_filesystem_fault_injection_tests: true
implementation_and_packet_refreeze: true
```

## 当前硬停线

```yaml
bootstrap_execution_authorized: false
store_directory_creation_authorized: false
store_identity_creation_authorized: false
identity_readback_authorized: false
empty_store_preflight_authorized: false
record_memory_authorized: false
tombstone_memory_authorized: false
verify_authorized: false

rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```

隔离临时目录测试只属于 synthetic fixture 验证，不得连接或替代真实 Git common-dir
治理根及 Route B 目标 store。
