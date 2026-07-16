# CM-2107 Identity-bound Tombstone Execution Receipt

```yaml
result: PASS
final_state: CONSUMED_SUCCESS
authorization_consumed: true
authorization_replay_allowed: false

tombstone_write_calls: 1
verify_operations: 1
verify_accepted: true

original_record_unchanged: true
durable_marker_bytes: 524
durable_marker_sha256: "f1aca618da2a51646c6b956270169556dfa142a482547003e000031e1c666a2d"
effective_lifecycle_status: tombstoned
rollback_lifecycle_projection_target_count: 0

provider_called: false
derived_index_write_performed: false
local_fallback_used: false
automatic_retry_performed: false
supersede_performed: false
compensation_performed: false
physical_delete_performed: false
```

同一个 identity-bound synthetic store 中，原 327-byte record 保持精确 SHA-256 不变，
新增一个精确 524-byte append-only tombstone marker。低披露 audit correlation 与专用
marker-aware lifecycle projection 均通过。

该证据只证明 rollback drill 专用 projection 中目标有效计数为 0；默认产品检索
tombstone-awareness 仍未证明。`rollbackDrillPassed` 需经单独 Completion Audit application
后才能改为 `true`。
