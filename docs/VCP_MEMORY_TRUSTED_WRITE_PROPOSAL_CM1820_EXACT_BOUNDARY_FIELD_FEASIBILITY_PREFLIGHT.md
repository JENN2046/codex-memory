# VCP Memory Trusted-Write-Proposal CM1820 Exact Boundary Field Feasibility Preflight

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-BOUNDARY-FIELD-FEASIBILITY-PREFLIGHT`
Implementation slice: `CM-1820`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1819_BLOCKED_CLOSEOUT_REFRESH_AFTER_M8_ACCEPTANCE.md`
Evidence type: `docs-only`, `field-feasibility-preflight`,
`non-authorizing`, `no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1820 determines which M9 `trusted-write-proposal` exact boundary fields can
be safely derived from the archived plan and accepted low-disclosure evidence,
and which fields still require a concrete boundary before proposal execution.

This preflight exists to move M9 toward executable contract work without
inventing missing authority. It is not an approval request, not an approval
line, not proposal generation, not proposal submission, not a runtime attempt,
not memory read, not memory write, not durable mutation, not M10 unlock, and
not readiness.

CM-1820 does not call VCPToolBox, inspect runtime, read memory, write memory,
call providers/APIs, read secrets/config, expand public MCP tools, push,
release, deploy, cut over, or claim `RC_READY`.

## Source Facts Used

CM-1820 uses only checked-in, low-disclosure sources:

| Source | Use |
|---|---|
| `07_PHASE_PLANS.md` M9 section | M9 scope, non-goals, allowed action, expected output, validation, abort posture |
| `10_FUTURE_PHASES_M9_M15.md` M9 section | M9 entry/exit conditions and freeze judgment |
| `05_APPROVAL_AND_AUTONOMY_MODEL.md` audit receipt fields | required receipt field vocabulary |
| `docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md` | `trusted-write-proposal` profile constraints |
| `docs/VCP_MEMORY_GOVERNANCE_POLICY_SHIELD_TRUTH_TABLE.md` | L3 proposal mode and L4 durable-write stop rules |
| `CM-1807`, `CM-1810`, `CM-1813` closeouts | accepted low-disclosure target/read/workflow evidence |

No runtime logs, config/env values, secrets, raw memory, raw runtime payloads,
raw stores, provider payloads, or approval-line values were used.

## Field Feasibility Matrix

```yaml
cm1820_field_feasibility_preflight:
  profile:
    value: trusted-write-proposal
    source: invocation_contract_and_plan
    feasibility: derivable
  accepted_m8_trusted_full_read_receipt_id:
    value: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1812_WORKFLOW_LOW_DISCLOSURE_EXECUTION_RECEIPT.md
    source: cm1813_closeout
    feasibility: derivable
  accepted_m8_closeout_id:
    value: docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md
    source: cm1813_closeout
    feasibility: derivable
  target_alias_candidate:
    value_class: safe_tool_alias_from_accepted_m6_to_m8_receipts
    source: cm1807_cm1810_cm1813_chain
    feasibility: derivable_as_candidate_not_execution_binding
  transport_candidate:
    value_class: accepted_human_tool_http_transport_family
    source: cm1807_cm1810_cm1813_chain
    feasibility: derivable_as_candidate_not_execution_binding
  profile_write_posture:
    value: proposal_only_durable_write_forbidden
    source: invocation_contract
    feasibility: derivable
  output_disclosure:
    value: redacted_proposal_shape_intent_rollback_metadata_only
    source: plan_and_audit_receipt_model
    feasibility: derivable_as_policy
  durable_write_allowed:
    value: false
    source: plan_and_invocation_contract
    feasibility: derivable
  memory_write_allowed:
    value: false
    source: plan_m9_non_goals
    feasibility: derivable
  provider_api_allowed:
    value: false
    source: active_boundary_and_project_rules
    feasibility: derivable
  public_mcp_expansion_allowed:
    value: false
    source: active_boundary_and_project_rules
    feasibility: derivable
  proposal_scope:
    value: not_set
    source: none
    feasibility: missing_exact_field
  proposal_operations:
    value: not_set
    source: none
    feasibility: missing_exact_field
  proposal_payload_shape:
    value: not_set
    source: none
    feasibility: missing_exact_field
  proposal_review_route:
    value: not_set
    source: none
    feasibility: missing_exact_field
  accept_reject_semantics:
    value: not_set
    source: none
    feasibility: missing_exact_field
  rollback_posture_per_proposal:
    value: not_set
    source: none
    feasibility: missing_exact_field
  exact_call_budget:
    value: not_set
    source: none
    feasibility: missing_exact_field
  exact_proposal_budget:
    value: not_set
    source: none
    feasibility: missing_exact_field
  exact_duration_budget:
    value: not_set
    source: none
    feasibility: missing_exact_field
  exact_result_budget:
    value: not_set
    source: none
    feasibility: missing_exact_field
  exact_client_ids:
    value: receipt_scope_aliases_known_runtime_isolation_not_claimed
    source: cm1813_closeout
    feasibility: partial_candidate_only
  workspace_scope:
    value: not_set_for_m9_proposal
    source: none
    feasibility: missing_exact_field
  owner_scope:
    value: not_set_for_m9_proposal
    source: none
    feasibility: missing_exact_field
  visibility_boundary:
    value: receipt_scope_aliases_known_runtime_isolation_not_claimed
    source: cm1813_closeout
    feasibility: partial_candidate_only
  l4_write_intent_shield_evidenced_for_m9:
    value: false
    source: cm1819_closeout
    feasibility: missing_fixture_or_contract_evidence
