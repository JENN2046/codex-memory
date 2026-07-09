# VCP Memory Response Normalization Audit Receipts M11 Gap Matrix

Task id: `M11-K1-RESPONSE-NORMALIZATION-AUDIT-RECEIPTS-GAP-MATRIX`
Implementation slice: `CM-1755`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on:
- `docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md`
- `docs/VCP_MEMORY_RESULT_NORMALIZATION_CONTRACT.md`
- `docs/VCP_MEMORY_RESPONSE_NORMALIZATION_AUDIT_RECEIPTS_M11_PRECONDITION_REVIEW.md`
Evidence type: `docs-only`, `fixture/schema gap matrix`, `no-runtime`, `no-write`

## Purpose

This document defines the M11 fixture/schema-only gap matrix for response
normalization and audit receipts.

It does not call VCPToolBox, discover or probe a target, execute fallback,
read memory, write memory, update memory, supersede memory, tombstone memory,
write durable audit/runtime state, call providers/APIs, read secrets/config,
expand public MCP tools, submit an approval request, generate an approval
line, push remote state, or claim readiness.

## Current Basis

M11 requires stable normalized response and audit receipt shapes across
VCP-native and fallback paths. The current repository evidence can support
schema/fixture work only:

- M4 invocation contract exists in
  `docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md`.
- M4 result normalization contract exists in
  `docs/VCP_MEMORY_RESULT_NORMALIZATION_CONTRACT.md`.
- CM-1754 records that accepted M7 live read-shape receipt is absent.
- M4 static examples explicitly mark `live_runtime_claimed: false`.

Therefore this matrix can lock fixture/schema expectations and blocked gaps.
It cannot prove live VCP-native response parity or runtime receipt stability.

## Gap Matrix

| Area | Required shape or invariant | Current basis | Current state | Gap / next proof |
|---|---|---|---|---|
| Normalized envelope mandatory fields | `result_id`, `request_id`, `receipt_id`, `contract_version`, `status`, `source_runtime`, `source_component`, `source_capability`, `profile`, `confidence`, `evidence`, `scope`, `fallback`, `output`, `warnings`, `next_action_allowed` | M4-K2 result normalization contract | lockable as schema/fixture | future tests should reject missing mandatory fields |
| Source runtime marker | `source_runtime` is one of `vcp_toolbox`, `local_fallback`, or `none` | M4-K1 and M4-K2 | lockable as schema/fixture | live `vcp_toolbox` evidence still requires exact-approved M7 receipt |
| Fallback marker | `fallback.used`, `fallback.reason`, and `fallback.vcp_native_result` must agree with `source_runtime` | M4-K2 source runtime rules | lockable as schema/fixture | fallback execution is not performed in CM-1755 |
| Confidence basis | `schema` and `fixture` max confidence is `low`; `live_runtime_claimed` stays `false` | M4-K2 confidence rules | lockable as schema/fixture | `exact_approved_live` requires future exact approval |
| Evidence basis | `evidence_type` is `schema-only` or `fixture-only`; raw payload fields are false | M4-K2 evidence fields | lockable as schema/fixture | live-runtime evidence remains blocked |
| Scope and visibility | client/workspace/owner scope plus visibility are required before success-like statuses | M4-K1 principal fields; M4-K2 projection rules | lockable as schema/fixture | future fixture tests should reject missing scope/visibility |
| Receipt core fields | receipt id, timestamp, request id, contract version, profile, target alias/kind, principal/scope flags, operation type, request counts, decision, result status, fallback flags, runtime/provider/write counters, disclosure flags, rollback/cleanup, next action | M4-K1 receipt envelope and plan audit requirements | partially lockable as schema/fixture | future receipt schema suite should enforce all required fields |
| Low-disclosure receipt | no raw secret, credential, private runtime state, unredacted memory payload, approval-line value, raw audit row, raw sqlite/jsonl/cache/vector row, raw DailyNote/RAG/prompt content, or provider payload | M4-K1 error and receipt rules; M4-K2 projection rules | lockable as schema/fixture | future receipt suite should include leakage rejection cases |
| Status mapping | success, fallback success, denied, stopped L4, unknown target, partial, and error map to explicit receipt decisions | M4-K2 status mapping | lockable as schema/fixture | future tests should assert status/decision pairs |
| Error taxonomy | known target, scope, component/action, raw output, write approval, fallback, partial budget, and L4 stop errors do not echo private values | M4-K1 error taxonomy | lockable as schema/fixture | future tests should assert sanitized errors |
| Readiness overclaim rejection | normalized result and receipt must not claim production, release, cutover, `RC_READY`, complete V8, or full bridge completion | M4-K2 projection/fail-closed rules; CM-1754 boundary | lockable as schema/fixture | keep lint/scan checks in validation |
| VCP-native response parity | VCP-native path uses the same normalized envelope as fallback path | M4 fixture examples only | blocked for live proof | requires accepted exact-approved M7 read-shape receipt |
| Runtime receipt stability | low-disclosure receipts remain stable across actual runtime attempts | no accepted runtime evidence | blocked for live proof | requires exact-approved runtime evidence and no raw leakage |

