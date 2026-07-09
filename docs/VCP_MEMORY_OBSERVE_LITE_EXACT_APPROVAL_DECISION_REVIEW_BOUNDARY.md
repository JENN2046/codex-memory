# VCP Memory Observe-Lite Exact Approval Decision Review Boundary

Task id: `M6-K2-OBSERVE-LITE-EXACT-APPROVAL-DECISION-REVIEW`
Implementation slice: `CM-1723`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_EXACT_APPROVAL_PACKET_PREPARATION.md`
Evidence type: `docs-only`, `approval decision review boundary`, `no-runtime`

## Purpose

This document reviews the CM-1722 observe-lite packet preparation and defines
the non-authorizing decision boundary before any future exact approval request
or runtime execution.

It does not generate, submit, issue, consume, store, simulate, or expose a real
approval line. It does not bind a live target, call VCPToolBox, inspect
runtime, read memory, write memory, call providers/APIs, read secrets/config,
expand public MCP tools, or claim readiness.

## Review State

```yaml
review_state:
  review_id: m6_observe_lite_exact_approval_decision_review_cm1723
  source_packet_id: m6_observe_lite_exact_approval_packet_preparation_cm1722
  profile: observe-lite
  exact_fields_complete: false
  exact_approval_decision: not_requested
  approval_line_present: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  execution_authorized: false
  live_runtime_call_performed: false
  target_bound: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  readiness_claimed: false
  current_decision: blocked_before_runtime_exact_fields_missing
```

The current decision is a stop before runtime, not an approval denial and not a
runtime result.

## Required Input Review

CM-1722 intentionally left future exact fields unset. CM-1723 treats that as a
valid preparation state and a hard runtime blocker.

| Required input | Current state | Review outcome |
|---|---|---|
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `transport` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `client_id` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `max_calls` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | blocks runtime |
| `max_results` | `0` | compatible with observe-lite |
| `output_disclosure` | target/handshake metadata only | compatible with observe-lite |

## Decision Matrix

| Condition | Decision | Meaning |
|---|---|---|
| All exact fields are provided by Jenn in the current context, low-disclosure output remains bounded, and M5 checks pass | `ready_for_human_exact_approval_request_review` | A future request can be reviewed; still not approval |
| Any exact field is missing, stale, ambiguous, or mismatched | `blocked_before_runtime_exact_fields_missing` | Current CM-1723 outcome |
| A real approval line value, template, token, secret, endpoint, path, or locator is present in the packet | `reject_packet_redaction_required` | Remove sensitive/authorizing material before review |
| Target/transport requires secret/config/auth discovery | `blocked_before_runtime_secret_or_config_required` | Stop before inspection |
| Any memory result, private payload, raw runtime data, provider/API path, durable write, broad scan, public MCP expansion, or readiness claim is requested | `blocked_l4_scope_expansion` | Stop and adjust plan |
| The packet claims M6 live proof without a receipt from an exact-approved observe-lite call | `reject_readiness_overclaim` | Correct the claim; no live proof exists |

## Review Checklist

Before any future exact approval request can be displayed or reviewed, the
operator/agent must confirm:

1. The task still serves the VCPToolBox-native governed bridge goal.
2. The request is for `observe-lite` target/handshake metadata only.
3. Memory read/write remains forbidden.
4. Provider/API calls remain forbidden.
5. Secret/config/env reads remain forbidden.
6. Raw runtime/private output remains forbidden.
7. Client identity, workspace scope, owner scope, and visibility are exact.
8. Runtime call and duration budgets are exact and bounded.
9. The packet does not include a real approval-line value or template.
10. The request does not claim production, release, cutover, `RC_READY`, or
    complete V8 readiness.

If any item is false or uncertain, the route remains blocked before runtime.

## Current Review Result

CM-1723 reviews CM-1722 as aligned with M6 preparation and M5 governance, but
not executable.

```yaml
current_review_result:
  decision: blocked_before_runtime_exact_fields_missing
  serves_project_final_goal: true
  source_packet_reviewed: true
  exact_fields_complete: false
  human_exact_approval_required_before_request_or_execution: true
  execution_authorized_by_review: false
  live_proof_claimed: false
  next_safe_route: prepare_non_authorizing_human_facing_request_boundary_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
observe_lite_approval_decision_review_receipt:
  receipt_id: cm1723_observe_lite_exact_approval_decision_review
  source_packet_id: m6_observe_lite_exact_approval_packet_preparation_cm1722
  decision: blocked_before_runtime_exact_fields_missing
  exact_fields_complete: false
  exact_approval_decision: not_requested
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  execution_authorized_by_review: false
  runtime_calls_used: 0
  target_bound: false
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  readiness_claimed: false
  next_action_allowed: non_authorizing_request_boundary_or_exact_approval_from_jenn
```

## M6-K2 Review Boundary Conclusion

M6-K2 completes a non-authorizing observe-lite approval decision/review
boundary. The correct current outcome is
`blocked_before_runtime_exact_fields_missing`.

M6 live target/handshake proof remains blocked until Jenn supplies a separate,
current, exact approval boundary with exact target, transport, client, scope,
visibility, budget, and disclosure fields.