```

## Feasibility Result

CM-1820 finds three field classes:

| Class | Fields | Result |
|---|---|---|
| Safe derived constants | `profile`, accepted M8 evidence ids, no-durable-write policy, no-memory-write policy, no-provider policy, no-public-MCP policy, redacted output policy | usable in future fixture/contract work |
| Candidate facts only | target alias, transport family, receipt-scope client aliases, visibility candidates | useful for draft packets, not sufficient for execution |
| Missing exact fields | proposal scope, operations, payload shape, review route, accept/reject semantics, rollback posture, budgets, exact workspace/owner/visibility, M9 L4 write-intent shield evidence | block proposal generation |

The user-level plan preauthorization and local disposable VCPToolBox target make
continued bounded work appropriate, but they do not supply every exact M9 field
or turn missing proposal semantics into executable authority.

## Non-Claims

```yaml
cm1820_non_claims:
  field_feasibility_preflight_completed: true
  exact_trusted_write_proposal_boundary_complete: false
  exact_fields_complete: false
  exact_request_ready: false
  request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  execution_authorized: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  write_proposals_generated: 0
  write_proposals_submitted: 0
  proposal_receipts_accepted: 0
  runtime_attempt_performed: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
```

## Next Work

The next useful step can be executable without touching runtime:

`CM-1821 M9 trusted-write-proposal envelope fixture contract`.

CM-1821 should add or extend local fixture/contract coverage for a
non-durable proposal envelope. It should enforce that:

- `trusted-write-proposal` allows proposal envelope rendering only;
- durable write/update/supersede/tombstone requests fail closed;
- missing proposal scope, operations, review route, rollback posture, or
  budgets fail closed;
- raw private payload, secret/config/env, provider/API, and public MCP expansion
  requests fail closed;
- accepted outputs remain redacted proposal shape/intent/rollback metadata
  only;
- no runtime, memory read, memory write, or durable state mutation occurs.

## Current Preflight Result

```yaml
cm1820_preflight_result:
  decision: exact_boundary_field_feasibility_partial_contract_work_can_start
  serves_project_final_goal: true
  accepted_m8_prerequisite_satisfied_for_planning: true
  safe_derived_constants_present: true
  candidate_target_transport_facts_present: true
  missing_exact_fields_present: true
  exact_trusted_write_proposal_boundary_complete: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  runtime_attempt_performed: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  next_action: cm1821_m9_trusted_write_proposal_envelope_fixture_contract
```
