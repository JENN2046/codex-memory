# VCP Memory Fallback Local Memory M13 Marker Receipt Contract

Task id: `M13-K2-FALLBACK-LOCAL-MEMORY-MARKER-RECEIPT-CONTRACT`
Implementation slice: `CM-1765`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_GAP_MATRIX.md`
Evidence type: `source/test`, `fixture-only`, `schema contract`, `no-runtime`, `no-write`

## Purpose

This slice turns the M13 fallback marker and receipt gap into an executable
fixture-only contract.

It does not execute local fallback, call VCPToolBox, call MCP memory tools,
read private runtime memory, read raw stores, run a real query, write memory,
write durable audit/runtime state, call providers/APIs, read secrets/config,
expand public MCP tools, push remote state, or claim readiness.

## Added Artifacts

- `src/core/VcpMemoryFallbackLocalMemoryMarkerReceiptContract.js`
- `tests/vcp-memory-fallback-local-memory-marker-receipt-contract.test.js`

## Contract Mode

```yaml
m13_fallback_marker_receipt_contract:
  contract_name: VcpMemoryFallbackLocalMemoryMarkerReceiptContract
  contract_mode: fixture_fallback_marker_receipt_contract_only
  schema_version: 1
  fallback_marker_contract_version: vcp_memory_fallback_marker_v1
  fallback_receipt_contract_version: vcp_memory_fallback_receipt_v1
  live_runtime_allowed: false
  local_fallback_execution_allowed: false
  private_runtime_read_allowed: false
  real_query_allowed: false
  mcp_tool_call_allowed: false
  memory_read_allowed: false
  memory_write_allowed: false
  durable_audit_write_allowed: false
  provider_api_allowed: false
  approval_request_allowed: false
  approval_line_generation_allowed: false
  readiness_claim_allowed: false
```

## Coverage

The targeted test covers:

- accepted VCP target unapproved local fallback marker/receipt fixture;
- accepted test/dry-run fallback marker with shared visibility;
- VCP-native-required request represented as denial without fallback use;
- private runtime read request represented as stopped L4 without execution;
- rejection when fallback is allowed but client or scope is missing;
- rejection when marker or receipt can look VCP-native;
- rejection of runtime plans and positive side-effect counters;
- rejection of missing zero side-effect counter fields;
- rejection of raw, secret, approval, and readiness fields without echoing
  submitted values;
- fallback marker/receipt vocabulary and side-effect posture locked.

## Current Result

```yaml
m13_fallback_marker_receipt_contract_result:
  contract_implemented: true
  targeted_test_count: 10
  targeted_test_passed: true
  fixture_fallback_marker_receipt_only: true
  local_fallback_runtime_executed: false
  private_runtime_read_performed: false
  real_query_performed: false
  mcp_tool_called_for_m13_evidence: false
  memory_read_performed: false
  memory_write_performed: false
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

- scope/client isolation fallback tests;
- synthetic secret rejection fallback tests;
- lifecycle filter fallback tests;
- query-quality fallback dry-run tests;
- final fallback hardening report and blocked closeout.

## M13-K2 Conclusion

M13 now has executable fixture coverage for fallback marker and receipt shape.
Fallback governance parity is still not green, and runtime fallback remains
blocked.
