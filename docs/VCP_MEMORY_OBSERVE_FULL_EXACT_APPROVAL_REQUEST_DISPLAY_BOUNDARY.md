# VCP Memory Observe-Full Exact Approval Request Display Boundary

Task id: `M7-K3-OBSERVE-FULL-EXACT-APPROVAL-REQUEST-DISPLAY`
Implementation slice: `CM-1730`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_FULL_EXACT_APPROVAL_DECISION_REVIEW_BOUNDARY.md`
Evidence type: `docs-only`, `approval request display boundary`, `no-runtime`

## Purpose

This document defines the non-authorizing display boundary for a future
human-facing observe-full exact approval request.

It is not an approval request submission, approval-line generation, approval
grant, runtime authorization, target binding, read-shape proof, or M8 unlock.
It does not call VCPToolBox, inspect runtime, read memory, write memory, call
providers/APIs, read secrets/config, expand public MCP tools, or push remote
state.

## Display State

```yaml
display_state:
  display_id: m7_observe_full_exact_approval_request_display_cm1730
  source_review_id: m7_observe_full_exact_approval_decision_review_cm1729
  source_packet_id: m7_observe_full_exact_approval_packet_preparation_cm1728
  source_precondition_id: m7_observe_full_blocked_precondition_cm1727
  profile: observe-full
  display_ready_as_exact_request: false
  exact_fields_complete: false
  m6_observe_lite_receipt_accepted: false
  exact_read_shape_approval_present: false
  query_present: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  execution_authorized: false
  read_shape_proof_started: false
  live_runtime_call_performed: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  fallback_executed: false
  m8_unlocked: false
  readiness_claimed: false
  current_decision: not_display_ready_missing_m6_receipt_and_exact_read_approval
```

The display boundary can help a future review, but the current document itself
cannot authorize anything.

## Required Future Inputs

The future human-facing request must not be displayed as an exact request until
Jenn provides all required values in the current context. Values remain absent
here by design.

| Field | Current value | Display rule |
|---|---|---|
| `m6_receipt_id` | `EXACT_REQUIRED_FROM_JENN` | accepted observe-lite receipt id only; no raw runtime payload |
| `target_alias` | `EXACT_REQUIRED_FROM_JENN` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_FROM_JENN` | one exact transport only |
| `profile` | `observe-full` | fixed profile for M7 read-shape proof |
| `query` | `EXACT_REQUIRED_FROM_JENN` | exact bounded query text supplied by Jenn; no invented query |
| `client_id` | `EXACT_REQUIRED_FROM_JENN` | exact client family or alias |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | `private`, `shared`, or `public` with explicit boundary |
| `max_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 1 |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 60 |
| `max_results` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 3 |
| `output_disclosure` | `metadata and normalized shape only` | no raw ids, paths, content, prompts, memory payloads, or private data |

## Non-Authorizing Display Template

The future display may use the shape below only after Jenn supplies exact safe
values and the M6 observe-lite receipt is accepted. This template must not be
treated as approval.

```yaml
future_observe_full_exact_approval_request_display:
  request_id: <safe_request_id>
  profile: observe-full
  m6_receipt_id: <accepted_observe_lite_receipt_id_from_jenn>
  target_alias: <exact_safe_alias_from_jenn>
  transport: <exact_transport_from_jenn>
  query: <exact_bounded_query_from_jenn>
  client_id: <exact_client_id_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_from_jenn>
  max_calls: <exact_integer_from_jenn>
  max_duration_seconds: <exact_integer_from_jenn>
  max_results: <exact_integer_from_jenn>
  output_disclosure: metadata and normalized shape only
  allowed_actions:
    - bounded_read_shape_call
    - response_shape_capture
    - redacted_metadata_receipt_generation
    - normalization_gap_listing
    - policy_evaluation
  forbidden_actions:
    - memory_write
    - broad_scan
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - fallback_success_claim
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
    - m8_unlock_claim
  approval_line_value: omitted
  execution_authorized_by_display: false
  submission_status: not_submitted_by_template
```

## Display Stop Rules

The display must not be rendered as a request if:

- the accepted M6 observe-lite receipt is missing, stale, ambiguous, or
  rejected;
- Jenn exact read-shape approval is missing, stale, ambiguous, or mismatched;
- any required exact field is missing, stale, ambiguous, or mismatched;
- the exact bounded query is missing or invented by the agent;
- target or transport would require reading secrets, config, paths, endpoints,
  tokens, cookies, credentials, provider auth, or private locator values;
- any memory write, broad scan, import/export, migration, backfill,
  provider/API, public MCP expansion, config/startup/watchdog change, push,
  release, deploy, cutover, or readiness claim is requested;
- raw runtime, raw memory, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt data, or private client content would be exposed;
- a real approval-line value or template is included.

## Current Display Result

```yaml
current_display_result:
  decision: not_display_ready_missing_m6_receipt_and_exact_read_approval
  blocker: m6_receipt_and_exact_read_approval_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_request_submission_or_execution: true
  request_submitted: false
  execution_authorized_by_display: false
  read_shape_proof_claimed: false
  m8_unlocked: false
  next_safe_route: m7_abort_receipt_skeleton_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
observe_full_request_display_receipt:
  receipt_id: cm1730_observe_full_exact_approval_request_display_boundary
  source_review_id: m7_observe_full_exact_approval_decision_review_cm1729
  decision: not_display_ready_missing_m6_receipt_and_exact_read_approval
  exact_fields_complete: false
  m6_observe_lite_receipt_accepted: false
  exact_read_shape_approval_present: false
  query_present: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized_by_display: false
  runtime_calls_used: 0
  memory_results_returned: 0
  read_shape_proof_started: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  fallback_executed: false
  m8_unlocked: false
  readiness_claimed: false
  next_action_allowed: accepted_m6_receipt_and_exact_read_approval_required_before_runtime
```

## M7-K3 Display Boundary Conclusion

M7-K3 completes a non-authorizing display boundary for a future observe-full
exact approval request. The current result is
`not_display_ready_missing_m6_receipt_and_exact_read_approval` because the
accepted M6 observe-lite receipt, exact Jenn read-shape approval, and exact
bounded query are missing.

The plan remains blocked before M7 read-shape proof and M8 unlock until Jenn
provides a separate exact approval boundary.
