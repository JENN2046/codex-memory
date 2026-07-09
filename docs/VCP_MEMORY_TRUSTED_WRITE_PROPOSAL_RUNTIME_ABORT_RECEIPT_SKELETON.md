# VCP Memory Trusted-Write-Proposal Runtime Abort Receipt Skeleton

Task id: `M9-K5-TRUSTED-WRITE-PROPOSAL-RUNTIME-ABORT-RECEIPT-SKELETON`
Implementation slice: `CM-1745`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_EXACT_APPROVAL_REQUEST_DISPLAY_BOUNDARY.md`
Evidence type: `docs-only`, `abort receipt skeleton`, `no-runtime`, `no-write`

## Purpose

This document defines the low-disclosure abort receipt skeleton for future
`trusted-write-proposal` attempts.

It is not a runtime attempt, target binding, approval request, approval grant,
approval-line generation, proposal generation, proposal submission, proposal
receipt, memory write, durable mutation, M10 unlock, readiness claim, or
fallback execution. It does not call VCPToolBox, inspect runtime, read memory,
write memory, call providers/APIs, read secrets/config, expand public MCP
tools, or push remote state.

## Abort Skeleton State

```yaml
abort_skeleton_state:
  skeleton_id: m9_trusted_write_proposal_runtime_abort_receipt_skeleton_cm1745
  source_display_id: m9_trusted_write_proposal_exact_approval_request_display_cm1744
  source_review_id: m9_trusted_write_proposal_exact_approval_decision_review_cm1743
  source_packet_id: m9_trusted_write_proposal_exact_approval_packet_preparation_cm1742
  source_harness_draft_id: m9_trusted_write_proposal_harness_draft_boundary_cm1741
  source_precondition_id: m9_trusted_write_proposal_blocked_precondition_cm1740
  profile: trusted-write-proposal
  runtime_attempt_performed: false
  accepted_m8_trusted_full_read_receipt_present: false
  exact_trusted_write_proposal_approval_present: false
  exact_proposal_fields_present: false
  proposal_review_route_present: false
  target_bound: false
  approval_line_present: false
  approval_line_generated: false
  approval_request_submitted: false
  execution_authorized: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposal_harness_started: false
  proposals_generated: 0
  proposals_submitted: 0
  memory_read_performed: false
  memory_write_performed: false
  durable_write_allowed: false
  durable_write_performed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
  current_result: abort_receipt_skeleton_ready_no_runtime
