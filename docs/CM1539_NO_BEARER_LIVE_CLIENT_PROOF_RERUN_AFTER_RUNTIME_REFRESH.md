# CM-1539 No-Bearer Live Client Proof Rerun After Runtime Refresh

## Scope

Approval received:

```text
APPROVE_NO_BEARER_LIVE_CLIENT_PROOF_RERUN_AFTER_RUNTIME_REFRESH
```

This task is limited to the no-bearer local HTTP MCP live client proof rerun, bounded `initialize` / `tools/list` / `tools/call` proof requests, redacted evidence recording, and live client evidence blocker closeout candidate review. It does not use bearer-token material, provider/API calls, raw scans, effective `record_memory`, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness / `RC_READY` claims.

## Fresh Preflight

Fresh Git preflight before proof:

```text
branch: main
HEAD: 8408ef17a961dd650f6239e0b1415281505d3094
origin/main: 8408ef17a961dd650f6239e0b1415281505d3094
ahead/behind: 0 0
worktree: clean before proof
```

Low-disclosure runtime freshness preflight:

```text
health_ok: true
runtimeFreshness_present: true
runtimeFreshness_keys: algorithm,sourceFileCount,sourceFingerprint,startedAt
runtimeFreshness_algorithm: sha256
runtimeFreshness_sourceFileCount: 7
runtimeFreshness_startedAt_present: true
runtimeFreshness_sourceFingerprint_present: true
runtimeFreshness_matches_expected: true
local_windows_paths_present_in_summary: false
authorization_or_bearer_material_present_in_summary: false
token_material_present_in_summary: false
provider_api_details_present_in_summary: false
raw_memory_or_audit_material_present_in_summary: false
```

The actual runtime source fingerprint value, expected fingerprint value, local path list, session header value, raw JSON-RPC responses, token material, provider/API details, raw memory, and raw audit content were not persisted.

## Proof Envelope

The rerun followed the CM-1493 no-bearer proof envelope plus the CM-1536 runtime freshness precondition.

Approved budget:

```text
initialize: 1
tools/list: 1
tools/call: 7
total: 9
```

Used budget:

```text
initialize: 1
tools/list: 1
tools/call: 7
total: 9
authorization_header_sent: false
bearer_token_used: false
```

Endpoint class:

```text
transport: local HTTP MCP loopback
endpoint_path: /mcp/codex-memory
session_header_returned: true
session_header_value_persisted: false
```

## Redacted Result Matrix

| Step | Operation | HTTP | Result | Low-disclosure evidence |
|---:|---|---:|---|---|
| 1 | `initialize` | 200 | success | `serverName=vcp_codex_memory`; `protocolVersion=2025-03-26`; session header value not persisted |
| 2 | `tools/list` | 200 | success | exactly 7 public tools |
| 3 | `tools/call record_memory` invalid no-token | 403 | rejected | JSON-RPC error `-32001`; code `PUBLIC_REQUEST_BLOCKED`; status `rejected`; reason `blocked` |
| 4 | `tools/call search_memory` invalid no-token | 403 | rejected | JSON-RPC error `-32001`; code `PUBLIC_REQUEST_BLOCKED`; status `rejected`; reason `blocked` |
| 5 | `tools/call memory_overview` no-token | 200 | selected projection | `access.mode=public_selected_overview`; `selectedProjection=true`; version `2`; no detail keys |
| 6 | `tools/call audit_memory` readonly bounded no-token | 403 | rejected | JSON-RPC error `-32001`; code `PUBLIC_REQUEST_BLOCKED`; status `rejected`; reason `blocked` |
| 7 | `tools/call validate_memory` dry-run no-token | 403 | rejected | JSON-RPC error `-32001`; code `PUBLIC_REQUEST_BLOCKED`; status `rejected`; reason `blocked` |
| 8 | `tools/call tombstone_memory` dry-run no-token | 403 | rejected | JSON-RPC error `-32001`; code `PUBLIC_REQUEST_BLOCKED`; status `rejected`; reason `blocked` |
| 9 | `tools/call supersede_memory` dry-run no-token | 403 | rejected | JSON-RPC error `-32001`; code `PUBLIC_REQUEST_BLOCKED`; status `rejected`; reason `blocked` |

