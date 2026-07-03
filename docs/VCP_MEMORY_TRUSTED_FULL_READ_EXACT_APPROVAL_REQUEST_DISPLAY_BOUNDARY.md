# VCP Memory Trusted-Full-Read Exact Approval Request Display Boundary

Task id: `M8-K4-TRUSTED-FULL-READ-EXACT-APPROVAL-REQUEST-DISPLAY`
Implementation slice: `CM-1737`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_FULL_READ_EXACT_APPROVAL_DECISION_REVIEW_BOUNDARY.md`
Evidence type: `docs-only`, `approval request display boundary`, `no-runtime`

## Purpose

This document defines the non-authorizing display boundary for a future
human-facing trusted-full-read exact approval request.

It is not an approval request submission, approval-line generation, approval
grant, runtime authorization, target binding, trusted-full-read workflow
execution, M9 unlock, or readiness claim. It does not call VCPToolBox, inspect
runtime, read memory, write memory, call providers/APIs, read secrets/config,
expand public MCP tools, or push remote state.

## Display State

```yaml
display_state:
  display_id: m8_trusted_full_read_exact_approval_request_display_cm1737
  source_review_id: m8_trusted_full_read_exact_approval_decision_review_cm1736
  source_packet_id: m8_trusted_full_read_exact_approval_packet_preparation_cm1735
  source_harness_draft_id: m8_trusted_full_read_harness_draft_boundary_cm1734
  source_precondition_id: m8_trusted_full_read_blocked_precondition_record_cm1733
  profile: trusted-full-read
  display_ready_as_exact_request: false
  exact_fields_complete: false
  m7_read_shape_receipt_accepted: false
  trusted_full_read_profile_approved: false
  exact_workflow_fields_present: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  execution_authorized: false
  workflow_harness_started: false
  workflow_execution_authorized: false
  workflow_steps_executed: 0
  live_runtime_call_performed: false
  memory_read_performed: false
  memory_write_performed: false
  checkpoint_handoff_audit_write_performed: false
  durable_write_allowed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m9_unlocked: false
  readiness_claimed: false
  current_decision: not_display_ready_missing_m7_receipt_and_exact_trusted_full_read_approval
```

The display boundary can help a future review, but the current document itself
cannot authorize anything.

## Required Future Inputs

The future human-facing request must not be displayed as an exact request until
Jenn provides all required values in the current context. Values remain absent
here by design.

| Field | Current value | Display rule |
|---|---|---|
| `m7_read_shape_receipt_id` | `EXACT_REQUIRED_FROM_JENN` | accepted observe-full read-shape receipt id only; no raw runtime payload |
| `target_alias` | `EXACT_REQUIRED_FROM_JENN` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_FROM_JENN` | one exact transport only |
| `profile` | `trusted-full-read` | fixed profile for M8 trusted-full-read workflow |
| `workflow_step_limit` | `EXACT_REQUIRED_FROM_JENN` | exact integer step cap |
| `recall_operations` | `EXACT_REQUIRED_FROM_JENN` | exact bounded operation list supplied by Jenn |
| `client_ids` | `EXACT_REQUIRED_FROM_JENN` | exact Codex/Claude client ids or safe aliases |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | exact per-client visibility boundary |
| `max_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer runtime-call budget |
| `max_results_per_step` | `EXACT_REQUIRED_FROM_JENN` | exact integer result budget per step |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer duration budget |
| `output_disclosure` | `EXACT_REQUIRED_FROM_JENN` | redacted summary/shape/metadata only unless separately exact-approved |
| `receipt_chain` | `EXACT_REQUIRED_FROM_JENN` | checkpoint/handoff/audit receipt rules only |
| `write_allowed` | `false` | writes forbidden in M8 |
| `write_proposal_allowed` | `false` | proposal mode belongs to M9, not M8 |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |

## Non-Authorizing Display Template

The future display may use the shape below only after Jenn supplies exact safe
values and the M7 read-shape receipt is accepted. This template must not be
treated as approval.

```yaml
future_trusted_full_read_exact_approval_request_display:
  request_id: <safe_request_id>
  profile: trusted-full-read
  m7_read_shape_receipt_id: <accepted_observe_full_receipt_id_from_jenn>
  target_alias: <exact_safe_alias_from_jenn>
  transport: <exact_transport_from_jenn>
  workflow_step_limit: <exact_integer_from_jenn>
  recall_operations: <exact_bounded_operation_list_from_jenn>
  client_ids: <exact_client_ids_or_safe_aliases_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_boundary_from_jenn>
  max_calls: <exact_integer_from_jenn>
  max_results_per_step: <exact_integer_from_jenn>
  max_duration_seconds: <exact_integer_from_jenn>
  output_disclosure: redacted summary shape metadata only
  receipt_chain: <exact_checkpoint_handoff_audit_rules_from_jenn>
  allowed_actions:
    - bounded_trusted_full_read_workflow_review
    - client_id_isolation_check
    - scope_visibility_policy_evaluation
    - redacted_shape_metadata_capture
    - abort_receipt_generation
  forbidden_actions:
    - memory_write
    - write_proposal
    - broad_scan
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - fallback_success_claim
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
    - m9_unlock_claim
  approval_line_value: omitted
  execution_authorized_by_display: false
  submission_status: not_submitted_by_template
