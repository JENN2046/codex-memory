# CM-2107 Identity-bound Tombstone Execution Packet

```yaml
packet_does_not_authorize_execution: true
rollback_model: append_only_logical_tombstone
original_record_preserved: true
physical_delete_allowed: false
in_place_overwrite_allowed: false

max_tombstone_writes: 1
max_verify_operations: 1
max_retries: 0
max_supersede_operations: 0
max_compensation_operations: 0
```

Packet 精确绑定 CM-2106 R1 write receipt、327-byte 原记录、524-byte tombstone marker、
identity-bound store、新 nonce/receipt/registry，以及 marker-aware lifecycle projection。

本 packet 不证明默认产品检索已经具备 tombstone awareness，也不授权执行；仍需精确
final-release decision。
