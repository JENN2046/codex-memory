# CM-2106-R1 Identity-bound Synthetic Record Execution Packet

```yaml
packet_does_not_authorize_execution: true
implementation_commit: "40068a70fe4a04f54a2e24b04c70e11a7099f6fa"
strict_bridge_fixture_passed: true
prior_attempt_reconciled_as_no_write: true
prior_authorization_replay_allowed: false

max_native_writes: 1
max_verify_operations: 1
max_rollback_or_compensation_operations: 0
provider_calls_allowed: false
derived_index_writes_allowed: false
```

R1 使用新的 nonce、receipt、registry 和 app-state reference；冻结的 strict-bridge fixture
已经走通 `record_memory → local HTTP MCP → primary-write-only shim → audit receipt`。
Packet 自身仍不可执行。
