# VCP Memory Observe-Lite CM1786 Operator Target Locator Receipt

Task id: `M6-OBSERVE-LITE-OPERATOR-TARGET-LOCATOR`
Implementation slice: `CM-1786`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1785_LIVE_TARGET_PREFLIGHT_RECEIPT.md`
Evidence type: `operator-target-locator`, `read-only`, `no-write`,
`low-disclosure`, `no-memory-result`, `no-approval-line`

## Operator Input Boundary

Jenn supplied the VCPToolBox project root, local endpoint, and startup command in
the live thread after CM-1785 found no target.

This receipt records only sanitized aliases, booleans, counts, and status/error
classes. It does not disclose the supplied path value, endpoint value, command
arguments, process names, package script values, dependency names, response
bodies, secrets, config, raw runtime output, raw store data, or memory content.

## Locator Actions Performed

| Action | Count | Output disclosure | Result |
|---|---:|---|---|
| Operator root alias metadata check | `1` target | alias and booleans only | root present |
| Entrypoint alias metadata check | `1` file | alias and booleans only | entrypoint present |
| Package metadata summary | `1` file | booleans only; no scripts/dependencies | package metadata present |
| Local observe-lite handshake status probe | `1` local HTTP status-only probe | status/error class only; response body discarded | connection refused |
| Startup command handling | `1` operator-supplied command alias | alias only | not executed |
| Locator contract projection | `1` helper run | accepted/sanitized summary only | accepted; one sanitized target found |
| Live proof packet projection | `1` helper run | action-plan summary only | accepted as plan only; runtime execution not authorized by helper |

## Low-Disclosure Results

```yaml
cm1786_operator_target_locator:
  profile: observe-lite
  operator_target_input_present: true
  root_alias: operator_vcptoolbox_root
  service_alias: operator_vcptoolbox_local_6005
  entrypoint_alias: operator_vcptoolbox_server_js
  start_command_alias: operator_supplied_node_server_js
  root_observed_present: true
  package_json_observed_present: true
  entrypoint_observed_present: true
  package_json_read: true
  package_name_present: true
  package_version_present: true
  package_main_present: true
  package_start_script_present: true
  package_script_values_included: false
  dependency_names_included: false
  start_command_executed: false
  local_handshake_probe_count: 1
  local_handshake_reachable: false
  local_handshake_error_class: connection_refused
  response_body_included: false
  locator_contract_projection_accepted: true
  locator_no_target_found: false
  locator_accepted_target_count: 1
  locator_found_target_count: 1
  locator_sanitized_target_count: 2
  proof_packet_projection_accepted: true
  proof_packet_action_plan_only: true
  proof_packet_runtime_execution_allowed_by_helper: false
  live_vcp_toolbox_called: false
  live_target_proof_executed: false
  m6_live_proof_complete: false
  next_action: request_exact_start_service_or_live_handshake_boundary
```

## Boundary Ledger

```yaml
cm1786_boundary_ledger:
  read_only: true
  no_write: true
  low_disclosure: true
  target_locator_values_included: false
  path_values_included: false
  endpoint_values_included: false
  command_args_included: false
  process_names_included: false
  response_body_included: false
  package_script_values_included: false
  dependency_names_included: false
  config_env_read: false
  env_file_read: false
  secret_read: false
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
  startup_command_executed: false
  runtime_mutation_performed: false
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

CM-1786 improves the M6 state from no target found to sanitized operator target
bound. The local checkout alias is present, the declared entrypoint exists, and
package metadata is present. The service transport is not live: the status-only
handshake probe returned `connection_refused`, and the startup command was not
executed.

This does not complete M6 live target/handshake proof. It does not unlock M7,
M8, M15, RC review, release, deploy, cutover, or readiness.

Next required boundary: exact approval for starting or otherwise reaching the
operator-provided VCPToolBox service in observe-lite mode, still with no memory
read/write, no secrets/config/raw memory, no provider/API, no public MCP
expansion, and no readiness claim.
