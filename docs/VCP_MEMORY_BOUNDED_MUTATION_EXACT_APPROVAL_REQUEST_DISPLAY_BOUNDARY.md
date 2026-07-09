# VCP Memory Bounded Mutation Exact Approval Request Display Boundary

Task id: `M10-K4-BOUNDED-MUTATION-EXACT-APPROVAL-REQUEST-DISPLAY`
Implementation slice: `CM-1751`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_BOUNDED_MUTATION_EXACT_WRITE_BOUNDARY_DECISION_REVIEW.md`
Evidence type: `docs-only`, `approval request display boundary`, `no-runtime`, `no-write`

## Purpose

This document defines the non-authorizing display boundary for a future
human-facing M10 bounded mutation exact approval request.

It is not an approval request submission, approval-line generation, approval
grant, runtime authorization, target binding, mutation harness start, memory
write, memory update, memory supersede, memory tombstone, durable mutation,
rollback audit, bounded-write safety claim, or readiness claim. It does not
call VCPToolBox, inspect runtime, read memory, write memory, update memory,
supersede memory, tombstone memory, call providers/APIs, read secrets/config,
expand public MCP tools, or push remote state.

## Display State

```yaml
display_state:
  display_id: m10_bounded_mutation_exact_approval_request_display_cm1751
  source_review_id: m10_bounded_mutation_exact_write_boundary_decision_review_cm1750
  source_packet_id: m10_bounded_mutation_exact_write_boundary_packet_preparation_cm1749
  source_harness_draft_id: m10_bounded_mutation_harness_draft_boundary_cm1748
  source_precondition_id: m10_bounded_mutation_blocked_precondition_cm1747
  phase: bounded-autonomous-mutation
  display_ready_as_exact_request: false
  exact_fields_complete: false
  m9_proposal_mode_passed: false
  accepted_m9_proposal_receipts_present: false
  exact_write_boundary_approval_present: false
  exact_mutation_fields_present: false
  mutation_family_selected: false
  mutation_scope_present: false
  mutation_payload_shape_present: false
  rollback_posture_present: false
  audit_receipt_plan_present: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized: false
  mutation_harness_started: false
  write_authorized: false
  update_authorized: false
  supersede_authorized: false
  tombstone_authorized: false
  runtime_attempt_performed: false
  memory_read_performed: false
  memory_write_performed: false
  memory_update_performed: false
  memory_supersede_performed: false
  memory_tombstone_performed: false
  durable_write_allowed: false
  durable_write_performed: false
  runtime_mutation_allowed: false
  mutation_receipt_created: false
  rollback_audit_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  bounded_write_safe_claimed: false
  readiness_claimed: false
  current_decision: not_display_ready_missing_m9_receipts_and_exact_write_boundary
```

The display boundary can help a future review, but the current document itself
cannot authorize, submit, render, or simulate a real exact approval request.

## Required Future Inputs

The future human-facing request must not be displayed as an exact request until
Jenn provides all required values in the current context. Values remain absent
here by design.

| Field | Current value | Display rule |
|---|---|---|
| `accepted_m9_proposal_receipt_ids` | `EXACT_REQUIRED_FROM_JENN` | accepted proposal-mode receipts only; no raw proposal payload |
| `target_alias` | `EXACT_REQUIRED_FROM_JENN` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_FROM_JENN` | one exact approved transport only |
| `phase` | `bounded-autonomous-mutation` | fixed M10 phase |
| `mutation_family` | `EXACT_REQUIRED_FROM_JENN` | exactly one of write, update, supersede, or tombstone |
| `mutation_scope` | `EXACT_REQUIRED_FROM_JENN` | exact target memory surface, topic, client, and visibility boundary |
| `mutation_payload_shape` | `EXACT_REQUIRED_FROM_JENN` | exact redacted shape only; no raw private payload |
| `client_ids` | `EXACT_REQUIRED_FROM_JENN` | exact Codex/Claude client ids or safe aliases |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | exact per-client visibility boundary |
| `rollback_posture` | `EXACT_REQUIRED_FROM_JENN` | exact reversible, supersession, or tombstone posture |
| `audit_receipt_plan` | `EXACT_REQUIRED_FROM_JENN` | exact mutation receipt and rollback audit metadata only |
| `max_mutations` | `EXACT_REQUIRED_FROM_JENN` | exact integer mutation budget |
| `max_runtime_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer runtime-call budget |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer duration budget |
| `output_disclosure` | `EXACT_REQUIRED_FROM_JENN` | redacted mutation and rollback metadata only |
| `secret_content_allowed` | `false` | secret content forbidden |
| `cross_client_private_leakage_allowed` | `false` | cross-client private leakage forbidden |
| `irreversible_deletion_allowed` | `false` | irreversible deletion forbidden |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |

## Non-Authorizing Display Template

The future display may use the shape below only after Jenn supplies exact safe
values, accepted M9 proposal receipts exist, and Jenn separately approves the
M10 exact write boundary. This template must not be treated as approval.

```yaml
future_bounded_mutation_exact_approval_request_display:
  request_id: <safe_request_id>
  phase: bounded-autonomous-mutation
  accepted_m9_proposal_receipt_ids:
    - <accepted_m9_proposal_receipt_id_from_jenn>
  target_alias: <exact_safe_alias_from_jenn>
  transport: <exact_transport_from_jenn>
  mutation_family: <exact_one_of_write_update_supersede_tombstone_from_jenn>
  mutation_scope: <exact_mutation_scope_from_jenn>
  mutation_payload_shape: <exact_low_disclosure_shape_from_jenn>
  client_ids: <exact_client_ids_or_safe_aliases_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_boundary_from_jenn>
  rollback_posture: <exact_rollback_posture_from_jenn>
  audit_receipt_plan: <exact_audit_receipt_plan_from_jenn>
  max_mutations: <exact_integer_from_jenn>
  max_runtime_calls: <exact_integer_from_jenn>
  max_duration_seconds: <exact_integer_from_jenn>
  output_disclosure: redacted mutation and rollback metadata only
  allowed_actions:
    - mutation_request_review
    - mutation_scope_policy_evaluation
    - client_scope_visibility_policy_evaluation
    - rollback_posture_review
    - audit_receipt_plan_review
    - abort_receipt_generation
  forbidden_actions:
    - approval_line_generation
    - approval_request_submission
    - mutation_harness_start
    - runtime_call
    - memory_read
    - memory_write
    - memory_update
    - memory_supersede
    - memory_tombstone
    - durable_write
    - rollback_audit_write
    - broad_scan
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - fallback_success_claim
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
  approval_line_value: omitted
  execution_authorized_by_display: false
  write_authorized_by_display: false
  update_authorized_by_display: false
  supersede_authorized_by_display: false
  tombstone_authorized_by_display: false
  durable_write_authorized_by_display: false
  submission_status: not_submitted_by_template
