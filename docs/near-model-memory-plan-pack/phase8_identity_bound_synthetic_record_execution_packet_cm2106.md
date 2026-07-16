# CM-2106 Identity-bound Synthetic Record Execution Packet

```yaml
packet_does_not_authorize_execution: true
implementation_commit: "3bbe2f9bd2e2cc0103e8e0d2c1d65be8c4b9e98c"
preflight_receipt_accepted: true
store_identity_bound: true
primary_write_only: true

max_native_writes: 1
max_verify_operations: 1
max_rollback_or_compensation_operations: 0
provider_calls_allowed: false
derived_index_writes_allowed: false
```

Packet 精确绑定 CM-2105 空仓回执、327-byte synthetic Markdown、独立 nonce/receipt、
新的 registry、identity-bound store 和低披露 audit verify。Packet 自身不可执行，仍需
单独的 final execution release 决定。
