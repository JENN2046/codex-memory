# VCP Memory Fallback Local Memory M13 Query-Quality Dry-Run Contract

Task id: `M13-K6-FALLBACK-LOCAL-MEMORY-QUERY-QUALITY-DRY-RUN-CONTRACT`
Implementation slice: `CM-1769`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_LIFECYCLE_FILTER_CONTRACT.md`
Evidence type: `source/test`, `fixture-only`, `schema contract`, `no-runtime`, `no-write`

## Purpose

This slice turns the M13 fallback query-quality dry-run gap into an executable
fixture-only contract.

It does not execute local fallback, run a real query, call VCPToolBox, call MCP
memory tools, read private runtime memory, scan raw stores, run provider-backed
embedding or rerank, write memory, write temp-local data, write durable
audit/runtime state, expand public MCP tools, push remote state, or claim
readiness.

## Added Artifacts

- `src/core/VcpMemoryFallbackLocalMemoryQueryQualityDryRunContract.js`
- `tests/vcp-memory-fallback-local-memory-query-quality-dry-run-contract.test.js`

## Contract Mode

```yaml
m13_fallback_query_quality_dry_run_contract:
  contract_name: VcpMemoryFallbackLocalMemoryQueryQualityDryRunContract
  contract_mode: fixture_fallback_query_quality_dry_run_contract_only
  schema_version: 1
  live_runtime_allowed: false
  local_fallback_execution_allowed: false
  real_query_allowed: false
  private_runtime_read_allowed: false
  mcp_memory_tool_call_allowed: false
  provider_api_allowed: false
  broad_memory_scan_allowed: false
  raw_store_scan_allowed: false
  temp_local_write_allowed_by_contract: false
  durable_audit_write_allowed: false
  memory_write_allowed: false
  public_mcp_expansion_allowed: false
  approval_request_allowed: false
  approval_line_generation_allowed: false
  readiness_claim_allowed: false
  quality_score_claim_allowed: false
```

## Coverage

The targeted test covers:

- fixture-only fallback query-quality dry-run success without runtime
  execution;
- temp-local dataset metadata accepted only as dry-run fixture metadata;
- broad or ambiguous fallback query denial unless bounded scope is present;
- synthetic query-quality failure accepted only when visibly marked as local
  fallback failure;
- synthetic query-quality failure denial when it is not marked local fallback;
- real query, provider, MCP memory tool, private read, and broad scan requests
  stopped as L4;
- raw, provider, MCP, and real-memory result payload fixtures stopped as L4;
- VCP-native lookalike query-quality fallback result rejection;
- query-quality decision mismatch rejection;
- forbidden raw query, secret, approval, and readiness field rejection without
  echoing submitted values;
- missing, positive, and malformed side-effect counter rejection;
- non-boolean request/dry-run/expectation flag and non-string request id
  rejection;
- unexpected non-allowlisted field rejection without value echo;
- query-quality vocabulary and side-effect posture locked.

## Current Result

```yaml
m13_fallback_query_quality_dry_run_contract_result:
  contract_implemented: true
  targeted_test_count: 14
  targeted_test_passed: true
  fixture_query_quality_dry_run_only: true
  fixture_dataset_metadata_accepted: true
  temp_local_dataset_metadata_accepted: true
  broad_query_requires_bounded_scope: true
  synthetic_quality_failure_marked_local_fallback: true
  unmarked_quality_failure_denied: true
  real_query_stop_l4: true
  provider_mcp_private_read_broad_scan_stop_l4: true
  raw_provider_mcp_real_memory_payload_stop_l4: true
  vcp_native_lookalike_rejected: true
  decision_mismatch_rejected: true
  unexpected_non_allowlisted_fields_rejected: true
  local_fallback_runtime_executed: false
  query_executed: false
  private_runtime_read_performed: false
  real_query_performed: false
  mcp_tool_called_for_m13_evidence: false
  provider_api_called: false
  real_memory_read_performed: false
  real_memory_write_performed: false
  raw_store_scan_performed: false
  broad_memory_scan_performed: false
  temp_local_write_performed: false
  durable_audit_write_performed: false
  durable_memory_write_performed: false
  public_mcp_expansion_performed: false
  approval_request_submitted: false
  approval_line_generated: false
  readiness_claimed: false
  quality_score_claimed: false
  fallback_governance_parity_green: false
```

## Remaining M13 Gaps

This contract does not complete M13. Remaining fixture gaps include:

- final fallback hardening report and blocked closeout;
- fallback governance parity review across marker, scope, secret, lifecycle,
  and query-quality contracts.

## M13-K6 Conclusion

M13 now has executable fixture coverage for fallback query-quality dry-run
boundaries. Fallback governance parity is still not green, and runtime fallback
remains blocked.
