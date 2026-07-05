# CM-1974 Live/Runtime Entry Preflight

Task id: `CM-1974`

Validation id: `CMV-2077`

Date: 2026-07-05

Status: `COMPLETED_VALIDATED_LIVE_RUNTIME_ENTRY_PREFLIGHT_NON_AUTHORIZING_NO_LIVE_NO_READINESS`

## Purpose

CM-1974 reopens the live/runtime question after CM-1973 closed the local-safe
plan-package route.

It is a preflight only. It selects the safest next live/runtime entry route and
defines what a later exact boundary must cover. It does not grant approval,
generate an approval packet, generate an approval request, generate an approval
line, generate or submit a request body, execute runtime, call VCPToolBox, read
memory, write memory, read raw diagnostics, or claim readiness.

## Reviewed Evidence

| Evidence | Preflight finding |
|---|---|
| CM-1973 | local-safe plan-package route is closed; live/runtime and RC work remain blocked |
| CM-1965 | disposable-target request/read-shape branch is optional future live route, not a prerequisite for M9-M15 local closure |
| CM-1964 | local low-disclosure executor/receipt projection layer exists for injected transport |
| CM-1963 | disposable-target resolver/transport boundary contract exists with raw diagnostic authority scoped to disposable target only |
| CM-1959 | component/action request/read-shape preparation contract exists |
| CM-1956 through CM-1957 | prior component/action route status is status-only `client_error`, not action success |

No live runtime output, endpoint value, locator value, request body, response
body, raw error payload, raw log, env value, secret, raw memory, raw store, raw
audit row, provider payload, process identity, or command line was read or
persisted for CM-1974.

## Preflight Decision

The next live/runtime entry should use the disposable-target route prepared by
CM-1963 and CM-1964 unless Jenn later supplies a different exact boundary.

```yaml
cm1974_live_runtime_entry_preflight:
  cm1973_local_safe_closeout_consumed: true
  cm1963_disposable_target_boundary_available: true
  cm1964_low_disclosure_executor_available: true
  cm1965_optional_future_probe_route_preserved: true
  selected_next_live_candidate: disposable_target_component_action_request_read_shape_probe
  selected_target_reference_name: operator-vcp-toolbox-service-ref
  selected_component: KnowledgeBaseManager
  selected_action: knowledge_base.search
  selected_request_body_shape_category: minimal_component_action_route_status_payload_category_only
  selected_query_boundary_category: neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan
  selected_receipt_mode: low_disclosure_with_raw_diagnostic_usage_flag_no_raw_value_persistence
  exact_approval_required_before_execution: true
  approval_packet_created: false
  approval_request_created: false
  approval_line_generated: false
  live_execution_authorized_now: false
  live_execution_performed: false
  runtime_call_performed: false
  network_call_performed: false
  vcp_toolbox_called: false
  read_shape_unlocked: false
  readiness_claimed: false
```

## Required Future Exact Boundary

A later exact live/runtime approval must be current, explicit, and no broader
than the disposable-target boundary unless Jenn chooses a different route.

Required future fields:

- purpose: disposable-target component/action request/read-shape probe;
- target reference name only, not endpoint or locator output;
- component and action identifiers;
- confirmation that the target is disposable/new target scoped and contains no
  Jenn private information, production secrets, customer data, or real private
  memory;
- allowed resolver/transport path family;
- whether target-scoped raw diagnostics may be inspected transiently;
- strict rule that raw values must not be committed into source/docs/status;
- max resolver attempts;
- max component/action request/read-shape attempts;
- max network and runtime calls;
- max process-state inspections and listener rechecks;
- max service start/ensure, stop, and restart attempts;
- max result count;
- local repair budget, if any;
- response handling and low-disclosure receipt projection;
- abort conditions;
- zero write, zero provider, zero dependency, zero public MCP expansion, zero
  VCPToolBox core modification, zero push/tag/release/deploy/cutover, and zero
  readiness rules.

CM-1974 does not fill those future exact values. It only records the required
boundary families.

## Candidate Budget Ceiling

The existing CM-1963/CM-1964 local contracts support at most this future ceiling
if Jenn approves it exactly:

