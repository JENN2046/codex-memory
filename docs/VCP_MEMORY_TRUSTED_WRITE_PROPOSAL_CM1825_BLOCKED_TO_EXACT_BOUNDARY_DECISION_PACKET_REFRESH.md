# VCP Memory Trusted-Write-Proposal CM1825 Blocked-to-Exact-Boundary Decision Packet Refresh

Task id: `M9-TRUSTED-WRITE-PROPOSAL-BLOCKED-TO-EXACT-BOUNDARY-DECISION-PACKET-REFRESH`
Implementation slice: `CM-1825`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1824_CLOSEOUT_GATE_FIXTURE_CONTRACT.md`
Evidence type: `docs-only`, `decision-packet-refresh`, `non-authorizing`,
`no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1825 decides the next M9 route after CM-1824 closed the local
fixture-contract preparation slice.

The decision is to stop adding more local fixture guards for the same boundary
and prepare a non-authorizing exact-boundary packet skeleton in the next slice.
That packet skeleton can make the missing execution fields explicit, but it
must not submit a request, generate an approval line, generate proposals,
submit proposals, accept real proposal receipts, call runtime, read memory,
write memory, mutate durable state, call providers/APIs, expand public MCP
tools, unlock M10/M15, push, release, deploy, cut over, or claim readiness.

## Sources Reviewed

| Source | Review use |
|---|---|
| `07_PHASE_PLANS.md` M9/M10 sections | confirms M9 is proposal-only and M10 requires accepted proposal receipts |
| `10_FUTURE_PHASES_M9_M15.md` M9/M10 sections | confirms M9 exit and M10 entry gates |
| `05_APPROVAL_AND_AUTONOMY_MODEL.md` | confirms L4 hard stops and audit receipt vocabulary |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1815_EXACT_APPROVAL_PACKET_REFRESH.md` | earlier non-authorizing packet skeleton |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1820_EXACT_BOUNDARY_FIELD_FEASIBILITY_PREFLIGHT.md` | safe derived fields and missing exact fields |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1821_ENVELOPE_FIXTURE_CONTRACT.md` | local envelope fixture contract |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1822_RECEIPT_SHAPE_FIXTURE_CONTRACT.md` | local receipt-shape fixture contract |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1823_RECEIPT_CLOSEOUT_NEXT_STAGE_GATE_REVIEW.md` | local fixture preparation closeout review |
| `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1824_CLOSEOUT_GATE_FIXTURE_CONTRACT.md` | executable closeout gate fixture contract |

No runtime logs, config/env values, secrets, raw memory, raw runtime payloads,
raw stores, provider payloads, or approval-line values were used.

## Current Evidence State

```yaml
cm1825_current_evidence_state:
  accepted_m8_trusted_full_read_workflow_present_for_planning: true
  cm1821_envelope_fixture_contract_present: true
  cm1822_receipt_shape_fixture_contract_present: true
  cm1823_local_fixture_preparation_closeout_present: true
  cm1824_executable_closeout_gate_fixture_present: true
  local_fixture_contract_preparation_slice_closed: true
  m9_proposal_mode_passed: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  exact_trusted_write_proposal_boundary_complete: false
  exact_request_submission_ready: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  accepted_real_proposal_receipts_present: false
```

## Decision

CM-1825 chooses `prepare_non_authorizing_exact_boundary_packet_skeleton`.

This is the better next step because:

- the local envelope, receipt-shape, and closeout-gate fixture contracts now
  cover the preparation slice;
- more same-layer guard documents would repeat already-covered facts;
- the project needs a single bounded packet skeleton that makes missing exact
  fields visible before any future runtime proposal-mode request;
- a skeleton can be tested as a local contract without implying authority;
- M9 cannot pass until a later exact-approved proposal workflow generates,
  reviews, and audits proposals without durable write.

```yaml
cm1825_route_decision:
  decision: prepare_non_authorizing_exact_boundary_packet_skeleton
  serves_project_final_goal: true
  continue_same_layer_fixture_guard_docs: false
  exact_boundary_packet_skeleton_allowed_next: true
  exact_boundary_packet_skeleton_authorizing: false
  exact_request_submission_allowed: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  proposal_receipts_accepted: 0
  runtime_execution_authorized: false
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
  next_action: cm1826_m9_non_authorizing_exact_boundary_packet_skeleton_contract
```

## Future Packet Skeleton Boundary

The next slice may add a local source/test contract for this skeleton shape.
The skeleton is still not authority.

```yaml
future_cm1826_packet_skeleton_boundary:
  contract_mode: fixture_trusted_write_proposal_exact_boundary_packet_skeleton_only
  allowed_to_validate:
    - profile_is_trusted_write_proposal
    - accepted_m8_evidence_references
    - cm1821_cm1822_cm1824_fixture_evidence_references
    - safe_derived_no_write_policy
    - candidate_target_transport_as_alias_only
    - missing_exact_fields_are_explicit
    - no_runtime_no_proposal_no_write_counters_are_zero
  must_fail_closed_when:
    - exact_request_submission_claimed
    - approval_line_value_present
    - approval_grant_claimed
    - proposal_generation_claimed
    - proposal_submission_claimed
    - accepted_real_proposal_receipt_claimed
    - runtime_execution_claimed
    - memory_read_or_write_claimed
    - durable_write_claimed
    - provider_api_claimed
    - public_mcp_expansion_claimed
    - m9_completion_or_m10_unlock_claimed
    - readiness_claimed
    - raw_private_payload_or_secret_field_present
```

## Blocked Fields Still Requiring Separate Exact Boundary

| Field class | Status |
|---|---|
| target alias and transport | candidate alias only, not execution binding |
| client ids / visibility | receipt-scope aliases only, runtime isolation not claimed |
| workspace / owner scope | exact M9 proposal scope not bound |
| proposal operations | exact non-durable operation list not bound |
| proposal payload shape | low-disclosure shape not bound to a real request |
| review route | accept/reject route not bound |
| rollback posture | per-proposal rollback posture not bound |
| budgets | exact calls, proposals, duration, and result budgets not bound |
| L4 write-intent shield | not proven against a real proposal workflow |
| proposal receipt audit | no real proposal receipt accepted |

## Non-Claims

```yaml
cm1825_non_claims:
  docs_only_decision_packet_refresh: true
  non_authorizing_packet_skeleton_route_selected: true
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

`CM-1826 M9 non-authorizing exact-boundary packet skeleton contract`.

CM-1826 should add a pure fixture-only helper and targeted tests for the packet
skeleton shape selected here. It must remain non-authorizing and must not
submit an approval request, generate approval-line value, generate or submit
real proposals, accept real proposal receipts, read memory, write memory, call
runtime, call providers/APIs, expand public MCP tools, unlock M10/M15, or claim
readiness.
