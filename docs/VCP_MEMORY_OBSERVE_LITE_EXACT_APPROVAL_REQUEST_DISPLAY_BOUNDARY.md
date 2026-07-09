# VCP Memory Observe-Lite Exact Approval Request Display Boundary

Task id: `M6-K3-OBSERVE-LITE-EXACT-APPROVAL-REQUEST-DISPLAY`
Implementation slice: `CM-1724`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_EXACT_APPROVAL_DECISION_REVIEW_BOUNDARY.md`
Evidence type: `docs-only`, `approval request display boundary`, `no-runtime`

## Purpose

This document defines the non-authorizing display boundary for a future
human-facing observe-lite exact approval request.

It is not an approval request submission, approval-line generation, approval
grant, runtime authorization, target binding, live proof, or readiness claim.
It does not call VCPToolBox, inspect runtime, read memory, write memory, call
providers/APIs, read secrets/config, expand public MCP tools, or push remote
state.

## Display State

```yaml
display_state:
  display_id: m6_observe_lite_exact_approval_request_display_cm1724
  source_review_id: m6_observe_lite_exact_approval_decision_review_cm1723
  source_packet_id: m6_observe_lite_exact_approval_packet_preparation_cm1722
  profile: observe-lite
  display_ready_as_exact_request: false
  exact_fields_complete: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  execution_authorized: false
  live_runtime_call_performed: false
  target_bound: false
  memory_read_allowed: false
  memory_write_allowed: false
  provider_api_allowed: false
  secret_or_config_read_allowed: false
  readiness_claim_allowed: false
  current_decision: blocked_before_runtime_exact_fields_missing
```

The display boundary can help a future review, but the current document itself
cannot authorize anything.

## Required Future Inputs

The future human-facing request must not be displayed as an exact request until
Jenn provides all required values in the current context. Values remain absent
here by design.

| Field | Current value | Display rule |
|---|---|---|
| `target_alias` | `EXACT_REQUIRED_FROM_JENN` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_FROM_JENN` | one exact transport only |
| `client_id` | `EXACT_REQUIRED_FROM_JENN` | exact client family or alias |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | `private`, `shared`, or `public` with explicit boundary |
| `max_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 1 |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 60 |
| `max_results` | `0` | fixed for observe-lite |
| `output_disclosure` | `target/handshake metadata only` | no raw ids, paths, content, prompts, memory payloads, or private data |

## Non-Authorizing Display Template

The future display may use the shape below only after Jenn supplies exact safe
values. This template must not be treated as approval.

```yaml
future_observe_lite_exact_approval_request_display:
  request_id: <safe_request_id>
  profile: observe-lite
  target_alias: <exact_safe_alias_from_jenn>
  transport: <exact_transport_from_jenn>
  client_id: <exact_client_id_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_from_jenn>
  max_calls: <exact_integer_from_jenn>
  max_duration_seconds: <exact_integer_from_jenn>
  max_results: 0
  output_disclosure: target/handshake metadata only
  allowed_actions:
    - target_alias_presence_check
    - transport_handshake_check
    - low_disclosure_receipt_generation
  forbidden_actions:
    - memory_read
    - memory_write
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - broad_discovery
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
  approval_line_value: omitted
  execution_authorized_by_display: false
  submission_status: not_submitted_by_template
```

## Display Stop Rules

The display must not be rendered as a request if:

- any required exact field is missing, stale, ambiguous, or mismatched;
- target or transport would require reading secrets, config, paths, endpoints,
  tokens, cookies, credentials, provider auth, or private locator values;
- any memory read/write, broad scan, import/export, migration, backfill,
  provider/API, public MCP expansion, config/startup/watchdog change, push,
  release, deploy, cutover, or readiness claim is requested;
- raw runtime, raw memory, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt data, or private client content would be exposed;
- a real approval-line value or template is included.

## Current Display Result

```yaml
current_display_result:
  decision: not_display_ready_as_exact_request
  blocker: exact_fields_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_request_submission_or_execution: true
  request_submitted: false
  execution_authorized_by_display: false
  live_proof_claimed: false
  next_safe_route: wait_for_exact_jenn_boundary_or_prepare_runtime_abort_receipt_skeleton
```

## Receipt Skeleton

```yaml
observe_lite_request_display_receipt:
  receipt_id: cm1724_observe_lite_exact_approval_request_display_boundary
  source_review_id: m6_observe_lite_exact_approval_decision_review_cm1723
  decision: not_display_ready_as_exact_request
  exact_fields_complete: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized_by_display: false
  runtime_calls_used: 0
  target_bound: false
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  readiness_claimed: false
  next_action_allowed: exact_boundary_from_jenn_required_before_runtime
```

## M6-K3 Display Boundary Conclusion

M6-K3 completes a non-authorizing display boundary for a future observe-lite
exact approval request. The current result is
`not_display_ready_as_exact_request` because required exact fields are missing.

The plan remains blocked before M6 live target/handshake proof until Jenn
provides a separate exact approval boundary.