```yaml
candidate_budget_ceiling:
  max_resolver_attempts: 3
  max_component_action_request_read_shape_attempts: 2
  max_network_calls: 3
  max_runtime_calls: 3
  max_process_state_inspections: 3
  max_listener_recheck_attempts: 3
  max_service_start_or_ensure_attempts: 1
  max_service_stop_attempts: 1
  max_service_restart_attempts: 0
  max_local_repair_files: 3
  max_validation_runs: 3
  max_retries_after_transient_failure: 1
  max_result_count: 1
```

These are ceilings, not authorization. A future exact approval may choose lower
budgets. CM-1974 consumes none of these budgets.

## Non-Actions

CM-1974 performs no live call, network call, runtime call, VCPToolBox call,
component/action probe, workflow execution, fallback runtime execution,
dashboard execution, runtime health report acceptance, RC gate report creation,
approval packet creation, approval request creation/submission, approval line
generation/output/persistence/submission, request body generation/output/
persistence/submission, response body read, raw error read, response shape
inspection, real query, private runtime read, raw store scan, raw audit row
read, broad memory scan, process-state inspection, listener recheck, service
start/stop/restart, endpoint/locator disclosure, config/env/secret/log/stdout/
stderr read, MCP memory tool call, memory read, memory write, memory update,
memory supersede, memory tombstone, checkpoint memory write, handoff memory
write, durable write, provider/API call, dependency change, public MCP
expansion, VCPToolBox core modification, push, tag, release, deploy, cutover,
readiness claim, M15 unlock, RC gate unlock, complete V8 claim, full bridge
completion claim, or `RC_READY` claim.

## Validation

CM-1974 is docs/status/governance preflight. It may revalidate the existing
CM-1963/CM-1964 local source/test contracts, but it must not execute runtime.

Required local validation:

```text
node --check src/core/VcpNativeDisposableTargetResolverTransportBoundaryContract.js
node --check tests/vcp-native-disposable-target-resolver-transport-boundary-contract.test.js
node --check src/core/VcpNativeDisposableTargetRequestReadShapeProbeExecutor.js
node --check tests/vcp-native-disposable-target-request-read-shape-probe-executor.test.js
node --test tests/vcp-native-disposable-target-resolver-transport-boundary-contract.test.js
node --test tests/vcp-native-disposable-target-request-read-shape-probe-executor.test.js
git diff --check
bash scripts/validate-local.sh docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted secret/raw-output/readiness scan over changed files
changed-scope re-review
```

## Receipt

```yaml
task_id: CM-1974
phase: live_runtime_entry_preflight
route_decision: disposable_target_live_runtime_candidate_selected_for_future_exact_boundary
cm1973_consumed: true
cm1963_boundary_available: true
cm1964_executor_available: true
cm1965_optional_future_probe_route_preserved: true
approval_packet_created: false
approval_request_created: false
approval_line_generated: false
approval_granted: false
request_body_generated: false
request_body_submitted: false
live_execution_authorized_now: false
live_call_performed: false
runtime_call_performed: false
network_call_performed: false
vcp_toolbox_called: false
response_body_read: false
response_shape_inspected: false
raw_error_payload_read: false
endpoint_disclosed: false
locator_value_disclosed: false
config_env_read: false
secret_read: false
log_read: false
stdout_stderr_read: false
raw_memory_read: false
raw_store_read: false
raw_audit_read: false
mcp_memory_tool_called: false
memory_read: false
memory_written: false
durable_write: false
provider_api_call: false
dependency_change: false
public_mcp_expansion: false
vcp_toolbox_core_modified: false
push_performed: false
tag_release_deploy_cutover_performed: false
read_shape_unlocked: false
m15_unlocked: false
readiness_claimed: false
rc_ready_claimed: false
complete_v8_claimed: false
full_bridge_completion_claimed: false
next_route: cm1975_exact_live_runtime_boundary_packet_or_jenn_supplied_exact_approval
```

## Next Route

Next route:

```text
CM-1975 exact live/runtime boundary packet or Jenn-supplied exact approval intake
```

CM-1975 must remain non-authorizing unless Jenn supplies a current exact
approval. It may prepare a boundary packet or intake Jenn's exact approval, but
it must not execute runtime, generate approval lines, print or persist raw
diagnostic values, write memory, mutate durable stores, expand public MCP, push,
release, deploy, cut over, or claim readiness without the exact boundary.
