# VCP Memory Plan Package CM1904 Exact Live Runtime Authorization Request Exact Material Boundary Preflight

Task id: `CM-1904-EXACT-LIVE-RUNTIME-AUTHORIZATION-REQUEST-EXACT-MATERIAL-BOUNDARY-PREFLIGHT`
Implementation slice: `CM-1904`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_PLAN_PACKAGE_CM1903_EXACT_LIVE_RUNTIME_AUTHORIZATION_REQUEST_READINESS_BLOCKED_FIXTURE_CLOSEOUT_GATE_REVIEW.md`
Evidence type: `docs-only`, `boundary-preflight`,
`exact-material-categories-only`, `non-authorizing`, `no-runtime`,
`no-memory-read`, `no-memory-write`, `no-request-packet`,
`no-request-body`, `no-approval-line`, `no-config-change`, `no-release`,
`no-readiness`

## Purpose

CM-1904 defines the category-only boundary for future exact material needed
before any exact live runtime authorization request can become ready.

This is not the material itself. It names required material families and keeps
all concrete values absent. It does not create, render, store, or submit an
authorization request, request packet, request body, approval request packet, or
approval line.

## Reviewed Basis

| Source | Use |
|---|---|
| `docs/VCP_MEMORY_PLAN_PACKAGE_CM1901_EXACT_LIVE_RUNTIME_AUTHORIZATION_REQUEST_READINESS_BLOCKED_PRECONDITION_REFRESH.md` | missing exact material list |
| `src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestReadinessBlockedContract.js` | fail-closed blocked-readiness contract |
| `tests/vcp-memory-exact-live-runtime-authorization-request-readiness-blocked-contract.test.js` | zero-side-effect and L4-stop coverage |
| `docs/VCP_MEMORY_PLAN_PACKAGE_CM1902_EXACT_LIVE_RUNTIME_AUTHORIZATION_REQUEST_READINESS_BLOCKED_FIXTURE_CONTRACT.md` | fixture receipt |
| `docs/VCP_MEMORY_PLAN_PACKAGE_CM1903_EXACT_LIVE_RUNTIME_AUTHORIZATION_REQUEST_READINESS_BLOCKED_FIXTURE_CLOSEOUT_GATE_REVIEW.md` | local slice closeout and next boundary |

No runtime logs, config/env values, secrets, raw memory, raw runtime payloads,
raw stores, raw audit rows, provider payloads, approval-line values, live
request bodies, real request packets, real authorization requests, real exact
target values, real endpoints, real queries, live response bodies, or
executable approval text were used.

## Exact Material Families

Future exact material must remain absent until a separate authorized task
explicitly permits binding concrete values. The categories are:

| Material family | Boundary meaning | Current status |
|---|---|---|
| request identity | stable id/hash family for a future request | absent |
| target alias | sanitized VCPToolBox/runtime target reference class | absent |
| transport family | local HTTP/process/CLI family class, not endpoint value | absent |
| principal tuple | client/workspace/owner/visibility aliases | absent |
| operation family | observe/read/write/config class and exact operation class | absent |
| runtime budget | duration/call/output ceilings and abort criteria | absent |
| output policy | low-disclosure response/log/stdout/stderr classes | absent |
| memory policy | read/write/no-write class and raw/private restrictions | absent |
| config policy | config/startup/watchdog no-change/change class | absent |
| provider policy | provider/API allowed or forbidden class | absent |
| cleanup policy | cleanup/rollback receipt class | absent |
| receipt path class | allowed receipt artifact class, not a live path value | absent |
| validation command class | allowed validation command family, not execution | absent |
| abort conditions | fail-closed stop classes for any expansion | absent |

CM-1904 only records these families. It does not fill them.

## Boundary Decision

```yaml
cm1904_exact_live_runtime_authorization_request_exact_material_boundary_preflight:
  docs_only_boundary_preflight: true
  cm1903_closeout_accepted_for_planning: true
  exact_material_families_defined: true
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
  approval_granted: false
  dedicated_exact_approval_text_present: false
  approval_request_packet_created: false
  approval_request_packet_ready: false
  approval_request_submitted: false
  approval_packet_ready: false
  approval_request_ready: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_exposed: false
  approval_line_submitted: false
  request_packet_readiness_may_open: false
  request_packet_readiness_blocked: true
  exact_request_packet_ready: false
  exact_request_packet_present: false
  request_packet_created: false
  request_packet_rendered: false
  request_packet_stored: false
  request_packet_submitted: false
  request_assembly_allowed: false
  request_assembly_authorized: false
  assembled_request_generated: false
  concrete_exact_values_allowed: false
  live_values_bound: false
  request_body_generated: false
  request_body_submitted: false
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
  next_gate_allowed_only_as_fixture_contract: true
  next_safe_route: cm1905_exact_live_runtime_authorization_request_exact_material_boundary_fixture_contract
```

## Forbidden In This Slice

```yaml
cm1904_forbidden_actions:
  concrete_exact_value_binding: true
  authorization_request_creation: true
  authorization_request_submission: true
  approval_request_packet_creation: true
  approval_request_submission: true
  request_packet_creation: true
  request_packet_rendering: true
  request_packet_storage: true
  request_packet_submission: true
  request_body_generation: true
  request_body_submission: true
  approval_line_generation: true
  approval_line_exposure: true
  approval_line_submission: true
  runtime_execution: true
  live_vcp_toolbox_call: true
  mcp_memory_tool_call: true
  real_memory_read: true
  real_memory_write: true
  durable_write: true
  config_startup_watchdog_change: true
  provider_api_call: true
  public_mcp_expansion: true
  release_deploy_cutover_push: true
  readiness_claim: true
```

## Validation

Required validation for CM-1904:

```text
CM-1901 through CM-1903 review
node --check src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestReadinessBlockedContract.js
node --check tests/vcp-memory-exact-live-runtime-authorization-request-readiness-blocked-contract.test.js
node --test tests/vcp-memory-exact-live-runtime-authorization-request-readiness-blocked-contract.test.js
git diff --check
bash scripts/validate-local.sh docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
secret/readiness/output scans
changed-scope review
```

## CM-1904 Conclusion

CM-1904 records only the category-level boundary for future exact material. It
does not provide exact material, does not make authorization request readiness
true, and does not authorize runtime, memory, config, approval-line, request
body, release, deployment, cutover, push, or readiness work.

The next local-safe route is CM-1905 exact live runtime authorization request
exact-material boundary fixture contract.
