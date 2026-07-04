# VCP Memory Plan Package CM1873 Exact Live Runtime Approval Request Gap Fixture Contract

Task id: `CM-1873-EXACT-LIVE-RUNTIME-APPROVAL-REQUEST-GAP-FIXTURE-CONTRACT`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_PLAN_PACKAGE_CM1872_EXACT_LIVE_RUNTIME_APPROVAL_REQUEST_FIELD_GAP_PREFLIGHT.md`
Evidence type: `source-test-fixture-contract`, `approval_request_gap_fixture`,
`non-authorizing`, `no-runtime`, `no-request-body`, `no-approval-line`,
`no-release`, `no-readiness`

## Purpose

This change adds a pure local fixture contract for exact live runtime approval
request gap classification.

The helper validates only fixture/schema objects that classify missing exact
fields and missing authorities. It rejects concrete values, raw/private fields,
request bodies, approval-line material, runtime commands, memory queries,
memory writes, provider/API details, config/startup/watchdog changes, remote
actions, and readiness claims.

It does not fill live values. It does not create, render, store, or submit a
request body. It does not generate, expose, store, accept, or consume an
approval line. It does not authorize runtime, call VCPToolBox, call MCP memory
tools, read response bodies, read logs, read raw/private memory, write memory,
change configuration, release, deploy, cut over, push, or claim readiness.

## Files

- `src/core/VcpMemoryExactLiveRuntimeApprovalRequestGapContract.js`
- `tests/vcp-memory-exact-live-runtime-approval-request-gap-contract.test.js`

## Contract Behavior

The helper accepts only:

- `schemaVersion=1`,
- fixture id prefix `cm1873_fixture_exact_live_runtime_approval_request_gap_`,
- `profile=exact-live-runtime-approval-request`,
- `non_authorizing=true`,
- `gap_fixture_only=true`,
- complete CM-1871 / CM-1872 evidence references,
- complete missing-field classifications,
- all execution/approval/runtime/memory/provider/config/remote/readiness
  authority flags false,
- all side-effect counters exactly zero.

It returns `stop_l4` for attempted request assembly, request body generation,
approval-line handling, runtime execution, memory mutation, provider/API work,
config/startup/watchdog change, remote action, or readiness claim.

## Validation

Passed:

```text
node --check src/core/VcpMemoryExactLiveRuntimeApprovalRequestGapContract.js
node --check tests/vcp-memory-exact-live-runtime-approval-request-gap-contract.test.js
node --test tests/vcp-memory-exact-live-runtime-approval-request-gap-contract.test.js
npm test
```

Observed results:

- targeted tests: `8/8`
- default test suite: `3835/3835`

## Fixture Boundary Ledger

```yaml
cm1873_exact_live_runtime_approval_request_gap_fixture_contract:
  fixture_contract_added: true
  source_added: true
  tests_added: true
  cm1872_field_gap_preflight_reviewed: true
  targeted_tests_passed: true
  default_tests_passed: true
  request_gap_fixture_contract_accepts_blocked_inventory: true
  request_gap_fixture_contract_rejects_l4_expansion: true
  request_gap_fixture_contract_rejects_raw_private_or_exact_values: true
  request_gap_fixture_contract_rejects_positive_side_effect_counters: true
  suitable_for_request_assembly: false
  live_values_filled: false
  request_body_generated: false
  request_body_submitted: false
  approval_packet_ready: false
  approval_request_ready: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  runtime_authorized: false
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
  next_safe_route: cm1874_exact_live_runtime_approval_request_gap_fixture_closeout
```

## Conclusion

CM-1873 adds a source/test fixture contract for gap classification only. It
does not make any request packet ready, does not generate request material,
does not generate an approval line, does not execute runtime, and does not
claim readiness.
