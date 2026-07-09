# VCP Memory Trusted-Write-Proposal Exact Approval Request Display Boundary

Task id: `M9-K4-TRUSTED-WRITE-PROPOSAL-EXACT-APPROVAL-REQUEST-DISPLAY`
Implementation slice: `CM-1744`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_EXACT_APPROVAL_DECISION_REVIEW_BOUNDARY.md`
Evidence type: `docs-only`, `approval request display boundary`, `no-runtime`, `no-write`

## Purpose

This document defines the non-authorizing display boundary for a future
human-facing `trusted-write-proposal` exact approval request.

It is not an approval request submission, approval-line generation, approval
grant, runtime authorization, target binding, proposal generation, proposal
submission, memory write, durable mutation, M10 unlock, or readiness claim. It
does not call VCPToolBox, inspect runtime, read memory, write memory, call
providers/APIs, read secrets/config, expand public MCP tools, or push remote
state.

## Display State

```yaml
display_state:
  display_id: m9_trusted_write_proposal_exact_approval_request_display_cm1744
  source_review_id: m9_trusted_write_proposal_exact_approval_decision_review_cm1743
  source_packet_id: m9_trusted_write_proposal_exact_approval_packet_preparation_cm1742
  source_harness_draft_id: m9_trusted_write_proposal_harness_draft_boundary_cm1741
  source_precondition_id: m9_trusted_write_proposal_blocked_precondition_cm1740
  profile: trusted-write-proposal
  display_ready_as_exact_request: false
  exact_fields_complete: false
  m8_trusted_full_read_receipt_accepted: false
  trusted_write_proposal_profile_approved: false
  exact_proposal_fields_present: false
  proposal_review_route_present: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposal_harness_started: false
  proposals_generated: 0
  proposals_submitted: 0
  live_runtime_call_performed: false
  memory_read_performed: false
  memory_write_performed: false
  durable_write_allowed: false
  durable_write_performed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
  current_decision: not_display_ready_missing_m8_receipt_and_exact_trusted_write_proposal_approval
```

The display boundary can help a future review, but the current document itself
cannot authorize, submit, or render a real exact approval request.

## Required Future Inputs

The future human-facing request must not be displayed as an exact request until
Jenn provides all required values in the current context. Values remain absent
here by design.

| Field | Current value | Display rule |
|---|---|---|
| `m8_trusted_full_read_receipt_id` | `EXACT_REQUIRED_FROM_JENN` | accepted trusted-full-read workflow receipt id only; no raw runtime payload |
| `target_alias` | `EXACT_REQUIRED_FROM_JENN` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_FROM_JENN` | one exact approved transport only |
| `profile` | `trusted-write-proposal` | fixed non-durable proposal profile |
| `proposal_scope` | `EXACT_REQUIRED_FROM_JENN` | exact memory surface, topic, client, and visibility boundary |
| `proposal_operations` | `EXACT_REQUIRED_FROM_JENN` | exact non-durable operation list supplied by Jenn |
| `proposal_payload_shape` | `EXACT_REQUIRED_FROM_JENN` | exact redacted proposal shape; no raw private payload |
| `client_ids` | `EXACT_REQUIRED_FROM_JENN` | exact Codex/Claude client ids or safe aliases |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | exact per-client visibility boundary |
| `review_route` | `EXACT_REQUIRED_FROM_JENN` | exact accept/reject route; no auto-accept |
| `rollback_posture` | `EXACT_REQUIRED_FROM_JENN` | exact rollback/supersession/tombstone posture without applying it |
| `max_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer runtime-call budget |
| `max_proposals` | `EXACT_REQUIRED_FROM_JENN` | exact integer proposal budget |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer duration budget |
| `output_disclosure` | `EXACT_REQUIRED_FROM_JENN` | redacted proposal shape/metadata only unless separately exact-approved |
| `receipt_plan` | `EXACT_REQUIRED_FROM_JENN` | proposal receipt and rollback posture only |
| `write_allowed` | `false` | direct writes forbidden in M9 |
| `durable_write_allowed` | `false` | durable writes forbidden in M9 |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |

## Non-Authorizing Display Template

The future display may use the shape below only after Jenn supplies exact safe
values and the M8 trusted-full-read workflow receipt is accepted. This template
must not be treated as approval.

```yaml
future_trusted_write_proposal_exact_approval_request_display:
  request_id: <safe_request_id>
  profile: trusted-write-proposal
  m8_trusted_full_read_receipt_id: <accepted_trusted_full_read_receipt_id_from_jenn>
  target_alias: <exact_safe_alias_from_jenn>
  transport: <exact_transport_from_jenn>
  proposal_scope: <exact_proposal_scope_from_jenn>
  proposal_operations: <exact_non_durable_operation_list_from_jenn>
  proposal_payload_shape: <exact_low_disclosure_shape_from_jenn>
  client_ids: <exact_client_ids_or_safe_aliases_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_boundary_from_jenn>
  review_route: <exact_accept_reject_route_from_jenn>
  rollback_posture: <exact_rollback_posture_from_jenn>
  max_calls: <exact_integer_from_jenn>
  max_proposals: <exact_integer_from_jenn>
  max_duration_seconds: <exact_integer_from_jenn>
  output_disclosure: redacted proposal shape metadata only
  receipt_plan: <exact_proposal_receipt_rules_from_jenn>
  allowed_actions:
    - proposal_request_review
    - proposal_scope_policy_evaluation
    - client_scope_visibility_policy_evaluation
    - rollback_posture_review
    - abort_receipt_generation
  forbidden_actions:
    - proposal_generation
    - proposal_submission
    - memory_write
    - durable_write
    - direct_update
    - direct_supersede
    - direct_tombstone
    - broad_scan
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - fallback_success_claim
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
    - m10_unlock_claim
  approval_line_value: omitted
  execution_authorized_by_display: false
  proposal_generation_authorized_by_display: false
  proposal_submission_authorized_by_display: false
  durable_write_authorized_by_display: false
  submission_status: not_submitted_by_template
