# VCP Memory Trusted-Write-Proposal Harness Draft Boundary

Task id: `M9-K1-TRUSTED-WRITE-PROPOSAL-HARNESS-DRAFT-BOUNDARY`
Implementation slice: `CM-1741`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_M9_BLOCKED_PRECONDITION_RECORD.md`
Evidence type: `docs-only`, `harness draft boundary`, `no-runtime`, `no-write`

## Purpose

This document defines the non-authorizing draft boundary for a future
`trusted-write-proposal` harness.

It is not proposal generation, proposal submission, acceptance, rejection,
memory write, update, supersede, tombstone, durable mutation, approval request,
approval grant, approval-line generation, runtime execution, fallback
execution, M10 unlock, or readiness claim. It does not call VCPToolBox, inspect
runtime, read memory, write memory, call providers/APIs, read secrets/config,
expand public MCP tools, or push remote state.

## Draft State

```yaml
trusted_write_proposal_harness_draft_state:
  draft_id: m9_trusted_write_proposal_harness_draft_boundary_cm1741
  source_precondition_id: m9_trusted_write_proposal_blocked_precondition_cm1740
  profile: trusted-write-proposal
  m8_trusted_full_read_receipt_accepted: false
  trusted_write_proposal_profile_approved: false
  exact_target_alias_present: false
  exact_transport_present: false
  exact_client_scope_present: false
  exact_proposal_scope_present: false
  exact_proposal_operations_present: false
  proposal_payload_shape_bound: false
  review_route_present: false
  rollback_posture_bound: false
  l4_write_intent_shield_evidenced: false
  harness_draft_ready_for_execution: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  runtime_attempt_performed: false
  memory_read_performed: false
  write_proposal_generated: false
  write_proposal_submitted: false
  durable_write_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
  current_decision: draft_boundary_recorded_execution_blocked_missing_m8_receipt_and_exact_write_proposal_approval
```

## Required Future Inputs

The future harness must not be treated as executable until Jenn provides all
required values in the current context and an accepted M8 trusted-full-read
workflow receipt exists. Values remain absent here by design.

| Field | Current value | Draft rule |
|---|---|---|
| `m8_trusted_full_read_receipt_id` | `EXACT_REQUIRED_FROM_JENN` | accepted trusted-full-read workflow receipt id only |
| `profile` | `trusted-write-proposal` | fixed non-durable proposal profile |
| `target_alias` | `EXACT_REQUIRED_FROM_JENN` | safe alias only; no locator value |
| `transport` | `EXACT_REQUIRED_FROM_JENN` | exact approved transport family |
| `client_ids` | `EXACT_REQUIRED_FROM_JENN` | exact Codex/Claude aliases; unknown client fails closed |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | explicit per-client boundary |
| `proposal_scope` | `EXACT_REQUIRED_FROM_JENN` | exact memory surface and topic boundary |
| `proposal_operations` | `EXACT_REQUIRED_FROM_JENN` | exact non-durable proposal operation list |
| `proposal_payload_shape` | `EXACT_REQUIRED_FROM_JENN` | low-disclosure proposal shape only |
| `review_route` | `EXACT_REQUIRED_FROM_JENN` | named accept/reject reviewer route |
| `rollback_posture` | `EXACT_REQUIRED_FROM_JENN` | rollback, supersession, or tombstone posture without applying it |
| `max_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 5 |
| `max_proposals` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 5 |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 300 |
| `output_disclosure` | `EXACT_REQUIRED_FROM_JENN` | exact redacted summary/shape/metadata boundary |
| `receipt_plan` | `EXACT_REQUIRED_FROM_JENN` | proposal receipt rules only; no durable memory write |

## Non-Authorizing Harness Draft Template

The future harness may use the shape below only after Jenn supplies exact safe
values and an accepted M8 trusted-full-read workflow receipt exists. This
template must not be treated as approval.