Public MCP surface observed by no-bearer `tools/list`:

```text
audit_memory
memory_overview
record_memory
search_memory
supersede_memory
tombstone_memory
validate_memory
```

Public MCP tool count:

```text
public_mcp_tool_count: 7
public_mcp_surface_exact: true
public_mcp_expansion: false
```

No-token `memory_overview` selected projection summary:

```text
http_status: 200
result_is_error: false
access_mode: public_selected_overview
selectedProjection: true
selectedProjectionVersion: 2
top_level_keys: access,activeMemoryHealth,adapterStatus,cacheHealth,indexHealth,recall,shadowSync,summary
detail_keys: none
paths_returned: false
memory_links_returned: false
recent_audit_returned: false
recent_recall_returned: false
raw_fields_returned: false
```

No-token blocked tools summary:

```text
blocked_call_count: 6
blocked_calls_all_PUBLIC_REQUEST_BLOCKED: true
blocked_failure_reason_low_disclosure: true
```

## Forbidden Boundary Confirmation

```text
authorization_header_sent: false
bearer_token_used: false
provider_api_calls: 0
raw_memory_scan: 0
raw_audit_scan: 0
broad_memory_scan: 0
effective_record_memory_writes: 0
confirmed_mutation: 0
dry_run_false_mutation: 0
confirm_true_mutation: 0
public_mcp_expansion: 0
release_tag_deploy: 0
readiness_claim: false
rc_ready_claim: false
effective_write_reliability_blocker_closed: false
```

Low-disclosure scan over the persisted summary found:

```text
local_paths_persisted: false
authorization_or_bearer_material_persisted: false
token_material_persisted: false
provider_api_details_persisted: false
raw_memory_or_audit_material_persisted: false
memory_ids_titles_snippets_content_paths_persisted: false
raw_jsonrpc_response_persisted: false
```

## Closeout Candidate Review

Decision:

```text
live_client_evidence_closeout_candidate_review: PASS_REVIEW_READY
```

Rationale:

- Runtime freshness matched current source before proof requests.
- The exact no-bearer budget executed as approved: 1 `initialize`, 1 `tools/list`, and 7 `tools/call`.
- Public MCP surface remained exactly seven tools.
- No-token restricted tools failed closed with low-disclosure `PUBLIC_REQUEST_BLOCKED` shape.
- No-token `memory_overview` returned only selected projection v2 and did not expose path/raw/audit/detail fields in the persisted evidence summary.
- No provider/API, bearer token, raw scan, effective write, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness claim occurred.

Boundary:

```text
live_client_evidence_blocker: CLOSEOUT_CANDIDATE_REVIEW_RECORDED_NOT_DECLARED_RC_READY
effective_write_reliability_blocker: OPEN / DEFERRED
RC_READY: BLOCKED
project_status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

CM-1539 records a closeout candidate review only. It does not close the effective write reliability blocker and does not create runtime readiness, release readiness, cutover readiness, or `RC_READY`.

## Result

```text
CM-1539_RESULT: COMPLETED_VALIDATED_NO_BEARER_LIVE_PROOF_LOW_DISCLOSURE_PASS_CLOSEOUT_CANDIDATE_RECORDED
proof_status: EXECUTED_NO_BEARER_BOUNDED
live_client_operations: 9
initialize/tools-list/tools-call: 1/1/7
public_mcp_surface: EXACT_SEVEN
live_client_evidence_blocker: CLOSEOUT_CANDIDATE_REVIEW_RECORDED_NOT_RC_READY
effective_write_reliability_blocker: OPEN / DEFERRED
RC_READY: BLOCKED
project_status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

## Next Route

The next safe route is a separate docs/source audit or operator closeout decision for the live client evidence blocker, using CM-1539 as evidence. Effective write reliability remains a separate blocker and still requires its own exact approval/evidence path before any closure.