```

## Display Stop Rules

The display must not be rendered as a request if:

- the accepted M7 observe-full read-shape receipt is missing, stale,
  ambiguous, or rejected;
- Jenn exact trusted-full-read approval is missing, stale, ambiguous, or
  mismatched;
- any required exact field is missing, stale, ambiguous, or mismatched;
- workflow operations, step cap, call budget, result budget, or duration budget
  are missing or invented by the agent;
- target or transport would require reading secrets, config, paths, endpoints,
  tokens, cookies, credentials, provider auth, or private locator values;
- client identity, workspace scope, owner scope, or visibility would violate
  the M5 matrix;
- any memory write, write proposal, broad scan, import/export, migration,
  backfill, provider/API, public MCP expansion, config/startup/watchdog change,
  push, release, deploy, cutover, or readiness claim is requested;
- raw runtime, raw memory, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt data, or private client content would be exposed;
- a real approval-line value or template is included.

## Current Display Result

```yaml
current_display_result:
  decision: not_display_ready_missing_m7_receipt_and_exact_trusted_full_read_approval
  blocker: m7_receipt_and_exact_trusted_full_read_approval_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_request_submission_or_execution: true
  request_submitted: false
  execution_authorized_by_display: false
  workflow_execution_authorized: false
  workflow_harness_started: false
  trusted_full_read_evidence_claimed: false
  m9_unlocked: false
  next_safe_route: m8_abort_receipt_skeleton_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
trusted_full_read_request_display_receipt:
  receipt_id: cm1737_trusted_full_read_exact_approval_request_display_boundary
  source_review_id: m8_trusted_full_read_exact_approval_decision_review_cm1736
  decision: not_display_ready_missing_m7_receipt_and_exact_trusted_full_read_approval
  exact_fields_complete: false
  m7_read_shape_receipt_accepted: false
  trusted_full_read_profile_approved: false
  exact_workflow_fields_present: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized_by_display: false
  workflow_execution_authorized: false
  workflow_harness_started: false
  workflow_steps_executed: 0
  runtime_calls_used: 0
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  checkpoint_handoff_audit_write_performed: false
  durable_write_allowed: false
  runtime_mutation_allowed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m9_unlocked: false
  readiness_claimed: false
  next_action_allowed: accepted_m7_receipt_and_exact_trusted_full_read_approval_required_before_workflow
```

## M8-K4 Display Boundary Conclusion

M8-K4 completes a non-authorizing display boundary for a future
trusted-full-read exact approval request. The current result is
`not_display_ready_missing_m7_receipt_and_exact_trusted_full_read_approval`
because the accepted M7 observe-full read-shape receipt, exact Jenn
trusted-full-read approval, and exact workflow fields are missing.

The plan remains blocked before M8 trusted-full-read workflow and M9 unlock
until Jenn provides a separate exact approval boundary.
