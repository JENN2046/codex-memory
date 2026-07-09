# VCP Memory Trusted-Write-Proposal CM1818 Runtime Abort Receipt Refresh

Task id: `M9-TRUSTED-WRITE-PROPOSAL-RUNTIME-ABORT-RECEIPT-REFRESH`
Implementation slice: `CM-1818`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1817_NON_AUTHORIZING_REQUEST_DISPLAY_REFRESH.md`
Evidence type: `docs-only`, `abort-receipt-refresh`, `non-authorizing`,
`no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1818 refreshes the M9 `trusted-write-proposal` runtime abort receipt
boundary after CM-1812 and CM-1813 accepted the narrow M8 trusted-full-read
workflow evidence.

The historical CM-1745 abort skeleton remains valid as the original fail-closed
shape. CM-1818 updates the current-state facts only: accepted M8 evidence is
now present for planning, while the exact `trusted-write-proposal` boundary,
proposal fields, review route, L4 write-intent shield evidence, proposal
generation authorization, proposal submission authorization, runtime execution,
memory read by agent, memory write, durable mutation, M10 unlock, and readiness
remain absent or blocked.

CM-1818 is not a runtime attempt, not an approval request, not an approval
line, not an approval grant, not proposal generation, not proposal submission,
not a proposal receipt, not memory read, not memory write, not durable
mutation, not M10 unlock, and not readiness.

CM-1818 does not call VCPToolBox, inspect runtime, read memory, write memory,
call providers/APIs, read secrets/config, expand public MCP tools, push,
release, deploy, cut over, or claim `RC_READY`.

## Refreshed Abort State

```yaml
cm1818_runtime_abort_receipt_refresh:
  abort_refresh_id: m9_trusted_write_proposal_runtime_abort_receipt_refresh_cm1818
  source_abort_skeleton: cm1745
  source_display_refresh: cm1817
  source_decision_review: cm1816
  source_packet_refresh: cm1815
  source_precondition_refresh: cm1814
  profile: trusted-write-proposal
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
  proposal_receipts_accepted: 0
  runtime_attempt_performed: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_allowed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
```

## Refreshed Abort Reason Vocabulary

Future `trusted-write-proposal` attempts must still use low-disclosure abort
codes. CM-1818 only refreshes which blockers are current.

| Abort code | Current trigger state | Required posture |
|---|---|---|
| `ERR_EXACT_TRUSTED_WRITE_PROPOSAL_APPROVAL_MISSING` | Current exact Jenn `trusted-write-proposal` boundary absent | stop before proposal |
| `ERR_EXACT_PROPOSAL_FIELD_MISSING` | Target, transport, client/scope, visibility, proposal scope, operation list, payload shape, review route, rollback, budget, disclosure, or receipt field missing | stop before proposal |
| `ERR_L4_WRITE_INTENT_SHIELD_MISSING` | M9 write-intent shield behavior is not evidenced | stop before proposal |
| `ERR_TARGET_ALIAS_AMBIGUOUS` | Target alias is stale, ambiguous, mismatched, or unsafe | stop before proposal |
| `ERR_TRANSPORT_AMBIGUOUS` | Transport is stale, ambiguous, mismatched, or unsafe | stop before proposal |
| `ERR_AUTH_OR_SECRET_REQUIRED` | Credentials, config, endpoint, path, token, cookie, provider auth, or private locator is required | stop without reading it |
| `ERR_CLIENT_SCOPE_VISIBILITY_MISSING` | Client ids, workspace, owner, or visibility are absent | stop before proposal |
| `ERR_CROSS_CLIENT_LEAKAGE_RISK` | Codex/Claude private leakage risk appears | stop and redact |
| `ERR_RAW_MEMORY_PAYLOAD_RETURNED` | Raw memory/private payload appears during an approved attempt | stop and redact |
| `ERR_PROPOSAL_BUDGET_EXCEEDED` | Proposal count exceeds exact approval | stop and redact |
| `ERR_RUNTIME_BUDGET_EXCEEDED` | Calls or duration exceed exact approval | stop |
| `ERR_REVIEW_ROUTE_MISSING` | Accept/reject route is absent or ambiguous | stop before proposal |
| `ERR_AUTO_ACCEPT_REQUESTED` | Proposal route implies automatic acceptance | stop |
| `ERR_DIRECT_WRITE_REQUESTED` | Direct write/update/supersede/tombstone is requested | stop |
| `ERR_DURABLE_WRITE_REQUESTED` | Durable write is requested in M9 | stop |
| `ERR_PROVIDER_API_REQUESTED` | Provider/API path is required or requested | stop |
| `ERR_PUBLIC_MCP_EXPANSION_REQUESTED` | Public MCP tool/schema expansion is required or requested | stop |
| `ERR_FALLBACK_SUCCESS_OVERCLAIM` | Fallback is treated as proposal-mode proof | correct claim and stop |
| `ERR_M10_UNLOCK_OVERCLAIM` | M10 unlock is claimed without accepted M9 proposal receipts | correct claim and stop |
| `ERR_READINESS_OVERCLAIM` | Production, release, cutover, `RC_READY`, or complete V8 claim appears | correct claim and stop |

