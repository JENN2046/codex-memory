# VCP Memory Fallback Local Memory M13 Scope Isolation Contract

Task id: `M13-K3-FALLBACK-LOCAL-MEMORY-SCOPE-ISOLATION-CONTRACT`
Implementation slice: `CM-1766`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_MARKER_RECEIPT_CONTRACT.md`
Evidence type: `source/test`, `fixture-only`, `schema contract`, `no-runtime`, `no-write`

## Purpose

This slice turns the M13 fallback scope/client isolation gap into an executable
fixture-only contract.

It does not execute local fallback, call VCPToolBox, call MCP memory tools,
read private runtime memory, read raw stores, run a real query, write memory,
write durable audit/runtime state, call providers/APIs, read secrets/config,
expand public MCP tools, push remote state, or claim readiness.

## Added Artifacts

- `src/core/VcpMemoryFallbackLocalMemoryScopeIsolationContract.js`
- `tests/vcp-memory-fallback-local-memory-scope-isolation-contract.test.js`

## Contract Mode

```yaml
m13_fallback_scope_isolation_contract:
  contract_name: VcpMemoryFallbackLocalMemoryScopeIsolationContract
  contract_mode: fixture_fallback_scope_client_isolation_contract_only
  schema_version: 1
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

- same-client Codex private fallback fixture acceptance;
- same-client Claude private fallback fixture acceptance;
- Codex request for Claude private fallback candidate denial;
- shared fallback denial without explicit shared boundary;
- shared fallback acceptance with explicit shared boundary;
- unknown client, scope, or visibility fail-closed denial;
- explicit cross-client private request stopped as L4 without execution;
- visibility widening denial from private request to shared candidate;
- decision mismatch rejection for cross-client private leakage attempts;
- missing and positive side-effect counter rejection;
- raw, secret, approval, and readiness field rejection without echoing
  submitted values;
- non-boolean scope and sensitive presence flag rejection;
- non-string request id and non-numeric zero counter rejection;
- scope isolation vocabulary and side-effect posture locked.

## Current Result

```yaml
m13_fallback_scope_isolation_contract_result:
  contract_implemented: true
  targeted_test_count: 14
  targeted_test_passed: true
  fixture_scope_isolation_only: true
  same_client_private_accepted: true
  cross_client_private_denied: true
  shared_boundary_required: true
  unknown_scope_fails_closed: true
  visibility_widening_denied: true
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

- synthetic secret rejection fallback tests;
- lifecycle filter fallback tests;
- query-quality fallback dry-run tests;
- final fallback hardening report and blocked closeout.

## M13-K3 Conclusion

M13 now has executable fixture coverage for fallback scope/client isolation.
Fallback governance parity is still not green, and runtime fallback remains
blocked.
