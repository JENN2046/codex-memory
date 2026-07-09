# VCP Memory Plan Package CM1908 Exact Live Runtime Authorization Request Exact-Material Readiness Blocked Fixture Contract

Task id: `CM-1908-EXACT-LIVE-RUNTIME-AUTHORIZATION-REQUEST-EXACT-MATERIAL-READINESS-BLOCKED-FIXTURE-CONTRACT`
Implementation slice: `CM-1908`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_PLAN_PACKAGE_CM1907_EXACT_LIVE_RUNTIME_AUTHORIZATION_REQUEST_EXACT_MATERIAL_READINESS_BLOCKED_PRECONDITION_REFRESH.md`
Evidence type: `source-test-fixture`, `fixture-only`, `schema-only`,
`exact-material-readiness-blocked`, `non-authorizing`, `no-runtime`,
`no-memory-read`, `no-memory-write`, `no-request-packet`,
`no-request-body`, `no-approval-line`, `no-config-change`, `no-release`,
`no-readiness`

## Purpose

CM-1908 adds a pure local fixture contract for the blocked exact-material
readiness state recorded in CM-1907.

The contract validates that exact-material category boundary evidence remains
blocked before authorization request readiness until concrete exact values,
request artifacts, request body authority, approval-line authority, runtime
authority, memory authority, and config authority are separately supplied and
authorized.

CM-1908 does not bind concrete exact values, create authorization requests,
create approval request packets, create request packets, assemble requests,
generate request bodies, generate approval lines, authorize runtime, read or
write memory, change config/startup/watchdog settings, or claim readiness.

## Added Files

| File | Role |
|---|---|
| `src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract.js` | pure local validator for blocked exact-material readiness fixtures |
| `tests/vcp-memory-exact-live-runtime-authorization-request-exact-material-readiness-blocked-contract.test.js` | focused fixture coverage for accept/incomplete/stop/no-echo/counter/vocabulary behavior |

## Contract Behavior

Accepted fixtures must:

- use schema version `1`;
- use contract version
  `vcp_memory_exact_live_runtime_authorization_request_exact_material_readiness_blocked_v1`;
- use a fixture id with prefix
  `cm1908_fixture_exact_live_runtime_authorization_request_exact_material_readiness_blocked_`;
- declare CM-1904, CM-1905, CM-1906, CM-1907, and CMV-2010 evidence present;
- declare that exact-material boundary evidence and fixture closeout are not
  authorization request readiness;
- declare that exact-material categories are not concrete exact values;
- keep exact-material readiness and authorization request readiness blocked;
- keep all concrete exact value fields unbound;
- keep authorization request, approval request packet, request packet, request
  body, approval line, runtime, memory, config, provider, public MCP, release,
  deploy, cutover, push, and readiness authority false;
- expose only a low-disclosure category-level projection;
- keep every side-effect counter at zero.

The validator computes:

```yaml
accepted_decision: exact_material_readiness_blocked_missing_concrete_authorization_request_material
incomplete_decision: exact_material_readiness_incomplete
l4_stop_decision: stop_l4
```

## L4 Stop Conditions

The fixture returns `stop_l4` when it tries to turn blocked readiness into any
of these live or authority-bearing actions:

- exact value binding;
- authorization request creation, readiness, or submission;
- approval request packet creation, readiness, or submission;
- request packet creation, rendering, storage, or submission;
- request assembly;
- request body generation or submission;
- approval-line generation, exposure, or submission;
- runtime execution;
- VCPToolBox runtime call;
- MCP memory tool call;
- response body, runtime log, stdout, stderr, config/env, secret, raw private
  memory, raw store, raw audit row, or real query read;
- memory write or durable write;
- provider/API call;
- config/startup/watchdog change;
- public MCP expansion;
- push/tag/release/deploy/cutover;
- readiness, `RC_READY`, release-ready, production-ready, cutover-ready,
  complete V8, or full bridge completion claim.

## No-Echo Guard

The fixture rejects forbidden raw/private/exact/request/approval/runtime/memory
or config fields without echoing submitted values. This includes concrete exact
values, authorization request material, approval request packet material,
request packet material, request body material, approval-line material, runtime
commands, memory payloads, provider payloads, config changes, and readiness
overclaims.

## Decision

```yaml
cm1908_exact_live_runtime_authorization_request_exact_material_readiness_blocked_fixture_contract:
  source_added: true
  tests_added: true
  fixture_contract_added: true
  cm1907_precondition_refresh_accepted_for_planning: true
  exact_material_readiness_blocked_fixture_contract_accepts_blocked_state: true
  exact_material_readiness_blocked_fixture_contract_reports_incomplete_evidence: true
  exact_material_readiness_blocked_fixture_contract_rejects_l4_expansion: true
  exact_material_readiness_blocked_fixture_contract_rejects_raw_private_exact_material_request_approval_runtime_memory_or_config_values: true
  exact_material_readiness_blocked_fixture_contract_rejects_positive_side_effect_counters: true
  targeted_tests: 8
  targeted_pass: 8
  exact_material_boundary_evidence_is_authorization_request_readiness: false
  exact_material_fixture_closeout_is_authorization_request_readiness: false
  exact_material_categories_are_concrete_values: false
  exact_material_readiness_may_open: false
  exact_material_readiness_blocked: true
  authorization_request_readiness_may_open: false
  authorization_request_readiness_blocked: true
  exact_material_values_bound: false
  concrete_exact_values_allowed: false
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
  next_safe_route: cm1909_exact_live_runtime_authorization_request_exact_material_readiness_blocked_fixture_closeout_gate_review
```

## Validation

Required validation for CM-1908:

```text
node --check src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract.js
node --check tests/vcp-memory-exact-live-runtime-authorization-request-exact-material-readiness-blocked-contract.test.js
node --test tests/vcp-memory-exact-live-runtime-authorization-request-exact-material-readiness-blocked-contract.test.js
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

## CM-1908 Conclusion

CM-1908 adds only a pure local fixture contract for the blocked exact-material
readiness state. It does not make authorization request readiness true and does
not authorize runtime, memory, config, approval-line, request body, release,
deployment, cutover, push, or readiness work.

The next local-safe route is CM-1909 exact live runtime authorization request
exact-material readiness blocked fixture closeout gate review.
