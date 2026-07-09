# VCP Memory Fallback Local Memory M13 Precondition Review

Task id: `M13-K0-FALLBACK-LOCAL-MEMORY-PRECONDITION-REVIEW`
Implementation slice: `CM-1763`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on:
- `docs/LOCAL_FALLBACK_MEMORY_ROLE_CONTRACT.md`
- `docs/VCP_MEMORY_GOVERNANCE_POLICY_SHIELD_TRUTH_TABLE.md`
- `docs/VCP_MEMORY_CLIENT_SCOPE_VISIBILITY_MATRIX.md`
- `docs/VCP_MEMORY_CODEX_CLAUDE_SUSTAINED_WORKFLOW_M12_BLOCKED_CLOSEOUT_SUMMARY.md`
Evidence type: `docs-only`, `precondition review`, `fixture planning`, `no-runtime`, `no-write`

## Purpose

This document reviews whether M13 can begin as local fallback hardening work.

It does not execute local fallback, call VCPToolBox, call MCP memory tools,
read private runtime memory, read raw stores, run a real query, write memory,
write durable audit/runtime state, call providers/APIs, read secrets/config,
expand public MCP tools, push remote state, or claim readiness.

## M13 Plan Requirement

M13 is `Fallback Local Memory Hardening`.

Required M13 direction:

- keep local memory safe as fallback/test substrate;
- prevent fallback from reviving the primary local clone route;
- cover scope/client isolation, secret rejection, lifecycle filter, and query
  tests;
- allow only local tests and dry-run gates in this phase;
- forbid private runtime reads;
- produce a fallback hardening report;
- validate that fallback obeys the same governance rules.

M13 depends on M5. It does not depend on M12 live workflow completion.

## Entry Condition Review

| Entry condition | Current evidence | Decision |
|---|---|---|
| Local fallback role contract exists | `docs/LOCAL_FALLBACK_MEMORY_ROLE_CONTRACT.md` defines fallback role, entry conditions, result marker, receipt fields, and must-not-run cases | satisfied for docs/fixture work |
| Policy shield applies to fallback | `docs/VCP_MEMORY_GOVERNANCE_POLICY_SHIELD_TRUTH_TABLE.md` includes `fallback_allowed` and `ERR_FALLBACK_NOT_ALLOWED` rows, and keeps L4 hard stops | satisfied for docs/fixture work |
| Client/scope/visibility basis exists | `docs/VCP_MEMORY_CLIENT_SCOPE_VISIBILITY_MATRIX.md` defines Codex/Claude/private/shared/unknown decisions | satisfied for fixture work |
| M12 live workflow is not required for M13 fixture work | `docs/VCP_MEMORY_CODEX_CLAUDE_SUSTAINED_WORKFLOW_M12_BLOCKED_CLOSEOUT_SUMMARY.md` closes M12 fixture chain and preserves live workflow blockers | satisfied |
| M13 fallback governance parity is already green | No M13-specific hardening suite exists yet | not satisfied |

M13 may begin as fixture/dry-run hardening work. It may not claim fallback
governance parity green yet.

## Candidate Existing Surfaces

The repository already has candidate local surfaces that M13 can reuse or map
in later slices:

- `src/core/SecretScanner.js` and `tests/secret-scanner-boundary.test.js`;
- `src/core/ClientScopeVisibilityBoundaryConsistency.js` and
  `tests/client-scope-visibility-boundary-consistency.test.js`;
- `src/core/ClientScopeSearchLifecycleConsistency.js` and
  `tests/client-scope-search-lifecycle-consistency.test.js`;
- `src/core/MemoryGovernanceLifecycleContract.js` and
  `tests/memory-governance-lifecycle-contract-fixture.test.js`;
- `src/core/QueryQualityTempDbGate.js` and
  `tests/query-quality-temp-db-gate.test.js`;
