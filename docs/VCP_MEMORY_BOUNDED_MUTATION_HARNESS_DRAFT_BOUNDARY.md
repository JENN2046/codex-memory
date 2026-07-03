# VCP Memory Bounded Mutation Harness Draft Boundary

Task id: `M10-K1-BOUNDED-MUTATION-HARNESS-DRAFT-BOUNDARY`
Implementation slice: `CM-1748`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_BOUNDED_MUTATION_M10_BLOCKED_PRECONDITION_RECORD.md`
Evidence type: `docs-only`, `harness draft boundary`, `no-runtime`, `no-write`

## Purpose

This document defines the non-authorizing draft boundary for a future M10
bounded mutation harness.

It is not write execution, update execution, supersede execution, tombstone
execution, mutation receipt evidence, rollback audit evidence, approval
request, approval grant, approval-line generation, runtime execution, fallback
execution, bounded write safety proof, readiness claim, or complete V8 claim.
It does not call VCPToolBox, inspect runtime, read memory, write memory, call
providers/APIs, read secrets/config, expand public MCP tools, or push remote
state.

## Draft State

```yaml
bounded_mutation_harness_draft_state:
  draft_id: m10_bounded_mutation_harness_draft_boundary_cm1748
  source_precondition_id: m10_bounded_mutation_blocked_precondition_cm1747
  phase: bounded-autonomous-mutation
  m9_proposal_mode_passed: false
  accepted_m9_proposal_receipts_present: false
  exact_write_boundary_approval_present: false
  exact_target_alias_present: false
  exact_transport_present: false
  exact_client_scope_present: false
  exact_visibility_present: false
  exact_mutation_family_present: false
  exact_payload_shape_present: false
  rollback_posture_bound: false
  audit_receipt_plan_bound: false
  l4_mutation_shield_evidenced: false
  harness_draft_ready_for_execution: false
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
  durable_write_performed: false
  mutation_receipt_created: false
  rollback_audit_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  bounded_write_safe_claimed: false
  readiness_claimed: false
  current_decision: draft_boundary_recorded_execution_blocked_missing_m9_receipts_and_exact_write_boundary
```

## Required Future Inputs

The future harness must not be treated as executable until Jenn provides all
required values in the current context and accepted M9 proposal-mode receipts
exist. Values remain absent here by design.

| Field | Current value | Draft rule |
|---|---|---|
| `accepted_m9_proposal_receipt_ids` | `EXACT_REQUIRED_FROM_JENN` | accepted proposal-mode receipt ids only |
| `exact_write_boundary_approval_id` | `EXACT_REQUIRED_FROM_JENN` | current exact M10 write boundary only |
| `target_alias` | `EXACT_REQUIRED_FROM_JENN` | safe alias only; no locator value |
| `transport` | `EXACT_REQUIRED_FROM_JENN` | exact approved transport family |
| `client_id` | `EXACT_REQUIRED_FROM_JENN` | exact Codex/Claude/client alias |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | explicit per-client boundary |
| `mutation_family` | `EXACT_REQUIRED_FROM_JENN` | one of write/update/supersede/tombstone |
| `mutation_scope` | `EXACT_REQUIRED_FROM_JENN` | exact memory surface and item boundary |
| `mutation_payload_shape` | `EXACT_REQUIRED_FROM_JENN` | low-disclosure shape only |
| `rollback_posture` | `EXACT_REQUIRED_FROM_JENN` | exact reversal, supersession, or tombstone posture |
| `audit_receipt_plan` | `EXACT_REQUIRED_FROM_JENN` | mutation and rollback receipt rules |
| `max_mutations` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 1 |
| `max_runtime_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 3 |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 180 |
| `output_disclosure` | `EXACT_REQUIRED_FROM_JENN` | redacted receipt and status only |

## Non-Authorizing Harness Draft Template

The future harness may use the shape below only after Jenn supplies exact safe
values, accepted M9 proposal-mode receipts exist, and a separate exact M10
write boundary exists. This template must not be treated as approval.

