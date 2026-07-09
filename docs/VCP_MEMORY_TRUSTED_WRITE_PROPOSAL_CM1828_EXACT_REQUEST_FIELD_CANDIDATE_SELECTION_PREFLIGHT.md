# VCP Memory Trusted-Write-Proposal CM1828 Exact Request Field Candidate Selection Preflight

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-REQUEST-FIELD-CANDIDATE-SELECTION-PREFLIGHT`
Implementation slice: `CM-1828`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1827_PACKET_SKELETON_CLOSEOUT_REQUEST_BOUNDARY_GATE_REVIEW.md`
Evidence type: `docs-only`, `field-candidate-selection-preflight`,
`non-authorizing`, `no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1828 selects safe candidate fields for a future exact
`trusted-write-proposal` request packet and explicitly marks the fields that
remain missing.

This is not an approval request, not an approval line, not proposal generation,
not proposal submission, not a real proposal receipt, not runtime execution,
not memory read, not memory write, not durable mutation, not provider/API use,
not public MCP expansion, not M10/M15 unlock, and not readiness.

## Sources Reviewed

| Source | Review use |
|---|---|
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1827_PACKET_SKELETON_CLOSEOUT_REQUEST_BOUNDARY_GATE_REVIEW.md` | next-boundary definition |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1826_EXACT_BOUNDARY_PACKET_SKELETON_FIXTURE_CONTRACT.md` | packet skeleton non-authorizing constraints |
| `src/core/VcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract.js` | required field classes and stop posture |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1820_EXACT_BOUNDARY_FIELD_FEASIBILITY_PREFLIGHT.md` | safe derived constants and missing exact fields |
| `src/core/VcpMemoryTrustedWriteProposalEnvelopeContract.js` | fixture-only proposal operation vocabulary |
| `src/core/VcpMemoryTrustedWriteProposalReceiptShapeContract.js` | fixture-only review status and receipt-shape vocabulary |
| `docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md` | accepted M8 planning evidence |
| `docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md` | accepted low-disclosure workflow receipt reference |

No runtime logs, config/env values, secrets, raw memory, raw runtime payloads,
raw stores, provider payloads, approval-line values, or live request bodies
were used.

## Candidate Selection Matrix