```

## Display Stop Rules

The display must not be rendered as a request if:

- accepted M9 proposal-mode receipts are missing, stale, ambiguous, or rejected;
- Jenn exact M10 write boundary approval is missing, stale, ambiguous, or
  mismatched;
- any required exact field is missing, stale, ambiguous, generated, or guessed
  by the agent;
- mutation family, scope, payload shape, rollback posture, audit receipt plan,
  mutation budget, runtime-call budget, or duration budget is missing or
  invented by the agent;
- target or transport would require reading secrets, config, paths, endpoints,
  tokens, cookies, credentials, provider auth, or private locator values;
- client identity, workspace scope, owner scope, or visibility would violate
  the M5 matrix;
- any approval-line generation, approval request submission, mutation harness
  start, runtime call, memory read, memory write, memory update, memory
  supersede, memory tombstone, durable write, rollback audit write, broad scan,
  import/export, migration, backfill, provider/API, public MCP expansion,
  config/startup/watchdog change, push, release, deploy, cutover, readiness
  claim, or complete V8 claim is requested;
- raw runtime, raw memory, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt data, or private client content would be exposed;
- a real approval-line value or template is included.

## Current Display Result

```yaml
current_display_result:
  decision: not_display_ready_missing_m9_receipts_and_exact_write_boundary
  blocker: accepted_m9_proposal_receipts_and_exact_m10_write_boundary_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_request_submission_or_mutation: true
  display_ready_as_exact_request: false
  request_submitted: false
  execution_authorized_by_display: false
  write_authorized_by_display: false
  update_authorized_by_display: false
  supersede_authorized_by_display: false
  tombstone_authorized_by_display: false
  bounded_write_safe_claimed: false
  mutation_receipt_created: false
  rollback_audit_performed: false
  durable_write_performed: false
  memory_write_performed: false
  memory_update_performed: false
  memory_supersede_performed: false
  memory_tombstone_performed: false
  next_safe_route: m10_runtime_abort_receipt_skeleton_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
bounded_mutation_request_display_receipt:
  receipt_id: cm1751_bounded_mutation_exact_approval_request_display_boundary
  source_review_id: m10_bounded_mutation_exact_write_boundary_decision_review_cm1750
  decision: not_display_ready_missing_m9_receipts_and_exact_write_boundary
  exact_fields_complete: false
  display_ready_as_exact_request: false
  m9_proposal_mode_passed: false
  accepted_m9_proposal_receipts_present: false
  exact_write_boundary_approval_present: false
  exact_mutation_fields_present: false
  rollback_posture_present: false
  audit_receipt_plan_present: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized_by_display: false
  write_authorized_by_display: false
  update_authorized_by_display: false
  supersede_authorized_by_display: false
  tombstone_authorized_by_display: false
  runtime_calls_used: 0
  memory_reads_used: 0
  memory_writes_used: 0
  memory_updates_used: 0
  memory_supersedes_used: 0
  memory_tombstones_used: 0
  durable_writes_used: 0
  mutation_receipts_created: 0
  rollback_audits_performed: 0
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  bounded_write_safe_claimed: false
  readiness_claimed: false
  next_action_allowed: m10_abort_receipt_skeleton_without_runtime_or_mutation
```

## M10-K4 Display Boundary Conclusion

M10-K4 completes a non-authorizing display boundary for a future bounded
mutation exact approval request. The current result is
`not_display_ready_missing_m9_receipts_and_exact_write_boundary` because
accepted M9 proposal-mode receipts, exact Jenn M10 write boundary, exact
mutation fields, rollback posture, and audit receipt plan are missing.

The plan remains blocked before request submission, approval-line generation,
runtime, and durable mutation until Jenn provides a separate current exact
approval boundary.
