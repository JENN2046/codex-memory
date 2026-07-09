# VCP Memory Trusted-Full-Read Harness Draft Boundary

Task id: `M8-K1-TRUSTED-FULL-READ-HARNESS-DRAFT-BOUNDARY`
Implementation slice: `CM-1734`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_FULL_READ_M8_BLOCKED_PRECONDITION_RECORD.md`
Evidence type: `docs-only`, `harness draft boundary`, `no-runtime`

## Purpose

This document defines the non-authorizing draft boundary for a future
trusted-full-read workflow harness.

It is not a workflow execution, read query, memory read, checkpoint write,
handoff write, audit write, approval request, approval grant, approval-line
generation, mutation proposal, readiness claim, fallback execution, or M9
unlock. It does not call VCPToolBox, inspect runtime, read memory, write
memory, call providers/APIs, read secrets/config, expand public MCP tools, or
push remote state.

## Draft State

```yaml
harness_draft_state:
  draft_id: m8_trusted_full_read_harness_draft_boundary_cm1734
  source_precondition_id: m8_trusted_full_read_blocked_precondition_record_cm1733
  profile: trusted-full-read
  m7_observe_full_read_shape_receipt_accepted: false
  trusted_full_read_profile_approved: false
  exact_workflow_fields_complete: false
  harness_draft_ready_for_execution: false
  workflow_execution_authorized: false
  workflow_harness_started: false
  workflow_steps_bound: false
  client_id_isolation_demonstrated: false
  checkpoint_handoff_receipts_present: false
  audit_receipt_chain_present: false
  fallback_abort_behavior_tested: false
  runtime_attempt_performed: false
  memory_read_performed: false
  memory_write_performed: false
  durable_write_allowed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m9_unlocked: false
  readiness_claimed: false
  current_decision: draft_boundary_recorded_execution_blocked_missing_m7_receipt_and_exact_approval
```

## Required Future Inputs

The future harness must not be treated as executable until Jenn provides all
required values in the current context. Values remain absent here by design.

| Field | Current value | Draft rule |
|---|---|---|
| `m7_read_shape_receipt_id` | `EXACT_REQUIRED_FROM_JENN` | accepted observe-full receipt id only |
| `profile` | `trusted-full-read` | fixed read-only workflow profile |
| `client_ids` | `EXACT_REQUIRED_FROM_JENN` | exact Codex/Claude aliases; unknown client fails closed |
| `workspace_scope` | `EXACT_REQUIRED_FROM_JENN` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_FROM_JENN` | exact operator/owner scope |
| `visibility` | `EXACT_REQUIRED_FROM_JENN` | explicit per-client boundary |
| `workflow_step_limit` | `EXACT_REQUIRED_FROM_JENN` | exact integer |
| `recall_operations` | `EXACT_REQUIRED_FROM_JENN` | exact bounded operation list |
| `max_calls` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 5 |
| `max_results_per_step` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 20 |
| `max_duration_seconds` | `EXACT_REQUIRED_FROM_JENN` | exact integer; recommended maximum 300 |
| `output_disclosure` | `EXACT_REQUIRED_FROM_JENN` | exact redacted summary/shape/metadata boundary |
| `receipt_chain` | `EXACT_REQUIRED_FROM_JENN` | checkpoint/handoff/audit receipt rules only; no durable memory write |

## Non-Authorizing Harness Draft Template

The future harness may use the shape below only after Jenn supplies exact safe
values and an accepted M7 read-shape receipt exists. This template must not be
treated as approval.

```yaml
future_trusted_full_read_workflow_harness:
  harness_id: <safe_harness_id>
  profile: trusted-full-read
  m7_read_shape_receipt_id: <accepted_observe_full_receipt_id_from_jenn>
  client_ids:
    - <exact_client_alias_from_jenn>
  workspace_scope: <exact_workspace_scope_from_jenn>
  owner_scope: <exact_owner_scope_from_jenn>
  visibility: <exact_visibility_boundary_from_jenn>
  workflow_step_limit: <exact_integer_from_jenn>
  recall_operations:
    - step_id: <safe_step_id>
      operation: <exact_bounded_recall_operation_from_jenn>
      max_results: <exact_integer_from_jenn>
      output_disclosure: <exact_disclosure_from_jenn>
  budgets:
    max_calls: <exact_integer_from_jenn>
    max_results_per_step: <exact_integer_from_jenn>
    max_duration_seconds: <exact_integer_from_jenn>
    max_writes: 0
    max_provider_api_calls: 0
  receipt_chain:
    checkpoint_receipt: required_low_disclosure
    handoff_receipt: required_low_disclosure
    audit_receipt: required_low_disclosure
  allowed_actions:
    - bounded_recall_operation
    - client_isolation_check
    - checkpoint_handoff_receipt_generation
    - audit_receipt_generation
    - fallback_abort_evaluation
    - policy_evaluation
  forbidden_actions:
    - durable_write
    - memory_mutation
    - write_proposal
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
    - m9_unlock_claim
  approval_line_value: omitted
  execution_authorized_by_draft: false
  submission_status: not_submitted_by_template
```

## Draft Stop Rules

The harness draft must not be rendered as executable if:

- accepted M7 observe-full read-shape receipt is missing, stale, ambiguous, or
  rejected;
- Jenn exact trusted-full-read approval is missing, stale, ambiguous, or
  mismatched;
- any required exact field is missing, stale, ambiguous, or mismatched;
- client identity, workspace, owner, or visibility boundary is missing;
- workflow steps would require raw private output, broad scan, durable write,
  mutation proposal, provider/API, public MCP expansion, config/startup/watchdog
  change, push, release, deploy, cutover, or readiness claim;
- checkpoint/handoff/audit receipt generation would require durable memory
  writes, raw audit/store reads, or private payload disclosure;
- a real approval-line value or template is included.

## Current Draft Result

```yaml
current_draft_result:
  decision: draft_boundary_recorded_execution_blocked_missing_m7_receipt_and_exact_approval
  blocker: m7_read_shape_receipt_and_exact_trusted_full_read_approval_missing
  serves_project_final_goal: true
  human_exact_approval_required_before_workflow_or_execution: true
  harness_draft_ready_for_execution: false
  workflow_execution_authorized: false
  trusted_full_read_harness_started: false
  m9_unlocked: false
  next_safe_route: m8_exact_approval_packet_preparation_or_wait_for_exact_approval
```

## Receipt Skeleton

```yaml
trusted_full_read_harness_draft_receipt:
  receipt_id: cm1734_trusted_full_read_harness_draft_boundary
  source_precondition_id: m8_trusted_full_read_blocked_precondition_record_cm1733
  decision: draft_boundary_recorded_execution_blocked_missing_m7_receipt_and_exact_approval
  exact_fields_complete: false
  m7_read_shape_receipt_accepted: false
  trusted_full_read_profile_approved: false
  harness_draft_ready_for_execution: false
  workflow_execution_authorized: false
  runtime_calls_used: 0
  workflow_steps_executed: 0
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_calls_used: 0
  approval_line_value_disclosed: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m9_unlocked: false
  readiness_claimed: false
  next_action_allowed: exact_boundary_from_jenn_required_before_workflow_runtime
```

## M8-K1 Draft Boundary Conclusion

M8-K1 records a non-authorizing harness draft boundary for future
trusted-full-read workflow evidence. The current result is
`draft_boundary_recorded_execution_blocked_missing_m7_receipt_and_exact_approval`
because the accepted M7 read-shape receipt and exact Jenn trusted-full-read
approval are missing.

The plan remains blocked before trusted-full-read workflow execution and M9
unlock until Jenn provides a separate exact approval boundary.
