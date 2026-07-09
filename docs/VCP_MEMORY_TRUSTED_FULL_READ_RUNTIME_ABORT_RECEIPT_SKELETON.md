# VCP Memory Trusted-Full-Read Runtime Abort Receipt Skeleton

Task id: `M8-K5-TRUSTED-FULL-READ-RUNTIME-ABORT-RECEIPT-SKELETON`
Implementation slice: `CM-1738`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_FULL_READ_EXACT_APPROVAL_REQUEST_DISPLAY_BOUNDARY.md`
Evidence type: `docs-only`, `abort receipt skeleton`, `no-runtime`

## Purpose

This document defines the low-disclosure abort receipt skeleton for future
trusted-full-read workflow attempts.

It is not a runtime attempt, target binding, workflow execution, approval
request, approval grant, approval-line generation, trusted-full-read evidence,
M9 unlock, readiness claim, or fallback execution. It does not call
VCPToolBox, inspect runtime, read memory, write memory, call providers/APIs,
read secrets/config, expand public MCP tools, or push remote state.

## Abort Skeleton State

```yaml
abort_skeleton_state:
  skeleton_id: m8_trusted_full_read_runtime_abort_receipt_skeleton_cm1738
  source_display_id: m8_trusted_full_read_exact_approval_request_display_cm1737
  source_review_id: m8_trusted_full_read_exact_approval_decision_review_cm1736
  source_packet_id: m8_trusted_full_read_exact_approval_packet_preparation_cm1735
  source_harness_draft_id: m8_trusted_full_read_harness_draft_boundary_cm1734
  source_precondition_id: m8_trusted_full_read_blocked_precondition_record_cm1733
  profile: trusted-full-read
  runtime_attempt_performed: false
  accepted_m7_read_shape_receipt_present: false
  exact_trusted_full_read_approval_present: false
  exact_workflow_fields_present: false
  target_bound: false
  approval_line_present: false
  approval_line_generated: false
  approval_request_submitted: false
  execution_authorized: false
  workflow_harness_started: false
  workflow_execution_authorized: false
  workflow_steps_executed: 0
  memory_read_performed: false
  memory_write_performed: false
  checkpoint_handoff_audit_write_performed: false
  durable_write_allowed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  fallback_executed: false
  m9_unlocked: false
  readiness_claimed: false
  current_result: abort_receipt_skeleton_ready_no_runtime
