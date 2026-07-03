# VCP Memory Response Normalization Audit Receipts M11 Fixture Contract

Task id: `M11-K2-RESPONSE-NORMALIZATION-AUDIT-RECEIPT-FIXTURE-CONTRACT`
Implementation slice: `CM-1756`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on:
- `docs/VCP_MEMORY_RESPONSE_NORMALIZATION_AUDIT_RECEIPTS_M11_GAP_MATRIX.md`
- `docs/VCP_MEMORY_RESULT_NORMALIZATION_CONTRACT.md`
- `docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md`
Evidence type: `fixture-only`, `schema contract`, `no-runtime`, `no-write`

## Purpose

CM-1756 turns the CM-1755 M11 gap matrix into a pure local contract helper and
targeted regression test.

It does not wire runtime, call VCPToolBox, discover or probe a target, execute
fallback, read memory, write memory, update memory, supersede memory,
tombstone memory, write durable audit/runtime state, call providers/APIs, read
secrets/config, expand public MCP tools, submit an approval request, generate
an approval line, push remote state, or claim readiness.

## Added Files

- `src/core/VcpMemoryResponseNormalizationAuditReceiptContract.js`
- `tests/vcp-memory-response-normalization-audit-receipt-contract.test.js`

## Contract Coverage

The helper validates synthetic response-normalization and audit-receipt objects
only. It accepts:

- schema-only VCP-native success projection;
- fixture-only local fallback success projection;
- L4 stop projection;
- unknown target denial projection;
- partial budget projection;
- sanitized error projection.

It fails closed for:

- missing required normalized-result or receipt fields;
- missing client/workspace/owner/visibility scope on success-like output;
- source runtime and fallback marker conflicts;
- raw private/debug/secret/provider/approval-line/store payload fields;
- production/release/cutover/`RC_READY`/complete V8/full-bridge overclaims;
- live-runtime evidence claims;
- positive runtime, memory, provider, approval, durable write, or readiness
  counters.

## Current Fixture Contract State

```yaml
m11_fixture_contract_state:
  helper: src/core/VcpMemoryResponseNormalizationAuditReceiptContract.js
  test: tests/vcp-memory-response-normalization-audit-receipt-contract.test.js
  contract_mode: fixture_schema_contract_only
  targeted_test_count: 10
  targeted_test_passed: true
  vcp_native_schema_success_covered: true
  local_fallback_schema_success_covered: true
  l4_stop_covered: true
  unknown_target_denial_covered: true
  partial_budget_covered: true
  sanitized_error_covered: true
  missing_scope_rejected: true
  fallback_conflict_rejected: true
  raw_private_debug_rejected: true
  readiness_overclaim_rejected: true
  live_runtime_claim_rejected: true
  positive_side_effect_counters_rejected: true
  runtime_wiring_executed: false
  live_vcp_toolbox_called: false
  target_probe_performed: false
  fallback_execution_performed: false
  memory_read_performed: false
  memory_write_performed: false
  durable_audit_write_performed: false
  durable_memory_write_performed: false
  provider_api_called: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  public_mcp_expansion_performed: false
  readiness_claimed: false
  current_decision: m11_fixture_contract_validated_live_runtime_parity_blocked
```

## Validation

Targeted validation:

```bash
node --test tests/vcp-memory-response-normalization-audit-receipt-contract.test.js
```

Result: `10/10` passing.

The source/test change still remains fixture-only. It does not prove live
VCP-native parity or runtime receipt stability.

## Current Review Result

```yaml
current_review_result:
  decision: m11_fixture_contract_validated_live_runtime_parity_blocked
  serves_project_final_goal: true
  fixture_contract_helper_added: true
  fixture_contract_tests_added: true
  normalized_envelope_runtime_proven: false
  low_disclosure_runtime_receipts_proven: false
  live_runtime_work_allowed: false
  next_safe_route: m11_fixture_contract_closeout_or_wait_for_exact_m7_read_shape_receipt
```

## M11-K2 Fixture Contract Conclusion

M11-K2 adds executable fixture/schema regression coverage for the response
normalization and audit receipt shape. It advances M11 without crossing the
runtime boundary.

Live response parity and runtime receipt stability remain blocked until
separate exact-approved evidence exists.