- `tests/phase-f-query-quality-dry-run-refresh-fixture.test.js`;
- `tests/lifecycle-read-policy-fixture.test.js`.

These are candidate evidence surfaces only. M13 must still create a focused
fallback hardening gap matrix and, where useful, M13-specific fixture tests or
dry-run gates before claiming fallback safety green.

## Allowed M13 Work Now

The current safe M13 work may:

- map fallback marker and receipt requirements into testable fixture cases;
- map scope/client/visibility failure modes for fallback;
- map secret rejection cases using synthetic values only;
- map lifecycle filter cases using fixtures only;
- map query-quality gates using fixture or temp-local dry-run data only;
- review candidate existing surfaces without executing private runtime reads;
- add local tests only when they are fixture/temp-local and deterministic.

## Forbidden M13 Work Now

The current boundary forbids:

- private runtime reads;
- real fallback execution against private memory;
- broad memory scan/export/import/migration/backfill;
- raw store, raw audit, raw sqlite/jsonl/cache/vector, raw DailyNote/RAG, or
  raw prompt reads;
- VCPToolBox runtime calls, target discovery, or target probing;
- MCP `search_memory`, `memory_overview`, or `record_memory` calls as M13
  evidence;
- memory write/update/supersede/tombstone;
- provider/API calls;
- secrets/config/env reads or edits;
- public MCP tool/schema expansion;
- fallback being marked as VCP-native success;
- production, release, cutover, `RC_READY`, complete V8, or full bridge
  completion claims.

## Current M13 Precondition State

```yaml
m13_precondition_state:
  review_id: m13_fallback_local_memory_precondition_review_cm1763
  source_fallback_role_contract: docs/LOCAL_FALLBACK_MEMORY_ROLE_CONTRACT.md
  source_policy_shield: docs/VCP_MEMORY_GOVERNANCE_POLICY_SHIELD_TRUTH_TABLE.md
  source_client_scope_visibility_matrix: docs/VCP_MEMORY_CLIENT_SCOPE_VISIBILITY_MATRIX.md
  source_m12_closeout: docs/VCP_MEMORY_CODEX_CLAUDE_SUSTAINED_WORKFLOW_M12_BLOCKED_CLOSEOUT_SUMMARY.md
  fallback_role_contract_exists: true
  policy_shield_exists: true
  client_scope_visibility_matrix_exists: true
  m13_entry_conditions_satisfied_for_fixture_work: true
  m13_entry_conditions_satisfied_for_runtime_work: false
  local_tests_allowed_fixture_only: true
  dry_run_gates_allowed: true
  private_runtime_reads_allowed: false
  fallback_execution_performed: false
  private_runtime_read_performed: false
  real_query_performed: false
  memory_read_performed: false
  memory_write_performed: false
  durable_audit_write_performed: false
  provider_api_called: false
  vcp_toolbox_runtime_called: false
  mcp_tool_called_for_m13_evidence: false
  public_mcp_expansion_performed: false
  fallback_governance_parity_green: false
  scope_client_isolation_m13_suite_green: false
  secret_rejection_m13_suite_green: false
  lifecycle_filter_m13_suite_green: false
  query_tests_m13_suite_green: false
  fallback_hardening_report_complete: false
  readiness_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  next_safe_route: m13_fallback_hardening_gap_matrix
```

## Future Fixture Requirements

The next M13 slices should produce:

- fallback hardening gap matrix;
- fallback result marker and receipt fixture contract;
- scope/client/visibility fallback isolation fixture tests;
- synthetic secret rejection fixture tests;
- lifecycle filter fixture tests;
- query-quality dry-run fixture tests;
- blocked closeout summary that separates fixture safety from runtime proof.

## M13-K0 Conclusion

M13 may begin as fixture/dry-run fallback hardening work because the fallback
role contract, policy shield, and client/scope/visibility matrix exist.

M13 is not complete. Fallback governance parity is not green. No local fallback
runtime execution or private runtime read is authorized by this review.