`ERR_M8_TRUSTED_FULL_READ_RECEIPT_MISSING` remains valid for future stale or
mismatched states, but it is not the active blocker in CM-1818 because accepted
CM-1812/CM-1813 evidence exists for planning.

## Future Abort Receipt Shape

The shape below is still a non-authorizing receipt template. It must not be
filled with real runtime or proposal data unless a future exact-approved
attempt actually occurs.

```yaml
trusted_write_proposal_abort_receipt_refresh_shape:
  receipt_id: <safe_receipt_id>
  profile: trusted-write-proposal
  abort_code: <safe_abort_code>
  abort_stage: <pre_proposal|during_exact_approved_trusted_write_proposal>
  accepted_m8_trusted_full_read_receipt_present: true
  accepted_m8_trusted_full_read_receipt_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md
  accepted_m8_closeout_id: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md
  exact_trusted_write_proposal_approval_present: false
  exact_proposal_fields_present: false
  proposal_review_route_present: false
  l4_write_intent_shield_evidenced_for_m9: false
  target_alias_present: false
  transport_present: false
  client_ids_present: false
  workspace_scope_present: false
  owner_scope_present: false
  visibility_present: false
  runtime_calls_used: 0
  runtime_duration_seconds: 0
  memory_reads_used_by_agent: 0
  proposals_generated: 0
  proposals_submitted: 0
  proposal_receipts_accepted: 0
  proposal_shape_captured: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_calls_used_by_agent: 0
  approval_line_value_disclosed: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  target_bound: false
  fallback_executed: false
  proposal_mode_evidence_claimed: false
  m10_unlocked: false
  readiness_claimed: false
  next_action_allowed: stop_or_prepare_closeout_refresh
```

## Stop Rules

The abort receipt route must stop or remain non-authorizing if any future edit
attempts to:

- turn this refresh into an approval request;
- include a real approval line or approval-line template;
- submit, dispatch, send, or grant approval;
- bind target, transport, client, scope, visibility, operation, route,
  rollback, budget, disclosure, or receipt values without a separate exact
  boundary;
- generate or submit proposals;
- call runtime, providers, or MCP memory tools;
- read memory or raw stores by the agent;
- write memory or durable state;
- expand public MCP tools;
- unlock M10 or M15;
- claim production readiness, release readiness, cutover readiness,
  `RC_READY`, complete V8, or full bridge completion.

## Current Abort Refresh Result

```yaml
cm1818_abort_refresh_result:
  decision: runtime_abort_receipt_refresh_complete_no_runtime
  serves_project_final_goal: true
  accepted_m8_reference_displayed: true
  active_m8_missing_blocker_removed_for_planning: true
  exact_trusted_write_proposal_boundary_present: false
  exact_fields_complete: false
  proposal_review_route_present: false
  l4_write_intent_shield_evidenced_for_m9: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposals_generated: 0
  proposals_submitted: 0
  proposal_receipts_accepted: 0
  runtime_attempt_performed: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  m9_proposal_mode_evidence_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  next_action: cm1819_m9_blocked_closeout_refresh_after_m8_acceptance
```
