# CM-2103-R2 Durable Claim Re-entry and Persistence-Unknown Receipt Repair

本文件记录独立审查决定
`CM-2103-R1-ER-20260711-CHANGES-REQUIRED-DURABLE-REENTRY-INCOMPLETE-175ECE43`。

审查接受 R1 的 atomic claim envelope、store effect 三值语义和 receipt union，但要求补齐
新进程对 existing / nonterminal / corrupt envelope 的低披露重入证据，以及治理文件系统
副作用的三值表达。

## 允许的修订

```yaml
task: "CM-2103-R2"
durable_existing_claim_reentry_projection: true
terminal_and_nonterminal_receipt_reconstruction: true
corrupt_envelope_low_disclosure_evidence: true
governance_filesystem_effect_presence_tristate: true
isolated_reentry_and_persistence_unknown_tests: true
implementation_and_packet_refreeze: true
```

## 重入硬边界

```yaml
reentry_may_replay_bootstrap: false
reentry_may_create_store_effects: false
reentry_may_retry: false
reentry_may_cleanup: false
raw_envelope_output_allowed: false

bootstrap_execution_authorized: false
store_directory_creation_authorized: false
store_identity_creation_authorized: false
empty_store_preflight_authorized: false
record_memory_authorized: false
tombstone_memory_authorized: false
verify_authorized: false
```

所有进程重入测试只允许使用 OS temporary synthetic fixture，不得读取或写入真实 Git
common-dir 治理目录及 Route B 目标 store。
