# VCP Memory Plan Package CM1875 Exact Live Runtime Approval Request Assembly Preflight Fixture Contract

Task id: `CM-1875-EXACT-LIVE-RUNTIME-APPROVAL-REQUEST-ASSEMBLY-PREFLIGHT-FIXTURE-CONTRACT`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_PLAN_PACKAGE_CM1874_EXACT_LIVE_RUNTIME_APPROVAL_REQUEST_GAP_FIXTURE_CLOSEOUT.md`
Evidence type: `source-test-fixture-contract`,
`approval_request_assembly_preflight_fixture`, `non-authorizing`,
`no-runtime`, `no-request-body`, `no-approval-line`, `no-release`,
`no-readiness`

## Purpose

This change adds a pure local fixture contract for exact live runtime approval
request assembly preflight.

The helper validates only fixture/schema objects that prove the CM-1874 gap
fixture closeout exists and that request assembly is still blocked by missing
exact live values and missing authority. It rejects concrete exact values,
assembled requests, request bodies, approval-line material, runtime commands,
memory queries, memory writes, provider/API details, config/startup/watchdog
changes, remote actions, and readiness claims.

It does not assemble a request. It does not create, render, store, or submit a
request body. It does not generate, expose, store, accept, or consume an
approval line. It does not authorize runtime, call VCPToolBox, call MCP memory
tools, read response bodies, read logs, read raw/private memory, write memory,
change configuration, release, deploy, cut over, push, or claim readiness.

## Files

- `src/core/VcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract.js`
- `tests/vcp-memory-exact-live-runtime-approval-request-assembly-preflight-contract.test.js`

## Contract Behavior

The helper accepts only:

- `schemaVersion=1`,
- fixture id prefix
  `cm1875_fixture_exact_live_runtime_approval_request_assembly_preflight_`,
- `profile=exact-live-runtime-approval-request-assembly`,
- `non_authorizing=true`,
- `assembly_preflight_only=true`,
- complete CM-1872 / CM-1873 / CM-1874 / CMV-1977 source references,
- closed gap fixture slice flags,
- all exact input binding flags false,
- all execution/approval/runtime/memory/provider/config/remote/readiness
  authorization flags false,
- all side-effect counters exactly zero.

It returns `stop_l4` for attempted exact value binding, request assembly,
assembled request disclosure, request body generation, approval-line handling,
runtime execution, memory mutation, provider/API work,
config/startup/watchdog change, remote action, or readiness claim.

## Validation

Passed:

```text
node --check src/core/VcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract.js
node --check tests/vcp-memory-exact-live-runtime-approval-request-assembly-preflight-contract.test.js
node --test tests/vcp-memory-exact-live-runtime-approval-request-assembly-preflight-contract.test.js
npm test
```

Observed results:

- targeted tests: `8/8`
- default test suite: `3843/3843`

## Fixture Boundary Ledger

```yaml
cm1875_exact_live_runtime_approval_request_assembly_preflight_fixture_contract:
  fixture_contract_added: true
  source_added: true
  tests_added: true
  cm1874_gap_fixture_closeout_reviewed: true
  targeted_tests_passed: true
  default_tests_passed: true
  assembly_preflight_fixture_contract_accepts_blocked_state: true
  assembly_preflight_fixture_contract_rejects_l4_expansion: true
  assembly_preflight_fixture_contract_rejects_raw_private_exact_or_request_values: true
  assembly_preflight_fixture_contract_rejects_positive_side_effect_counters: true
  request_assembly_preflight_may_start_next: true
  request_assembly_allowed: false
  live_values_bound: false
  assembled_request_generated: false
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
  next_safe_route: cm1876_exact_live_runtime_approval_request_assembly_preflight_closeout
```

## Conclusion

CM-1875 adds a source/test fixture contract for assembly preflight only. It
does not make any request packet ready, does not generate request material,
does not generate an approval line, does not execute runtime, and does not
claim readiness.