## Fixture Families To Add Later

Future fixture/schema tests can be added without runtime execution for these
families:

| Fixture family | Expected result |
|---|---|
| `m11_schema_vcp_native_success` | accepts a schema-only VCP-native success projection with `live_runtime_claimed=false` |
| `m11_schema_local_fallback_success` | accepts a fixture-only fallback projection with `fallback.used=true` and `vcp_native_result=false` |
| `m11_schema_l4_stop` | accepts a stopped L4 projection with no source runtime and no raw output |
| `m11_schema_denied_scope_missing` | rejects success-like status when scope or visibility is missing |
| `m11_schema_unknown_target` | maps absent/stale target alias to `unknown_target` and `deny` |
| `m11_schema_partial_budget` | maps output budget truncation to `partial` without raw payload |
| `m11_schema_error_sanitized` | accepts safe errors only when private values are omitted |
| `m11_schema_fallback_conflict` | rejects `local_fallback` with `fallback.used=false` or `vcp_native_result=true` |
| `m11_schema_raw_leakage_rejected` | rejects raw payload, debug payload, secret, credential, provider payload, approval-line value, or raw store disclosure |
| `m11_schema_overclaim_rejected` | rejects production/release/cutover/`RC_READY`/complete V8/full bridge completion claims |

These are future fixture tasks. CM-1755 records the matrix only.

## Current Gap Matrix State

```yaml
m11_gap_matrix_state:
  review_id: m11_response_normalization_audit_receipts_gap_matrix_cm1755
  source_invocation_contract: docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md
  source_result_normalization_contract: docs/VCP_MEMORY_RESULT_NORMALIZATION_CONTRACT.md
  source_precondition_review: docs/VCP_MEMORY_RESPONSE_NORMALIZATION_AUDIT_RECEIPTS_M11_PRECONDITION_REVIEW.md
  artifact_basis: schema_or_fixture_only
  m4_contract_exists: true
  m7_read_shape_receipt_accepted: false
  m7_live_read_shape_known: false
  vcp_native_schema_shape_available: true
  fallback_schema_shape_available: true
  normalized_envelope_mandatory_fields_mapped: true
  source_runtime_fallback_markers_mapped: true
  confidence_evidence_basis_mapped: true
  low_disclosure_receipt_fields_mapped: true
  raw_private_debug_exclusion_mapped: true
  status_error_mapping_mapped: true
  readiness_overclaim_rejection_mapped: true
  live_vcp_native_parity_claimed: false
  live_runtime_receipt_stability_claimed: false
  vcp_toolbox_runtime_called: false
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
  current_decision: m11_fixture_gap_matrix_complete_live_runtime_parity_blocked
```

## Current Review Result

```yaml
current_review_result:
  decision: m11_fixture_gap_matrix_complete_live_runtime_parity_blocked
  serves_project_final_goal: true
  m11_fixture_gap_matrix_defined: true
  normalized_envelope_runtime_proven: false
  low_disclosure_runtime_receipts_proven: false
  fixture_schema_tests_added: false
  live_runtime_work_allowed: false
  next_safe_route: m11_fixture_contract_test_plan_or_wait_for_exact_m7_read_shape_receipt
```

## M11-K1 Gap Matrix Conclusion

M11-K1 defines what can be locked now at the fixture/schema layer and what
remains blocked until exact-approved live evidence exists.

The next safe work is a fixture/schema contract test plan or fixture-only
contract implementation for the listed families. Live runtime parity and
runtime receipt stability remain blocked.