```

The skeleton exists so future exact-approved work can fail closed with a
consistent receipt if `trusted-write-proposal` execution is not allowed or
cannot safely continue.

## Abort Reason Vocabulary

Future `trusted-write-proposal` attempts must use only low-disclosure abort
codes. Receipts must not include raw targets, paths, endpoints, tokens,
cookies, credentials, provider auth material, raw runtime payloads, raw memory,
raw audit rows, raw sqlite/jsonl/cache/vector rows, raw DailyNote/RAG/prompt
content, generated approval-line values, or client private content.

| Abort code | Trigger | Required posture |
|---|---|---|
| `ERR_M8_TRUSTED_FULL_READ_RECEIPT_MISSING` | Accepted trusted-full-read workflow receipt absent | stop before proposal |
| `ERR_EXACT_TRUSTED_WRITE_PROPOSAL_APPROVAL_MISSING` | Current exact Jenn `trusted-write-proposal` boundary absent | stop before proposal |
| `ERR_EXACT_PROPOSAL_FIELD_MISSING` | Proposal scope, operation list, payload shape, review route, rollback posture, target, transport, scope, visibility, budget, or disclosure field missing | stop before proposal |
| `ERR_TARGET_ALIAS_AMBIGUOUS` | Target alias is stale, ambiguous, mismatched, or unsafe | stop before proposal |
| `ERR_TRANSPORT_AMBIGUOUS` | Transport is stale, ambiguous, mismatched, or unsafe | stop before proposal |
| `ERR_AUTH_OR_SECRET_REQUIRED` | Credentials, config, endpoint, path, token, cookie, provider auth, or private locator is required | stop without reading it |
| `ERR_CLIENT_SCOPE_VISIBILITY_MISSING` | Client ids, workspace, owner, or visibility are absent | stop before proposal |
| `ERR_CROSS_CLIENT_LEAKAGE_RISK` | Codex/Claude private leakage risk appears | stop and redact |
| `ERR_RAW_MEMORY_PAYLOAD_RETURNED` | Raw memory/private payload appears during an approved attempt | stop and redact |
| `ERR_PROPOSAL_BUDGET_EXCEEDED` | Proposal count exceeds exact approval | stop and redact |
| `ERR_RUNTIME_BUDGET_EXCEEDED` | Calls or duration exceed exact approval | stop |
| `ERR_REVIEW_ROUTE_MISSING` | Accept/reject route is absent or ambiguous | stop before proposal |
| `ERR_AUTO_ACCEPT_REQUESTED` | Proposal route implies automatic acceptance | stop |
| `ERR_DIRECT_WRITE_REQUESTED` | Direct write/update/supersede/tombstone is requested | stop |
| `ERR_DURABLE_WRITE_REQUESTED` | Durable write is requested in M9 | stop |
| `ERR_PROVIDER_API_REQUESTED` | Provider/API path is required or requested | stop |
| `ERR_PUBLIC_MCP_EXPANSION_REQUESTED` | Public MCP tool/schema expansion is required or requested | stop |
| `ERR_FALLBACK_SUCCESS_OVERCLAIM` | Fallback is treated as proposal-mode proof | correct claim and stop |
| `ERR_M10_UNLOCK_OVERCLAIM` | M10 unlock is claimed without accepted M9 proposal receipts | correct claim and stop |
| `ERR_READINESS_OVERCLAIM` | Production, release, cutover, `RC_READY`, or complete V8 claim appears | correct claim and stop |

## Future Abort Receipt Shape

The shape below is a skeleton. It must not be filled with real runtime or
proposal data unless a future exact-approved attempt actually occurs.

```yaml
trusted_write_proposal_abort_receipt:
  receipt_id: <safe_receipt_id>
  source_precondition_id: m9_trusted_write_proposal_blocked_precondition_cm1740
  source_harness_draft_id: m9_trusted_write_proposal_harness_draft_boundary_cm1741
  source_packet_id: m9_trusted_write_proposal_exact_approval_packet_preparation_cm1742
  source_review_id: m9_trusted_write_proposal_exact_approval_decision_review_cm1743
  source_display_id: m9_trusted_write_proposal_exact_approval_request_display_cm1744
  profile: trusted-write-proposal
  abort_code: <safe_abort_code>
  abort_stage: <pre_proposal|during_exact_approved_trusted_write_proposal>
  accepted_m8_trusted_full_read_receipt_present: <true|false>
  exact_trusted_write_proposal_approval_present: <true|false>
  exact_proposal_fields_present: <true|false>
  proposal_review_route_present: <true|false>
  target_alias_present: <true|false>
  transport_present: <true|false>
  client_ids_present: <true|false>
  workspace_scope_present: <true|false>
  owner_scope_present: <true|false>
  visibility_present: <true|false>
  runtime_calls_used: 0
  runtime_duration_seconds: 0
  memory_reads_used: 0
  proposals_generated: 0
  proposals_submitted: 0
  proposal_shape_captured: false
  memory_read_performed: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_calls_used: 0
  approval_line_value_disclosed: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  target_bound: false
  fallback_executed: false
  proposal_mode_evidence_claimed: false
  m10_unlocked: false
  readiness_claimed: false
  next_action_allowed: stop_or_request_exact_boundary_from_jenn
```

## Skeleton Self-Check

Before any future abort receipt is accepted, the operator/agent must confirm:

1. The receipt says whether the abort happened before proposal generation or
   during an exact-approved `trusted-write-proposal` attempt.
2. The receipt uses one safe abort code from this document.
3. The receipt discloses no raw private value.
4. The receipt does not claim proposal submission, durable memory write,
   provider/API, public MCP expansion, fallback success, M10 unlock, release,
   deploy, cutover, `RC_READY`, or complete V8 readiness.
5. The receipt preserves M5 client/scope/visibility boundaries.
6. The receipt cannot be mistaken for accepted M9 proposal-mode evidence.
7. The receipt cannot unlock M10 by itself.

If any item is false or uncertain, the receipt must be rejected and the route
remains blocked.

## Current Skeleton Result

```yaml
current_skeleton_result:
  decision: abort_receipt_skeleton_ready_no_runtime
  serves_project_final_goal: true
  runtime_attempt_performed: false
  accepted_m8_trusted_full_read_receipt_present: false
  exact_trusted_write_proposal_approval_present: false
  exact_proposal_fields_present: false
  proposal_review_route_present: false
  approval_request_submitted: false
  approval_line_present: false
  execution_authorized: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposal_mode_evidence_claimed: false
  m9_completion_claimed: false
  m10_unlocked: false
  next_safe_route: m9_blocked_closeout_summary_or_wait_for_exact_approval
```

## M9-K5 Abort Skeleton Conclusion

M9-K5 completes a non-authorizing abort receipt skeleton for future
`trusted-write-proposal` attempts. It strengthens the fail-closed route for M9
but does not complete M9 proposal-mode evidence.

M9 remains blocked before proposal generation and M10 unlock until Jenn
supplies a separate exact approval boundary and a future attempt produces
accepted non-durable proposal receipts.
