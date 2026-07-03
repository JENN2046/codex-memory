# VCP Memory Fallback Local Memory M13 Lifecycle Filter Contract

Task id: `M13-K5-FALLBACK-LOCAL-MEMORY-LIFECYCLE-FILTER-CONTRACT`
Implementation slice: `CM-1768`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_SECRET_REJECTION_CONTRACT.md`
Evidence type: `source/test`, `fixture-only`, `schema contract`, `no-runtime`, `no-write`

## Purpose

This slice turns the M13 fallback lifecycle filter gap into an executable
fixture-only contract.

It does not execute local fallback, call VCPToolBox, call MCP memory tools,
read private runtime memory, scan lifecycle stores, import/export/migrate,
backfill lifecycle state, mutate lifecycle state, read raw stores, run a real
query, write memory, write durable audit/runtime state, call providers/APIs,
expand public MCP tools, push remote state, or claim readiness.

## Added Artifacts

- `src/core/VcpMemoryFallbackLocalMemoryLifecycleFilterContract.js`
- `tests/vcp-memory-fallback-local-memory-lifecycle-filter-contract.test.js`

## Contract Mode

```yaml
m13_fallback_lifecycle_filter_contract:
  contract_name: VcpMemoryFallbackLocalMemoryLifecycleFilterContract
  contract_mode: fixture_fallback_lifecycle_filter_contract_only
  schema_version: 1
  live_runtime_allowed: false
  local_fallback_execution_allowed: false
  private_runtime_read_allowed: false
  real_query_allowed: false
  mcp_tool_call_allowed: false
  memory_read_allowed: false
  memory_write_allowed: false
  memory_update_allowed: false
  memory_supersede_allowed: false
  memory_tombstone_allowed: false
  lifecycle_store_scan_allowed: false
  lifecycle_mutation_allowed: false
  migration_import_export_backfill_allowed: false
  durable_audit_write_allowed: false
  provider_api_allowed: false
  approval_request_allowed: false
  approval_line_generation_allowed: false
  readiness_claim_allowed: false
```

## Coverage

The targeted test covers:

- active local fallback fixture acceptance without runtime execution or
  lifecycle mutation;
- tombstoned, superseded, rejected, stale, and proposal-only candidates denied
  as active fallback results;
- inactive lifecycle low-disclosure status summary only when requested and
  allowed by fixture policy;
- inactive lifecycle status summary denial when summary policy is disabled;
- unknown lifecycle and missing scope fail-closed denial;
- lifecycle store scan, migration/backfill, and lifecycle mutation requests
  stopped as L4;
- raw private lifecycle metadata, replacement payload, and proposal payload
  stopped as L4;
- VCP-native lookalike fallback candidate rejection;
- decision mismatch rejection for inactive fallback leakage attempts;
- forbidden raw lifecycle, secret, approval, and readiness field rejection
  without echoing submitted values;
- missing, positive, and malformed side-effect counter rejection;
- non-boolean policy/request/candidate flag and non-string request id
  rejection;
- unexpected non-allowlisted field rejection without value echo;
- lifecycle filter vocabulary and side-effect posture locked.

## Current Result

```yaml
m13_fallback_lifecycle_filter_contract_result:
  contract_implemented: true
  targeted_test_count: 14
  targeted_test_passed: true
  fixture_lifecycle_filter_only: true
  active_fallback_fixture_accepted: true
  inactive_lifecycle_as_active_fallback_denied: true
  inactive_lifecycle_status_summary_allowed_when_requested: true
  inactive_lifecycle_status_summary_policy_denied: true
  unknown_lifecycle_denied: true
  missing_scope_denied: true
  lifecycle_store_scan_stop_l4: true
  migration_backfill_stop_l4: true
  lifecycle_mutation_stop_l4: true
  raw_lifecycle_payload_stop_l4: true
  vcp_native_lookalike_rejected: true
  unexpected_non_allowlisted_fields_rejected: true
  local_fallback_runtime_executed: false
  private_runtime_read_performed: false
  real_query_performed: false
  mcp_tool_called_for_m13_evidence: false
  memory_read_performed: false
  memory_write_performed: false
  memory_update_performed: false
  memory_supersede_performed: false
  memory_tombstone_performed: false
  lifecycle_store_scan_performed: false
  lifecycle_mutation_performed: false
  migration_import_export_backfill_performed: false
  durable_audit_write_performed: false
  durable_memory_write_performed: false
  provider_api_called: false
  approval_request_submitted: false
  approval_line_generated: false
  public_mcp_expansion_performed: false
  readiness_claimed: false
  fallback_governance_parity_green: false
```

## Remaining M13 Gaps

This contract does not complete M13. Remaining fixture gaps include:

- query-quality fallback dry-run tests;
- final fallback hardening report and blocked closeout.

## M13-K5 Conclusion

M13 now has executable fixture coverage for fallback lifecycle filtering.
Fallback governance parity is still not green, and runtime fallback remains
blocked.