```yaml
cm1828_candidate_selection:
  profile:
    selected_candidate: trusted-write-proposal
    source: cm1820_invocation_contract_and_plan_review
    execution_binding: false
  accepted_m8_trusted_full_read_receipt_id:
    selected_candidate: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md
    source: cm1813_closeout
    execution_binding: false
  accepted_m8_closeout_id:
    selected_candidate: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md
    source: cm1813_closeout
    execution_binding: false
  target_alias_candidate:
    selected_candidate: local_disposable_vcptoolbox_dailynotesearcher_primary_candidate
    source: accepted_m6_to_m8_low_disclosure_receipt_chain
    execution_binding: false
  transport_family_candidate:
    selected_candidate: human_tool_http_transport_family
    route_family_candidate: /v1/human/tool
    source: accepted_m6_to_m8_low_disclosure_receipt_chain
    execution_binding: false
  component_action_candidate:
    selected_candidate: DailyNoteSearcher.SearchDailyNote
    purpose: prior_read_workflow_anchor_only
    exact_write_proposal_operation_binding: false
  client_alias_candidates:
    selected_candidates:
      - codex_local_agent
      - claude_compatible_client
    source: cm1813_receipt_scope_aliases
    runtime_client_isolation_claimed: false
  visibility_boundary_candidate:
    selected_candidate: receipt_scope_alias_distinction_only
    source: cm1813_closeout
    exact_visibility_bound: false
  workspace_scope_candidate:
    selected_candidate: codex_memory_imported_plan_package_local_integration_scope
    source: checked_in_plan_package_context
    exact_workspace_scope_bound: false
  owner_scope_candidate:
    selected_candidate: jenn_local_operator_scope_alias
    source: current_plan_authority_context
    exact_owner_scope_bound: false
  proposal_operation_vocabulary_candidates:
    selected_candidates:
      - render_redacted_intent
      - render_rollback_posture
    source: cm1821_fixture_contract_allowlist
    real_proposal_operation_binding: false
  proposal_scope_candidate:
    selected_candidate: not_selected
    reason: exact proposal scope is still missing
    exact_proposal_scope_bound: false
  proposal_payload_shape_candidate:
    selected_candidate: redacted_shape_intent_rollback_metadata_only
    source: cm1821_cm1822_fixture_contract_vocabulary
    exact_payload_shape_bound: false
  review_route_candidate:
    selected_candidate: manual_review_only_no_auto_accept
    source: cm1821_cm1822_fixture_contract_vocabulary
    exact_review_route_bound: false
  review_status_vocabulary_candidates:
    selected_candidates:
      - accept
      - reject
    source: cm1822_receipt_shape_fixture_contract
    real_review_status_accepted: false
  rollback_posture_candidate:
    selected_candidate: rollback_plan_shape_only_no_execution
    source: cm1821_cm1822_fixture_contract_vocabulary
    exact_rollback_posture_bound: false
  budget_candidates:
    cm1828_runtime_calls: 0
    cm1828_provider_api_calls: 0
    cm1828_mcp_memory_tool_calls: 0
    cm1828_memory_writes: 0
    cm1828_durable_writes: 0
    future_proposal_count_candidate: 1
    future_runtime_call_budget_candidate: not_selected
    future_duration_budget_candidate: not_selected
    future_output_budget_candidate: field_names_only_or_redacted_shape_only
    exact_budgets_bound: false
  receipt_rules_candidate:
    selected_candidate: low_disclosure_receipt_shape_only
    raw_private_output_allowed: false
    approval_line_value_disclosed: false
    real_proposal_receipt_accepted: false
  abort_receipt_rules_candidate:
    selected_candidate: abort_on_raw_private_secret_authority_or_write_ambiguity
    raw_values_repeated_in_receipt: false
    execution_binding: false
```

## Missing Exact Fields

CM-1828 intentionally keeps these fields unresolved:

- exact target execution binding;
- exact transport execution binding;
- exact client ids and runtime isolation boundary;
- exact workspace and owner scope for the future proposal;
- exact proposal scope;
- exact proposal operation binding;
- exact proposal payload shape;
- exact review route and accept/reject process;
- exact rollback posture for a real proposal;
- exact runtime call, proposal, duration, and output budgets;
- L4 write-intent shield evidence against a real proposal workflow;
- real proposal receipt audit rule;
- approval request submission authority;
- approval-line value.

## Decision

```yaml
cm1828_field_candidate_selection_decision:
  field_candidate_selection_preflight_completed: true
  safe_candidate_fields_selected: true
  missing_exact_fields_remain: true
  exact_request_field_packet_present: false
  exact_request_packet_ready: false
  exact_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposal_receipts_accepted: 0
  runtime_execution_authorized: false
  runtime_attempt_performed: false
  live_vcp_toolbox_called: false
  mcp_memory_tool_called: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  m9_proposal_mode_passed: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  next_action: cm1829_m9_exact_request_field_candidate_fixture_contract
```

CM-1828 advances only local request-field preparation. It does not make the
future exact request ready.

## Non-Claims

```yaml
cm1828_non_claims:
  docs_only_field_candidate_selection_preflight: true
  non_authorizing_request_field_candidate_selection: true
  exact_request_field_packet_present: false
  exact_request_packet_ready: false
  exact_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  proposal_generated: false
  proposal_submitted: false
  proposal_receipts_accepted: 0
  runtime_attempt_performed: false
  live_vcp_toolbox_called: false
  mcp_memory_tool_called: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  m9_proposal_mode_passed: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
```

## Next Work

The next useful local-safe step is:

`CM-1829 M9 exact request field candidate fixture contract`.

CM-1829 should turn the CM-1828 candidate matrix into a pure local source/test
contract that accepts only non-authorizing candidate packets, rejects missing or
unsafe field shapes without echoing raw values, keeps exact execution binding
false, and preserves zero runtime/proposal/write/provider/public-MCP/readiness
side effects.
