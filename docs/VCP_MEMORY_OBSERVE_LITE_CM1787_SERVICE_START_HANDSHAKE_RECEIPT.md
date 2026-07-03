# VCP Memory Observe-Lite CM1787 Service Start Handshake Receipt

Task id: `M6-OBSERVE-LITE-SERVICE-START-HANDSHAKE`
Implementation slice: `CM-1787`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1786_OPERATOR_TARGET_LOCATOR_RECEIPT.md`
Evidence type: `service-start-attempt`, `status-only-probe`,
`low-disclosure`, `no-memory-result`, `no-approval-line`

## Authorization Boundary

Jenn authorized CM-1787 in the live thread after the CM-1786 target locator
bound the sanitized VCPToolBox checkout target but found the service transport
unreachable.

This receipt records only sanitized aliases, booleans, counts, durations, and
status/error classes. It does not disclose the supplied path value, endpoint
value, command arguments, process names, stdout/stderr, logs, exit code,
response bodies, secrets, config, raw runtime output, raw store data, or memory
content.

## Actions Performed

| Action | Count | Output disclosure | Result |
|---|---:|---|---|
| Operator startup command execution | `1` process | command alias only; no args/path | executed once |
| Service stdout/stderr handling | `1` process | no output read or persisted | discarded to null |
| Local observe-lite status-only probes | `3` HTTP probes | error class only; response body discarded | connection refused |
| Process cleanup | `1` stop signal | no process args or logs | child exit observed |

## Low-Disclosure Results

```yaml
cm1787_service_start_handshake:
  profile: observe-lite
  service_start_attempted: true
  process_count_started_by_agent: 1
  start_command_alias: operator_supplied_node_server_js
  service_stdout_read: false
  service_stderr_read: false
  service_log_persisted: false
  endpoint_value_included: false
  probe_count: 3
  probe_route_values_included: false
  reachable: false
  status_classes: []
  error_classes:
    - connection_refused
  response_body_included: false
  stop_signal_sent: true
  child_exit_observed: true
  child_exit_code_included: false
  persistent_process_left_running: false
  duration_seconds: 12
  max_runtime_probe_minutes: 10
  live_vcp_toolbox_called: false
  live_target_proof_executed: false
  m6_live_proof_complete: false
  next_action: diagnose_startup_failure_without_logs_or_request_log_read_boundary
```

## Boundary Ledger

```yaml
cm1787_boundary_ledger:
  low_disclosure: true
  target_locator_values_included: false
  path_values_included: false
  endpoint_values_included: false
  command_args_included: false
  process_names_included: false
  service_stdout_read: false
  service_stderr_read: false
  service_logs_persisted: false
  child_exit_code_included: false
  response_body_included: false
  agent_config_env_read: false
  agent_env_file_read: false
  agent_secret_read: false
  raw_runtime_response_read: false
  raw_memory_read: false
  raw_store_read: false
  memory_result_returned: false
  memory_read_performed: false
  memory_write_performed: false
  durable_memory_write_performed: false
  durable_audit_write_performed: false
  provider_api_called: false
  mcp_memory_tool_called: false
  public_mcp_expansion_performed: false
  config_startup_watchdog_changed: false
  dependency_action_performed: false
  runtime_persistent_mutation_performed: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  m6_live_proof_complete: false
  m15_unlocked: false
  full_bridge_completion_claimed: false
```

## Decision

CM-1787 attempted the operator-provided service start once and kept runtime
output fully non-observed. The service did not become reachable during the
allowed observe-lite window: all three status-only probes returned
`connection_refused`, and no response body was read.

This does not complete M6 live target/handshake proof. It does not unlock M7,
M8, M15, RC review, release, deploy, cutover, or readiness.

Next required boundary: startup failure diagnosis that either remains
no-log/no-secret and source-only, or asks Jenn for an exact low-disclosure log
read boundary if runtime logs are needed.