```yaml
future_trusted_write_proposal_harness:
  harness_id: <safe_harness_id>
  profile: trusted-write-proposal
  m8_trusted_full_read_receipt_id: <accepted_trusted_full_read_receipt_id_from_jenn>
  target_alias: <safe_target_alias_from_jenn>
  transport: <exact_transport_from_jenn>
  client_ids:
    - <exact_client_alias_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_boundary_from_jenn>
  proposal_scope:
    memory_surface: <DailyNote_or_KnowledgeBase_or_TagMemo_from_jenn>
    topic_boundary: <exact_topic_or_context_boundary_from_jenn>
    cross_client_allowed: false
  proposal_operations:
    - operation_id: <safe_operation_id>
      operation_family: <create_or_update_or_supersede_or_tombstone_proposal_only>
      proposed_intent: <low_disclosure_intent_from_jenn>
      proposed_diff_shape: <low_disclosure_diff_shape_from_jenn>
      rollback_posture: <exact_rollback_posture_from_jenn>
      output_disclosure: <exact_disclosure_from_jenn>
  budgets:
    max_calls: <exact_integer_from_jenn>
    max_proposals: <exact_integer_from_jenn>
    max_duration_seconds: <exact_integer_from_jenn>
    max_durable_writes: 0
    max_memory_writes: 0
    max_provider_api_calls: 0
  review_route:
    accept_reject_route: <exact_review_route_from_jenn>
    auto_accept_allowed: false
    direct_write_after_accept_allowed: false
  receipt_plan:
    proposal_receipt: required_low_disclosure
    rollback_posture: required_low_disclosure
    acceptance_state: required_low_disclosure
  allowed_actions:
    - bounded_context_shape_reference
    - proposal_envelope_render
    - diff_intent_rollback_receipt_render
    - accept_reject_route_render
    - policy_evaluation
  forbidden_actions:
    - durable_write
    - memory_write
    - direct_update
    - direct_supersede
    - direct_tombstone
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - broad_scan_export_import_migration
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
    - m10_unlock_claim
  approval_line_value: omitted
  execution_authorized_by_draft: false
  proposal_generation_authorized_by_draft: false
  proposal_submission_authorized_by_draft: false
  durable_write_authorized_by_draft: false
```

## Draft Stop Rules

The harness draft must not be rendered as executable if:

- accepted M8 trusted-full-read workflow receipt is missing, stale,
  ambiguous, or rejected;
- Jenn exact `trusted-write-proposal` boundary is missing, stale, ambiguous,
  or mismatched;
- target alias, transport, client, workspace, owner, visibility, proposal
  scope, operation list, review route, or rollback posture is missing;
- the proposal would require raw private output, broad scan/export/import,
  durable write, direct update, direct supersede, direct tombstone,
  provider/API, public MCP expansion, config/startup/watchdog change, push,
  release, deploy, cutover, or readiness claim;
- any proposal content includes secrets, raw memory, raw runtime output,
  provider payload, approval-line value, raw audit rows, sqlite/jsonl/cache
  content, or cross-client private data;
- the review route implies auto-acceptance, direct write after acceptance,
  batch mutation, irreversible deletion, or M10 unlock;
- a real approval-line value or template is included.

## Current Draft Result

```yaml
current_draft_result:
  decision: draft_boundary_recorded_execution_blocked_missing_m8_receipt_and_exact_write_proposal_approval
  blocker: m8_trusted_full_read_receipt_and_exact_trusted_write_proposal_approval_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_proposal_generation_or_execution: true
  harness_draft_ready_for_execution: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  write_proposal_generated: false
  write_proposal_submitted: false
  durable_write_performed: false
  memory_write_performed: false
  m10_unlocked: false
  next_safe_route: m9_exact_approval_packet_preparation_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
trusted_write_proposal_harness_draft_receipt:
  receipt_id: cm1741_trusted_write_proposal_harness_draft_boundary
  source_precondition_id: m9_trusted_write_proposal_blocked_precondition_cm1740
  decision: draft_boundary_recorded_execution_blocked_missing_m8_receipt_and_exact_write_proposal_approval
  exact_fields_complete: false
  m8_trusted_full_read_receipt_accepted: false
  trusted_write_proposal_profile_approved: false
  harness_draft_ready_for_execution: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  runtime_calls_used: 0
  memory_reads_used: 0
  proposals_generated: 0
  proposals_submitted: 0
  durable_writes_used: 0
  memory_writes_used: 0
  provider_api_calls_used: 0
  approval_line_value_disclosed: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
  next_action_allowed: exact_boundary_from_jenn_required_before_proposal_generation_or_runtime
```

## M9-K1 Draft Boundary Conclusion

M9-K1 records a non-authorizing harness draft boundary for future governed
mutation proposal mode. The current result is
`draft_boundary_recorded_execution_blocked_missing_m8_receipt_and_exact_write_proposal_approval`
because the accepted M8 trusted-full-read workflow receipt and exact Jenn
trusted-write-proposal approval are missing.

The plan remains blocked before proposal generation, proposal submission,
durable write, memory write, runtime execution, and M10 unlock until Jenn
provides a separate exact approval boundary.