```

## Display Stop Rules

The display must not be rendered as a request if:

- the accepted M8 trusted-full-read workflow receipt is missing, stale,
  ambiguous, or rejected;
- Jenn exact `trusted-write-proposal` approval is missing, stale, ambiguous,
  or mismatched;
- any required exact field is missing, stale, ambiguous, or mismatched;
- proposal scope, operation list, review route, rollback posture, call budget,
  proposal budget, or duration budget is missing or invented by the agent;
- target or transport would require reading secrets, config, paths, endpoints,
  tokens, cookies, credentials, provider auth, or private locator values;
- client identity, workspace scope, owner scope, or visibility would violate
  the M5 matrix;
- any proposal generation, proposal submission, memory write, durable write,
  direct update, direct supersede, direct tombstone, broad scan, import/export,
  migration, backfill, provider/API, public MCP expansion,
  config/startup/watchdog change, push, release, deploy, cutover, readiness
  claim, or M10 unlock is requested;
- raw runtime, raw memory, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt data, or private client content would be exposed;
- a real approval-line value or template is included.

## Current Display Result

```yaml
current_display_result:
  decision: not_display_ready_missing_m8_receipt_and_exact_trusted_write_proposal_approval
  blocker: m8_receipt_and_exact_trusted_write_proposal_approval_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_request_submission_or_proposal_generation: true
  request_submitted: false
  execution_authorized_by_display: false
  proposal_generation_authorized_by_display: false
  proposal_submission_authorized_by_display: false
  proposal_mode_evidence_claimed: false
  proposals_generated: 0
  proposals_submitted: 0
  durable_write_performed: false
  memory_write_performed: false
  m10_unlocked: false
  next_safe_route: m9_abort_receipt_skeleton_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
trusted_write_proposal_request_display_receipt:
  receipt_id: cm1744_trusted_write_proposal_exact_approval_request_display_boundary
  source_review_id: m9_trusted_write_proposal_exact_approval_decision_review_cm1743
  decision: not_display_ready_missing_m8_receipt_and_exact_trusted_write_proposal_approval
  exact_fields_complete: false
  m8_trusted_full_read_receipt_accepted: false
  trusted_write_proposal_profile_approved: false
  exact_proposal_fields_present: false
  proposal_review_route_present: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized_by_display: false
  proposal_generation_authorized_by_display: false
  proposal_submission_authorized_by_display: false
  runtime_calls_used: 0
  memory_reads_used: 0
  proposals_generated: 0
  proposals_submitted: 0
  memory_write_performed: false
  durable_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
  next_action_allowed: accepted_m8_receipt_and_exact_trusted_write_proposal_approval_required_before_proposal_generation
```

## M9-K4 Display Boundary Conclusion

M9-K4 completes a non-authorizing display boundary for a future
`trusted-write-proposal` exact approval request. The current result is
`not_display_ready_missing_m8_receipt_and_exact_trusted_write_proposal_approval`
because the accepted M8 trusted-full-read workflow receipt, exact Jenn
`trusted-write-proposal` approval, and exact proposal fields are missing.

The plan remains blocked before M9 proposal generation and M10 unlock until
Jenn provides a separate exact approval boundary.
