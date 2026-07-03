# VCP Memory Observe-Lite Runtime Abort Receipt Skeleton

Task id: `M6-K4-OBSERVE-LITE-RUNTIME-ABORT-RECEIPT-SKELETON`
Implementation slice: `CM-1725`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_EXACT_APPROVAL_REQUEST_DISPLAY_BOUNDARY.md`
Evidence type: `docs-only`, `abort receipt skeleton`, `no-runtime`

## Purpose

This document defines the low-disclosure abort receipt skeleton for future
observe-lite runtime attempts.

It is not a runtime attempt, target binding, target probe, approval request,
approval grant, approval-line generation, live proof, readiness claim, or
fallback execution. It does not call VCPToolBox, inspect runtime, read memory,
write memory, call providers/APIs, read secrets/config, expand public MCP tools,
or push remote state.

## Abort Skeleton State

```yaml
abort_skeleton_state:
  skeleton_id: m6_observe_lite_runtime_abort_receipt_skeleton_cm1725
  source_display_id: m6_observe_lite_exact_approval_request_display_cm1724
  source_review_id: m6_observe_lite_exact_approval_decision_review_cm1723
  source_packet_id: m6_observe_lite_exact_approval_packet_preparation_cm1722
  profile: observe-lite
  runtime_attempt_performed: false
  exact_approval_present: false
  target_bound: false
  approval_line_present: false
  approval_line_generated: false
  approval_request_submitted: false
  execution_authorized: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  readiness_claimed: false
  current_result: abort_receipt_skeleton_ready_no_runtime
```

The skeleton exists so future exact-approved work can fail closed with a
consistent receipt if runtime execution is not allowed or cannot safely
continue.

## Abort Reason Vocabulary

Future observe-lite attempts must use only low-disclosure abort codes. Receipts
must not include raw targets, paths, endpoints, tokens, cookies, credentials,
provider auth material, raw runtime payloads, raw memory, raw audit rows, raw
sqlite/jsonl/cache/vector rows, raw DailyNote/RAG/prompt content, or client
private content.

| Abort code | Trigger | Required posture |
|---|---|---|
| `ERR_EXACT_APPROVAL_MISSING` | Exact current Jenn boundary absent | stop before runtime |
| `ERR_EXACT_FIELD_MISSING` | Target, transport, client, scope, visibility, or budget missing | stop before runtime |
| `ERR_TARGET_ALIAS_AMBIGUOUS` | Target alias is stale, ambiguous, mismatched, or unsafe | stop before runtime |
| `ERR_TRANSPORT_AMBIGUOUS` | Transport is stale, ambiguous, mismatched, or unsafe | stop before runtime |
| `ERR_AUTH_OR_SECRET_REQUIRED` | Credentials, config, endpoint, path, token, cookie, provider auth, or private locator is required | stop without reading it |
| `ERR_MEMORY_PAYLOAD_RETURNED` | Any memory/private payload appears during an approved attempt | stop and redact |
| `ERR_RESULT_BUDGET_EXCEEDED` | Result count is greater than zero for observe-lite | stop and redact |
| `ERR_RUNTIME_BUDGET_EXCEEDED` | Calls or duration exceed exact approval | stop |
| `ERR_CLIENT_SCOPE_VISIBILITY_MISSING` | Client id, workspace, owner, or visibility is absent | stop before runtime |
| `ERR_CROSS_CLIENT_LEAKAGE_RISK` | Client-private leakage risk appears | stop |
| `ERR_PROVIDER_API_REQUESTED` | Provider/API path is required or requested | stop |
| `ERR_PUBLIC_MCP_EXPANSION_REQUESTED` | Public MCP tool/schema expansion is required or requested | stop |
| `ERR_READINESS_OVERCLAIM` | Production, release, cutover, `RC_READY`, or complete V8 claim appears | correct claim and stop |

## Future Abort Receipt Shape

The shape below is a skeleton. It must not be filled with real runtime data
unless a future exact-approved attempt actually occurs.

```yaml
observe_lite_abort_receipt:
  receipt_id: <safe_receipt_id>
  source_packet_id: m6_observe_lite_exact_approval_packet_preparation_cm1722
  source_review_id: m6_observe_lite_exact_approval_decision_review_cm1723
  source_display_id: m6_observe_lite_exact_approval_request_display_cm1724
  profile: observe-lite
  abort_code: <safe_abort_code>
  abort_stage: <pre_runtime|during_exact_approved_observe_lite>
  exact_approval_present: <true|false>
  target_alias_present: <true|false>
  transport_present: <true|false>
  client_id_present: <true|false>
  workspace_scope_present: <true|false>
  owner_scope_present: <true|false>
  visibility_present: <true|false>
  runtime_calls_used: 0
  runtime_duration_seconds: 0
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  provider_api_calls_used: 0
  approval_line_value_disclosed: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  target_bound: false
  readiness_claimed: false
  fallback_executed: false
  next_action_allowed: stop_or_request_exact_boundary_from_jenn
```

## Skeleton Self-Check

Before any future abort receipt is accepted, the operator/agent must confirm:

1. The receipt says whether the abort happened before runtime or during an
   exact-approved observe-lite attempt.
2. The receipt uses one safe abort code from this document.
3. The receipt discloses no raw private value.
4. The receipt does not claim memory read/write, provider/API, public MCP
   expansion, fallback success, release, deploy, cutover, `RC_READY`, or
   complete V8 readiness.
5. The receipt preserves M5 client/scope/visibility boundaries.
6. The receipt cannot be mistaken for observe-full read proof.

If any item is false or uncertain, the receipt must be rejected and the route
remains blocked.

## Current Skeleton Result

```yaml
current_skeleton_result:
  decision: abort_receipt_skeleton_ready_no_runtime
  serves_project_final_goal: true
  runtime_attempt_performed: false
  exact_approval_present: false
  approval_request_submitted: false
  approval_line_present: false
  execution_authorized: false
  live_proof_claimed: false
  m6_completion_claimed: false
  next_safe_route: m6_closeout_blocked_summary_or_wait_for_exact_jenn_boundary
```

## M6-K4 Abort Skeleton Conclusion

M6-K4 completes a non-authorizing abort receipt skeleton for future
observe-lite attempts. It strengthens the fail-closed route for M6 but does not
complete M6 live target/handshake proof.

M6 remains blocked before live proof until Jenn supplies a separate exact
approval boundary and a future attempt produces an accepted observe-lite
receipt.