```yaml
future_bounded_mutation_harness:
  harness_id: <safe_harness_id>
  phase: bounded-autonomous-mutation
  accepted_m9_proposal_receipt_ids:
    - <accepted_m9_proposal_receipt_id_from_jenn>
  exact_write_boundary_approval_id: <exact_m10_write_boundary_from_jenn>
  target_alias: <safe_target_alias_from_jenn>
  transport: <exact_transport_from_jenn>
  client_id: <exact_client_alias_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_boundary_from_jenn>
  mutation:
    family: <write_or_update_or_supersede_or_tombstone_from_jenn>
    scope: <exact_memory_surface_and_item_boundary_from_jenn>
    payload_shape: <low_disclosure_payload_shape_from_jenn>
    secret_content_allowed: false
    cross_client_private_leakage_allowed: false
    irreversible_deletion_allowed: false
  rollback:
    posture: <exact_rollback_or_supersession_or_tombstone_posture_from_jenn>
    rollback_receipt_required: true
  budgets:
    max_mutations: <exact_integer_from_jenn>
    max_runtime_calls: <exact_integer_from_jenn>
    max_duration_seconds: <exact_integer_from_jenn>
    max_provider_api_calls: 0
  receipt_plan:
    mutation_receipt: required_low_disclosure
    rollback_or_supersession_audit: required_low_disclosure
    client_scope_visibility: required_low_disclosure
  allowed_actions:
    - exact_boundary_check
    - proposal_receipt_crosscheck
    - low_disclosure_mutation_plan_render
    - rollback_receipt_plan_render
    - policy_evaluation
  forbidden_actions:
    - actual_write
    - actual_update
    - actual_supersede
    - actual_tombstone
    - runtime_call
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - broad_scan_export_import_migration
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
  approval_line_value: omitted
  execution_authorized_by_draft: false
  durable_mutation_authorized_by_draft: false
```

## Draft Stop Rules

The harness draft must not be rendered as executable if:

- accepted M9 proposal-mode receipts are missing, stale, ambiguous, or
  rejected;
- Jenn exact M10 write boundary is missing, stale, ambiguous, or mismatched;
- target alias, transport, client, workspace, owner, visibility, mutation
  family, mutation scope, payload shape, rollback posture, or audit receipt
  plan is missing;
- the operation requires raw private output, broad scan/export/import,
  provider/API, public MCP expansion, config/startup/watchdog change, push,
  release, deploy, cutover, or readiness claim;
- the operation contains secrets, raw memory, raw runtime output, provider
  payload, approval-line value, raw audit rows, sqlite/jsonl/cache content, or
  cross-client private data;
- the operation implies batch mutation, irreversible deletion, unbounded
  modification, or execution outside the exact write boundary;
- a real approval-line value or template is included.

## Current Draft Result

```yaml
current_draft_result:
  decision: draft_boundary_recorded_execution_blocked_missing_m9_receipts_and_exact_write_boundary
  blocker: accepted_m9_proposal_receipts_and_exact_m10_write_boundary_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_runtime: true
  harness_draft_ready_for_execution: false
  write_authorized: false
  update_authorized: false
  supersede_authorized: false
  tombstone_authorized: false
  durable_write_performed: false
  memory_write_performed: false
  memory_update_performed: false
  memory_supersede_performed: false
  memory_tombstone_performed: false
  bounded_write_safe_claimed: false
  next_safe_route: m10_exact_write_boundary_packet_preparation_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
bounded_mutation_harness_draft_receipt:
  receipt_id: cm1748_bounded_mutation_harness_draft_boundary
  source_precondition_id: m10_bounded_mutation_blocked_precondition_cm1747
  decision: draft_boundary_recorded_execution_blocked_missing_m9_receipts_and_exact_write_boundary
  exact_fields_complete: false
  accepted_m9_proposal_receipts_present: false
  exact_write_boundary_approval_present: false
  harness_draft_ready_for_execution: false
  runtime_calls_used: 0
  memory_reads_used: 0
  durable_writes_used: 0
  memory_writes_used: 0
  memory_updates_used: 0
  memory_supersedes_used: 0
  memory_tombstones_used: 0
  mutation_receipts_created: 0
  rollback_audits_performed: 0
  provider_api_calls_used: 0
  approval_line_value_disclosed: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  bounded_write_safe_claimed: false
  readiness_claimed: false
  next_action_allowed: exact_boundary_from_jenn_required_before_runtime
```

## M10-K1 Draft Boundary Conclusion

M10-K1 records a non-authorizing harness draft boundary for future bounded
mutation work. The current result is
`draft_boundary_recorded_execution_blocked_missing_m9_receipts_and_exact_write_boundary`
because accepted M9 proposal receipts and exact Jenn M10 write boundary are
missing.

The plan remains blocked before write, update, supersede, tombstone, durable
mutation, runtime execution, bounded write safety proof, and readiness claim
until Jenn provides a separate exact approval boundary.
