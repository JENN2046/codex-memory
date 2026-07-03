# VCP Memory Observe-Full Exact Approval Decision Review Boundary

Task id: `M7-K2-OBSERVE-FULL-EXACT-APPROVAL-DECISION-REVIEW`
Implementation slice: `CM-1729`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_FULL_EXACT_APPROVAL_PACKET_PREPARATION.md`
Evidence type: `docs-only`, `approval decision review boundary`, `no-runtime`

## Purpose

This document reviews the CM-1728 observe-full packet preparation and defines
the non-authorizing decision boundary before any future exact approval request
or read-shape runtime execution.

It does not generate, submit, issue, consume, store, simulate, or expose a real
approval line. It does not bind a live target, provide a real query, call
VCPToolBox, inspect runtime, read memory, write memory, call providers/APIs,
read secrets/config, expand public MCP tools, unlock M8, or claim readiness.

## Review State

```yaml
review_state:
  review_id: m7_observe_full_exact_approval_decision_review_cm1729
  source_packet_id: m7_observe_full_exact_approval_packet_preparation_cm1728
  source_precondition_record: cm1727
  profile: observe-full
  exact_fields_complete: false
  m6_observe_lite_receipt_accepted: false
  exact_read_shape_approval_present: false
  query_present: false
  exact_approval_decision: not_requested
  approval_line_present: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  execution_authorized: false
  live_runtime_call_performed: false
  read_shape_proof_started: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  fallback_executed: false
  m8_unlocked: false
  readiness_claimed: false
  current_decision: blocked_before_runtime_missing_m6_receipt_and_exact_read_approval
```

The current decision is a stop before runtime, not an approval denial and not a
read-shape result.

## Required Input Review

CM-1728 intentionally left future exact fields unset and did not include a
real query. CM-1729 treats that as a valid preparation state and a hard runtime
blocker.

| Required input | Current state | Review outcome |
|---|---|---|
| `m6_receipt_id` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `transport` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `query` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `client_id` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `max_calls` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `max_results` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `output_disclosure` | redacted shape / metadata only | compatible with future M7 |

## Decision Matrix

| Condition | Decision | Meaning |
|---|---|---|
| Accepted M6 receipt, current Jenn exact read-shape approval, exact query, exact budgets, and M5 checks are all present | `ready_for_human_exact_read_approval_request_review` | A future request can be reviewed; still not approval |
| Accepted M6 receipt is missing | `blocked_before_runtime_missing_m6_receipt` | Current CM-1729 blocker |
| Jenn exact read-shape approval is missing | `blocked_before_runtime_missing_exact_read_approval` | Current CM-1729 blocker |
| Query is missing, generated, guessed, broad, or ambiguous | `blocked_before_runtime_query_not_exact` | Stop before runtime |
| Any exact field is missing, stale, ambiguous, or mismatched | `blocked_before_runtime_exact_fields_missing` | Stop before runtime |
| A real approval line value, template, token, secret, endpoint, path, locator, or raw payload is present | `reject_packet_redaction_required` | Remove sensitive/authorizing material before review |
| Any write, broad scan, provider/API, fallback success, public MCP expansion, or readiness claim is requested | `blocked_l4_scope_expansion` | Stop and adjust plan |
| The packet claims M7 read-shape proof without an accepted exact-approved receipt | `reject_readiness_overclaim` | Correct the claim; no read-shape proof exists |

## Review Checklist

Before any future exact M7 approval request can be displayed or reviewed, the
operator/agent must confirm:

1. The task still serves the VCPToolBox-native governed bridge goal.
2. An accepted M6 observe-lite receipt exists.
3. Jenn supplied current exact read-shape approval.
4. The query is exact, bounded, and supplied by Jenn in the current context.
5. Result, call, and duration budgets are exact.
6. Output remains redacted shape/metadata only.
7. Client identity, workspace scope, owner scope, and visibility are exact.
8. Writes, broad scans, fallback execution, provider/API calls, and raw output
   remain forbidden.
9. The packet does not include a real approval-line value or template.
10. The request does not claim M8 unlock, production, release, cutover,
    `RC_READY`, or complete V8 readiness.

If any item is false or uncertain, the route remains blocked before runtime.

## Current Review Result

CM-1729 reviews CM-1728 as aligned with M7 preparation and M5 governance, but
not executable.

```yaml
current_review_result:
  decision: blocked_before_runtime_missing_m6_receipt_and_exact_read_approval
  serves_project_final_goal: true
  source_packet_reviewed: true
  exact_fields_complete: false
  m6_observe_lite_receipt_accepted: false
  exact_read_shape_approval_present: false
  query_present: false
  human_exact_approval_required_before_request_or_execution: true
  execution_authorized_by_review: false
  read_shape_proof_claimed: false
  m8_unlocked: false
  next_safe_route: prepare_non_authorizing_m7_request_display_boundary_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
observe_full_approval_decision_review_receipt:
  receipt_id: cm1729_observe_full_exact_approval_decision_review
  source_packet_id: m7_observe_full_exact_approval_packet_preparation_cm1728
  decision: blocked_before_runtime_missing_m6_receipt_and_exact_read_approval
  exact_fields_complete: false
  m6_observe_lite_receipt_accepted: false
  exact_read_shape_approval_present: false
  query_present: false
  exact_approval_decision: not_requested
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  execution_authorized_by_review: false
  runtime_calls_used: 0
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  fallback_executed: false
  m8_unlocked: false
  readiness_claimed: false
  next_action_allowed: non_authorizing_request_display_or_exact_approval_from_jenn
```

## M7-K2 Review Boundary Conclusion

M7-K2 completes a non-authorizing observe-full approval decision/review
boundary. The correct current outcome is
`blocked_before_runtime_missing_m6_receipt_and_exact_read_approval`.

M7 read-shape proof remains blocked until an accepted M6 observe-lite receipt
and a separate current exact Jenn read-shape approval exist.
