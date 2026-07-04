# VCP Memory Plan Package CM1905 Exact Live Runtime Authorization Request Exact-Material Boundary Fixture Contract

Task id: `CM-1905-EXACT-LIVE-RUNTIME-AUTHORIZATION-REQUEST-EXACT-MATERIAL-BOUNDARY-FIXTURE-CONTRACT`
Implementation slice: `CM-1905`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_PLAN_PACKAGE_CM1904_EXACT_LIVE_RUNTIME_AUTHORIZATION_REQUEST_EXACT_MATERIAL_BOUNDARY_PREFLIGHT.md`
Evidence type: `source-test-fixture`, `fixture-only`,
`exact-material-categories-only`, `non-authorizing`, `no-runtime`,
`no-memory-read`, `no-memory-write`, `no-request-packet`,
`no-request-body`, `no-approval-line`, `no-config-change`, `no-release`,
`no-readiness`

## Purpose

CM-1905 turns the CM-1904 exact-material category boundary into a pure local
fixture contract.

The contract validates only that the future exact material families have been
declared and that every concrete value remains absent. It does not create,
render, store, or submit an authorization request, request packet, request
body, approval request packet, or approval line.

## Added Local Surfaces

| File | Purpose |
|---|---|
| `src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract.js` | local fail-closed fixture contract for category-only exact material boundary |
| `tests/vcp-memory-exact-live-runtime-authorization-request-exact-material-boundary-contract.test.js` | targeted coverage for accept, incomplete, L4 stop, no-echo, counters, invalid shape, mismatch, and vocabulary |

These files do not call VCPToolBox, MCP memory tools, providers, APIs, runtime
services, config, logs, raw stores, or real memory.

## Contract Behavior

The helper accepts only a fixture whose decision is:

```text
exact_material_boundary_accepted_categories_only_no_values
```

It reports incomplete evidence, missing material family declarations, missing
CM-1904 preflight review, or missing authority declarations as:

```text
exact_material_boundary_incomplete
```

It routes any expansion toward concrete exact value binding, authorization
request creation/readiness/submission, approval request packet
creation/submission, request packet creation/rendering/storage/submission,
request assembly, request body generation/submission, approval-line handling,
runtime, memory, provider, config, remote actions, live gate opening, or
readiness claims to:

```text
stop_l4
```

It rejects raw/private/exact material, request, approval, runtime, memory,
config, secret, provider, and readiness fields without echoing submitted
values.

It requires all side-effect counters to exist and be exactly zero.

## Required Material Families

```yaml
cm1905_required_material_families:
  request_identity_family_declared: true
  target_alias_family_declared: true
  transport_family_declared: true
  principal_tuple_family_declared: true
  operation_family_declared: true
  runtime_budget_family_declared: true
  output_policy_family_declared: true
  memory_policy_family_declared: true
  config_policy_family_declared: true
  provider_policy_family_declared: true
  cleanup_policy_family_declared: true
  receipt_path_class_family_declared: true
  validation_command_class_family_declared: true
  abort_condition_family_declared: true
```

## Required Zero Side Effects

```yaml
exact_material_values_bound: false
request_identity_value_bound: false
target_alias_value_bound: false
transport_endpoint_value_bound: false
principal_tuple_value_bound: false
operation_payload_value_bound: false
runtime_budget_value_bound: false
output_policy_value_bound: false
memory_policy_value_bound: false
config_policy_value_bound: false
provider_policy_value_bound: false
cleanup_policy_value_bound: false
receipt_path_value_bound: false
validation_command_values_bound: false
abort_condition_values_bound: false
authorization_gate_opened: false
authorization_requested: false
authorization_request_created: false
authorization_request_ready: false
authorization_request_submitted: false
approval_request_packet_created: false
approval_request_packet_ready: false
approval_request_submitted: false
request_packet_created: false
request_packet_rendered: false
request_packet_stored: false
request_packet_submitted: false
request_body_generated: false
request_body_submitted: false
approval_line_generated: false
approval_line_exposed: false
approval_line_submitted: false
runtime_execution_authorized: false
runtime_executed: false
vcp_toolbox_runtime_called: false
mcp_memory_tool_called: false
response_body_read: false
runtime_log_read: false
stdout_read: false
stderr_read: false
config_env_content_read: false
secrets_read: false
private_runtime_read_performed: false
raw_store_read_performed: false
raw_audit_row_read_performed: false
real_query_performed: false
provider_api_called_by_agent: false
memory_read_performed_by_agent: false
memory_write_performed: false
durable_audit_write_performed: false
durable_memory_write_performed: false
config_changed: false
startup_changed: false
watchdog_changed: false
public_mcp_expansion_performed: false
push_performed: false
tag_performed: false
release_performed: false
deploy_performed: false
cutover_performed: false
readiness_claimed: false
rc_ready_claimed: false
release_ready_claimed: false
production_ready_claimed: false
cutover_ready_claimed: false
complete_v8_claimed: false
full_bridge_completion_claimed: false
next_gate_may_open_live: false
```

## Validation

Required validation for CM-1905:

```text
node --check src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract.js
node --check tests/vcp-memory-exact-live-runtime-authorization-request-exact-material-boundary-contract.test.js
node --test tests/vcp-memory-exact-live-runtime-authorization-request-exact-material-boundary-contract.test.js
npm test
git diff --check
bash scripts/validate-local.sh docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
secret/readiness/output scans
source-safety scan
changed-scope re-review
```

Observed results:

```text
node --check source: pass
node --check test: pass
Targeted CM-1905 fixture test: 8/8 passed
Default npm test: 3923/3923 passed
Docs validation: passed
Current facts drift validation: passed
Autopilot ledger consistency validation: passed
Secret/readiness/output scans: passed with expected deny-list vocabulary only
Source-safety scan: passed
Changed-scope re-review: no actionable findings in changed scope
```

## CM-1905 Conclusion

CM-1905 adds local source/test fixture coverage for the exact-material
category-only authorization request boundary. It does not bind concrete exact
values, create, render, store, or submit an authorization request, approval
request packet, request packet, request body, or approval line. It does not
authorize or execute runtime, read/write memory, change configuration, call
providers/APIs, push, release, deploy, cut over, or claim readiness.

The next local-safe route is CM-1906 exact live runtime authorization request
exact-material boundary fixture closeout gate review.
