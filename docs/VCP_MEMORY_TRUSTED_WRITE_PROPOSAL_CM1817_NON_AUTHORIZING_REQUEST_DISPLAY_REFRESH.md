# VCP Memory Trusted-Write-Proposal CM1817 Non-Authorizing Request Display Refresh

Task id: `M9-TRUSTED-WRITE-PROPOSAL-NON-AUTHORIZING-REQUEST-DISPLAY-REFRESH`
Implementation slice: `CM-1817`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1816_EXACT_APPROVAL_DECISION_REVIEW_REFRESH.md`
Evidence type: `docs-only`, `request-display-refresh`, `non-authorizing`,
`no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1817 refreshes the M9 `trusted-write-proposal` request display boundary in
non-authorizing form.

It displays the accepted M8 evidence references and the missing exact fields
that a future approval boundary would need. It is not an approval request, not
an approval line, not an approval grant, not proposal generation, not proposal
submission, not runtime execution, not memory read, not memory write, not
durable mutation, not M10 unlock, and not readiness.

CM-1817 does not call VCPToolBox, inspect runtime, read memory, write memory,
call providers/APIs, read secrets/config, expand public MCP tools, push,
release, deploy, cut over, or claim `RC_READY`.

## Display State

```yaml
cm1817_non_authorizing_request_display_refresh:
  display_refresh_id: m9_trusted_write_proposal_non_authorizing_request_display_refresh_cm1817
  source_decision_review: cm1816
  source_packet_refresh: cm1815
  profile: trusted-write-proposal
  display_ready_as_non_authorizing_review_aid: true
  display_ready_as_exact_request: false
  accepted_m8_trusted_full_read_receipt_present: true
  accepted_m8_trusted_full_read_receipt_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md
  accepted_m8_closeout_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md
  exact_trusted_write_proposal_boundary_present: false
  exact_fields_complete: false
  exact_target_alias_present: false
  exact_transport_present: false
  exact_client_ids_present: false
  exact_workspace_scope_present: false
  exact_owner_scope_present: false
  exact_visibility_present: false
  exact_proposal_scope_present: false
  exact_proposal_operations_present: false
  proposal_payload_shape_present: false
  proposal_review_route_present: false
  rollback_posture_present: false
  budget_present: false
  output_disclosure_bound: false
  l4_write_intent_shield_evidenced_for_m9: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_granted: false
  execution_authorized: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposals_generated: 0
  proposals_submitted: 0
  runtime_attempt_performed: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_allowed: false
  durable_write_performed: false
  provider_api_called: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  m10_unlocked: false
  readiness_claimed: false
```

## Non-Authorizing Display

The current display can show only these safe facts:

```yaml
safe_display_projection:
  profile: trusted-write-proposal
  accepted_m8_evidence:
    workflow_receipt: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md
    closeout_review: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md
  remaining_required_fields:
    - exact_target_alias
    - exact_transport
    - exact_client_ids_or_aliases
    - exact_workspace_scope
    - exact_owner_scope
    - exact_visibility_boundary
    - exact_proposal_scope
    - exact_non_durable_proposal_operations
    - exact_proposal_payload_shape
    - exact_review_route
    - exact_rollback_posture
    - exact_call_budget
    - exact_proposal_budget
    - exact_duration_budget
    - exact_output_disclosure
    - exact_receipt_plan
    - l4_write_intent_shield_evidence
  fixed_forbidden_actions:
    - approval_request_submission
    - approval_line_generation
    - proposal_generation
    - proposal_submission
    - runtime_execution
    - memory_read_by_agent
    - memory_write
    - durable_write
    - provider_api_call
    - public_mcp_expansion
    - m10_unlock
    - readiness_claim
```

The display must not include real endpoint values, filesystem paths, tokens,
credentials, cookies, config values, raw memory, raw runtime output, raw audit
or database rows, provider payloads, approval-line values, proposal payloads,
or cross-client private content.

## Stop Rules

The display must abort or remain non-authorizing if any future edit attempts
to:

- turn the display into an approval request;
- include a real approval line or approval-line template;
- submit, dispatch, send, or grant approval;
- invent target, transport, client, scope, visibility, operation, route,
  rollback, budget, disclosure, or receipt values;
- generate or submit proposals;
- call runtime, providers, or MCP memory tools;
- read memory or raw stores by the agent;
- write memory or durable state;
- expand public MCP tools;
- unlock M10 or M15;
- claim production readiness, release readiness, cutover readiness,
  `RC_READY`, complete V8, or full bridge completion.

## Current Display Result

```yaml
cm1817_display_result:
  decision: non_authorizing_request_display_refresh_complete_not_submitted
  serves_project_final_goal: true
  accepted_m8_reference_displayed: true
  missing_exact_fields_displayed: true
  display_ready_as_non_authorizing_review_aid: true
  display_ready_as_exact_request: false
  exact_trusted_write_proposal_boundary_present: false
  exact_fields_complete: false
  request_submitted: false
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
  next_action: cm1818_m9_runtime_abort_receipt_refresh
```