```

The skeleton exists so future exact-approved work can fail closed with a
consistent receipt if trusted-full-read workflow execution is not allowed or
cannot safely continue.

## Abort Reason Vocabulary

Future trusted-full-read attempts must use only low-disclosure abort codes.
Receipts must not include raw targets, paths, endpoints, tokens, cookies,
credentials, provider auth material, raw runtime payloads, raw memory, raw
audit rows, raw sqlite/jsonl/cache/vector rows, raw DailyNote/RAG/prompt
content, or client private content.

| Abort code | Trigger | Required posture |
|---|---|---|
| `ERR_M7_READ_SHAPE_RECEIPT_MISSING` | Accepted observe-full read-shape receipt absent | stop before workflow |
| `ERR_EXACT_TRUSTED_FULL_READ_APPROVAL_MISSING` | Current exact Jenn trusted-full-read boundary absent | stop before workflow |
| `ERR_EXACT_WORKFLOW_FIELD_MISSING` | Workflow operation, step cap, target, transport, scope, visibility, budget, or disclosure field missing | stop before workflow |
| `ERR_TARGET_ALIAS_AMBIGUOUS` | Target alias is stale, ambiguous, mismatched, or unsafe | stop before workflow |
| `ERR_TRANSPORT_AMBIGUOUS` | Transport is stale, ambiguous, mismatched, or unsafe | stop before workflow |
| `ERR_AUTH_OR_SECRET_REQUIRED` | Credentials, config, endpoint, path, token, cookie, provider auth, or private locator is required | stop without reading it |
| `ERR_CLIENT_SCOPE_VISIBILITY_MISSING` | Client ids, workspace, owner, or visibility are absent | stop before workflow |
| `ERR_CROSS_CLIENT_LEAKAGE_RISK` | Codex/Claude private leakage risk appears | stop and redact |
| `ERR_RAW_MEMORY_PAYLOAD_RETURNED` | Raw memory/private payload appears during an approved attempt | stop and redact |
| `ERR_RESULT_BUDGET_EXCEEDED` | Result count exceeds exact approval | stop and redact |
| `ERR_RUNTIME_BUDGET_EXCEEDED` | Calls, steps, or duration exceed exact approval | stop |
| `ERR_CHECKPOINT_HANDOFF_AUDIT_WRITE_REQUESTED` | A checkpoint, handoff, or audit write would become durable memory mutation | stop |
| `ERR_WRITE_OR_PROPOSAL_REQUESTED` | Memory write or write-proposal mode is requested | stop |
| `ERR_PROVIDER_API_REQUESTED` | Provider/API path is required or requested | stop |
| `ERR_PUBLIC_MCP_EXPANSION_REQUESTED` | Public MCP tool/schema expansion is required or requested | stop |
| `ERR_FALLBACK_SUCCESS_OVERCLAIM` | Fallback is treated as trusted-full-read proof | correct claim and stop |
| `ERR_M9_UNLOCK_OVERCLAIM` | M9 unlock is claimed without accepted M8 trusted-full-read evidence | correct claim and stop |
| `ERR_READINESS_OVERCLAIM` | Production, release, cutover, `RC_READY`, or complete V8 claim appears | correct claim and stop |

## Future Abort Receipt Shape

The shape below is a skeleton. It must not be filled with real runtime data
unless a future exact-approved attempt actually occurs.

```yaml
trusted_full_read_abort_receipt:
  receipt_id: <safe_receipt_id>
  source_precondition_id: m8_trusted_full_read_blocked_precondition_record_cm1733
  source_harness_draft_id: m8_trusted_full_read_harness_draft_boundary_cm1734
  source_packet_id: m8_trusted_full_read_exact_approval_packet_preparation_cm1735
  source_review_id: m8_trusted_full_read_exact_approval_decision_review_cm1736
  source_display_id: m8_trusted_full_read_exact_approval_request_display_cm1737
  profile: trusted-full-read
  abort_code: <safe_abort_code>
  abort_stage: <pre_workflow|during_exact_approved_trusted_full_read>
  accepted_m7_read_shape_receipt_present: <true|false>
  exact_trusted_full_read_approval_present: <true|false>
  exact_workflow_fields_present: <true|false>
  target_alias_present: <true|false>
  transport_present: <true|false>
  client_ids_present: <true|false>
  workspace_scope_present: <true|false>
  owner_scope_present: <true|false>
  visibility_present: <true|false>
  runtime_calls_used: 0
  workflow_steps_executed: 0
  runtime_duration_seconds: 0
  memory_results_returned: 0
  normalized_shape_captured: false
  memory_read_performed: false
  memory_write_performed: false
  checkpoint_handoff_audit_write_performed: false
  provider_api_calls_used: 0
  approval_line_value_disclosed: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  target_bound: false
  fallback_executed: false
  trusted_full_read_evidence_claimed: false
  m9_unlocked: false
  readiness_claimed: false
  next_action_allowed: stop_or_request_exact_boundary_from_jenn
```

## Skeleton Self-Check

Before any future abort receipt is accepted, the operator/agent must confirm:

1. The receipt says whether the abort happened before workflow or during an
   exact-approved trusted-full-read attempt.
2. The receipt uses one safe abort code from this document.
3. The receipt discloses no raw private value.
4. The receipt does not claim durable memory write, provider/API, public MCP
   expansion, fallback success, M9 unlock, release, deploy, cutover,
   `RC_READY`, or complete V8 readiness.
5. The receipt preserves M5 client/scope/visibility boundaries.
6. The receipt cannot be mistaken for accepted M8 trusted-full-read evidence.
7. The receipt cannot unlock M9 by itself.

If any item is false or uncertain, the receipt must be rejected and the route
remains blocked.

## Current Skeleton Result

```yaml
current_skeleton_result:
  decision: abort_receipt_skeleton_ready_no_runtime
  serves_project_final_goal: true
  runtime_attempt_performed: false
  accepted_m7_read_shape_receipt_present: false
  exact_trusted_full_read_approval_present: false
  exact_workflow_fields_present: false
  approval_request_submitted: false
  approval_line_present: false
  execution_authorized: false
  workflow_execution_authorized: false
  workflow_harness_started: false
  trusted_full_read_evidence_claimed: false
  m8_completion_claimed: false
  m9_unlocked: false
  next_safe_route: m8_blocked_closeout_summary_or_wait_for_exact_approval
```

## M8-K5 Abort Skeleton Conclusion

M8-K5 completes a non-authorizing abort receipt skeleton for future
trusted-full-read workflow attempts. It strengthens the fail-closed route for
M8 but does not complete M8 trusted-full-read evidence.

M8 remains blocked before trusted-full-read workflow and M9 unlock until Jenn
supplies a separate exact approval boundary and a future attempt produces an
accepted trusted-full-read receipt.
