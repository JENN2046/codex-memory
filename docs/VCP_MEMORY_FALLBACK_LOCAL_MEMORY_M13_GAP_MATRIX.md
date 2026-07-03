# VCP Memory Fallback Local Memory M13 Gap Matrix

Task id: `M13-K1-FALLBACK-LOCAL-MEMORY-GAP-MATRIX`
Implementation slice: `CM-1764`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_PRECONDITION_REVIEW.md`
Evidence type: `docs-only`, `gap matrix`, `fixture planning`, `no-runtime`, `no-write`

## Purpose

This document maps M13 fallback local memory hardening into fixture-lockable
areas and blocked runtime/private-read areas.

It does not execute local fallback, call VCPToolBox, call MCP memory tools,
read private runtime memory, read raw stores, run a real query, write memory,
write durable audit/runtime state, call providers/APIs, read secrets/config,
expand public MCP tools, push remote state, or claim readiness.

## M13 Requirement Map

| M13 requirement | Existing basis | Fixture-lockable now | Remaining blocked gap |
|---|---|---:|---|
| Fallback remains fallback/test substrate | `docs/LOCAL_FALLBACK_MEMORY_ROLE_CONTRACT.md` | yes | runtime fallback proof remains blocked |
| Fallback result cannot look VCP-native | fallback marker contract in CM-1717 | yes | no M13 fixture contract yet |
| Scope/client isolation | M5 policy shield and client/scope/visibility matrix | yes | no M13 fallback-specific isolation test suite yet |
| Secret rejection | candidate `SecretScanner` surface exists | yes with synthetic values | no M13 fallback-specific secret suite yet |
| Lifecycle filter | candidate lifecycle policy surfaces exist | yes with fixtures | no M13 fallback-specific lifecycle filter suite yet |
| Query tests | candidate query-quality dry-run surfaces exist | yes with fixtures/temp-local dry-run | no M13 fallback-specific query suite yet |
| Same governance rules as VCP-native path | M5 policy shield | partially | no M13 parity report yet |
| Fallback hardening report | M13-K0 review exists | partially | final M13 report not complete |

## Fixture Families

### F1 Fallback Marker And Receipt

Fixture goals:

- require `memory_source=local_fallback`;
- require `vcp_native_result=false`;
- require `fallback_used=true` only when fallback is actually selected;
- require safe `fallback_reason`;
- reject missing scope, visibility, or client identity;
- reject any field that implies VCP-native success;
- reject raw private, secret, endpoint, path, provider payload, and
  approval-line fields.

Blocked evidence:

- live fallback output;
- runtime audit receipt;
- private memory read.

### F2 Scope And Client Isolation

Fixture goals:

- Codex-private fallback result cannot be returned to Claude-private request;
- Claude-private fallback result cannot be returned to Codex-private request;
- shared visibility requires explicit shared boundary;
- unknown client, workspace, owner, project, or visibility denies fallback;
- fallback never widens visibility to hide a VCP failure.

Blocked evidence:

- real cross-client private data read;
- live client runtime proof.

### F3 Secret Rejection

Fixture goals:

- synthetic secret-like input is rejected or redacted;
- fallback receipt must not include raw secret-like values;
- config/env/provider/auth words are treated as L4 unless synthetic fixture
  proof is explicitly marked;
- fallback cannot proceed if it requires secret/config/env read.

Blocked evidence:

- reading actual secrets;
- inspecting `.env`, auth files, provider config, tokens, cookies, or
  endpoints.

### F4 Lifecycle Filter

Fixture goals:

- tombstoned, superseded, rejected, stale, or proposal-only memory states are
  not returned as active fallback results unless a fixture policy explicitly
  allows a low-disclosure status summary;
- fallback receipt records lifecycle policy applied;
- lifecycle filter does not mutate lifecycle state;
- unknown lifecycle state fails closed.

Blocked evidence:

- real lifecycle store scan;
- migration/import/export/backfill;
- durable lifecycle mutation.

### F5 Query Tests

Fixture goals:

- query-quality dry-run uses fixture or temp-local data only;
- broad or ambiguous fallback query requires bounded scope;
- query output remains low-disclosure;
- query failure is visibly marked as local fallback failure, not VCP-native
  failure;
- query tests do not call providers or real MCP memory tools.

Blocked evidence:

- real query against private runtime memory;
- broad memory search;
- provider-backed rerank/embedding calls.

## Current Gap Matrix State

```yaml
m13_gap_matrix_state:
  gap_matrix_id: m13_fallback_local_memory_gap_matrix_cm1764
  source_precondition_review: docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_PRECONDITION_REVIEW.md
  fallback_marker_receipt_fixture_lockable: true
  scope_client_isolation_fixture_lockable: true
  secret_rejection_fixture_lockable: true
  lifecycle_filter_fixture_lockable: true
  query_tests_fixture_lockable: true
  governance_parity_report_lockable: true
  fallback_marker_contract_exists_for_m13: false
  fallback_scope_isolation_m13_tests_green: false
  fallback_secret_rejection_m13_tests_green: false
  fallback_lifecycle_filter_m13_tests_green: false
  fallback_query_tests_m13_green: false
  fallback_governance_parity_green: false
  fallback_hardening_report_complete: false
  local_fallback_runtime_executed: false
  private_runtime_read_performed: false
  real_query_performed: false
  mcp_tool_called_for_m13_evidence: false
  memory_read_performed: false
  memory_write_performed: false
  durable_audit_write_performed: false
  provider_api_called: false
  vcp_toolbox_runtime_called: false
  public_mcp_expansion_performed: false
  readiness_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  next_safe_route: m13_fallback_marker_receipt_fixture_contract
```

## Recommended Next Slice

The next safe slice is a fixture-only fallback marker and receipt contract. It
should validate only explicit input objects and fixture output shapes. It must
not call runtime fallback, MCP memory tools, VCPToolBox, provider/API, or real
memory stores.

## M13-K1 Conclusion

M13 has a bounded gap matrix. The fixture path is clear, but fallback governance
parity is not green and no runtime fallback evidence is unlocked.
