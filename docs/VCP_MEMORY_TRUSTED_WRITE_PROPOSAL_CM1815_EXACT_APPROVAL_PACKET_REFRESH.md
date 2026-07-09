# VCP Memory Trusted-Write-Proposal CM1815 Exact Approval Packet Refresh

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-APPROVAL-PACKET-REFRESH`
Implementation slice: `CM-1815`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1814_PRECONDITION_REFRESH_AFTER_M8_ACCEPTANCE.md`
Evidence type: `docs-only`, `approval-packet-refresh`, `non-authorizing`,
`no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1815 refreshes the earlier CM-1742 non-authorizing exact approval packet
shape now that CM-1814 records an accepted M8 trusted-full-read workflow
receipt for planning.

This is still not an approval packet that can be pasted as authorization. It
does not submit an approval request, generate an approval line, bind a live
target, provide real proposal operations, generate a proposal, submit a
proposal, call VCPToolBox, inspect runtime, read memory, write memory, call
providers/APIs, read secrets/config, expand public MCP tools, unlock M10, or
claim readiness.

## Packet Refresh State

```yaml
cm1815_packet_refresh_state:
  packet_refresh_id: m9_trusted_write_proposal_exact_approval_packet_refresh_cm1815
  source_precondition_refresh: cm1814
  source_historical_packet_preparation: cm1742
  profile: trusted-write-proposal
  accepted_m8_trusted_full_read_receipt_present_for_planning: true
  accepted_m8_trusted_full_read_receipt_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md
  accepted_m8_closeout_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md
  exact_trusted_write_proposal_boundary_present: false
  exact_fields_complete: false
  real_target_bound: false
  real_transport_bound: false
  real_client_scope_bound: false
  real_workspace_scope_bound: false
  real_owner_scope_bound: false
  real_visibility_bound: false
  real_proposal_scope_bound: false
  real_proposal_operations_bound: false
  proposal_payload_shape_bound: false
  proposal_review_route_bound: false
  rollback_posture_bound: false
  budget_bound: false
  l4_write_intent_shield_evidenced_for_m9: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  execution_authorized: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  live_runtime_call_performed: false
  memory_read_performed_by_agent: false
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
```

The only meaningful change from CM-1742 is that the accepted M8 receipt is now
known for planning. Every proposal-execution field remains unset.

## Refreshed Future Packet Fields

A future exact boundary must still supply all execution-specific values in the
current context. CM-1815 does not fill them.

| Field | Current refreshed state | Future exact requirement |
|---|---|---|
| `m8_trusted_full_read_receipt_id` | present for planning | must match accepted CM-1812/CM-1813 evidence |
| `profile` | `trusted-write-proposal` | fixed non-durable proposal profile |
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | safe alias only; no locator/path/endpoint/secret value |
| `transport` | `EXACT_REQUIRED_NOT_SET` | one exact approved transport family |
| `client_ids` | `EXACT_REQUIRED_NOT_SET` | exact aliases or ids; unknown client fails closed |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | exact project/workspace boundary |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | exact owner/operator boundary |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | exact per-client visibility boundary |
| `proposal_scope` | `EXACT_REQUIRED_NOT_SET` | exact memory surface and topic boundary |
| `proposal_operations` | `EXACT_REQUIRED_NOT_SET` | exact non-durable operation list supplied later |
| `proposal_payload_shape` | `EXACT_REQUIRED_NOT_SET` | low-disclosure proposal shape only |
| `review_route` | `EXACT_REQUIRED_NOT_SET` | exact accept/reject route; no auto-accept |
| `rollback_posture` | `EXACT_REQUIRED_NOT_SET` | rollback/supersession/tombstone posture without applying it |
| `max_calls` | `EXACT_REQUIRED_NOT_SET` | exact runtime-call budget |
| `max_proposals` | `EXACT_REQUIRED_NOT_SET` | exact proposal budget |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | exact duration budget |
| `output_disclosure` | `EXACT_REQUIRED_NOT_SET` | redacted proposal shape/metadata only |
| `receipt_plan` | `EXACT_REQUIRED_NOT_SET` | proposal receipt and abort receipt rules |
| `write_allowed` | `false` | direct writes forbidden in M9 |
| `durable_write_allowed` | `false` | durable writes forbidden in M9 |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |

## Non-Authorizing Packet Template

The future packet may use this shape only after a separate current exact
boundary supplies every `EXACT_REQUIRED_NOT_SET` field. This template is not
authorization.

```yaml
future_trusted_write_proposal_exact_packet:
  packet_id: <safe_packet_id>
  profile: trusted-write-proposal
  accepted_m8_trusted_full_read_receipt_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md
  accepted_m8_closeout_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md
  target_alias: <exact_safe_alias_from_separate_boundary>
  transport: <exact_transport_from_separate_boundary>
  client_ids: <exact_client_ids_or_aliases_from_separate_boundary>
  workspace_scope: <exact_workspace_scope_from_separate_boundary>
  owner_scope: <exact_owner_scope_from_separate_boundary>
  visibility: <exact_visibility_boundary_from_separate_boundary>
  proposal_scope: <exact_proposal_scope_from_separate_boundary>
  proposal_operations: <exact_non_durable_operation_list_from_separate_boundary>
  proposal_payload_shape: <exact_low_disclosure_shape_from_separate_boundary>
  review_route: <exact_accept_reject_route_from_separate_boundary>
  rollback_posture: <exact_rollback_posture_from_separate_boundary>
  budgets:
    max_calls: <exact_integer_from_separate_boundary>
    max_proposals: <exact_integer_from_separate_boundary>
    max_duration_seconds: <exact_integer_from_separate_boundary>
    max_memory_writes: 0
    max_durable_writes: 0
    max_provider_api_calls: 0
  allowed_actions:
    - proposal_scope_policy_evaluation
    - proposal_envelope_render
    - diff_intent_rollback_receipt_render
    - accept_reject_route_render
    - abort_receipt_render
  forbidden_actions:
    - proposal_generation_without_exact_boundary
    - proposal_submission_without_exact_boundary
    - memory_write
    - durable_write
    - direct_update
    - direct_supersede
    - direct_tombstone
    - broad_scan
    - provider_api_call
    - secret_or_config_read
    - raw_runtime_or_private_output
    - public_mcp_expansion
    - release_deploy_cutover_or_readiness_claim
    - m10_unlock_claim
  approval_line_value: omitted
  request_submitted_by_template: false
  execution_authorized_by_template: false
  proposal_generation_authorized_by_template: false
  proposal_submission_authorized_by_template: false
  durable_write_authorized_by_template: false
```

## Packet Refresh Decision

CM-1815 is sufficient to update the future packet shape and remove the stale
"M8 receipt absent" blocker from packet preparation. It is not sufficient to
display an exact request, submit a request, approve a request, generate a
proposal, or execute a runtime workflow.

```yaml
cm1815_packet_refresh_decision:
  decision: packet_refresh_complete_m8_present_exact_proposal_boundary_missing
  serves_project_final_goal: true
  accepted_m8_prerequisite_satisfied_for_planning: true
  exact_trusted_write_proposal_boundary_present: false
  exact_proposal_fields_complete: false
  display_ready_as_exact_request: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposals_generated: 0
  proposals_submitted: 0
  runtime_attempt_performed: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  next_action: cm1816_m9_exact_approval_decision_review_refresh
```
