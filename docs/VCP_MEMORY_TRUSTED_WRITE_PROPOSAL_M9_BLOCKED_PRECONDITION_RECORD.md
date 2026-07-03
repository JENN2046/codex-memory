# VCP Memory Trusted-Write-Proposal M9 Blocked Precondition Record

Task id: `M9-K0-TRUSTED-WRITE-PROPOSAL-BLOCKED-PRECONDITION-RECORD`
Implementation slice: `CM-1740`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_FULL_READ_M8_BLOCKED_CLOSEOUT_SUMMARY.md`
Evidence type: `docs-only`, `blocked precondition`, `no-runtime`

## Purpose

This record defines the blocked entry state for M9 governed mutation proposal
mode.

M9 is not a durable write phase. It may only create reviewable, low-disclosure
mutation proposals inside a future exact-approved `trusted-write-proposal`
boundary, and only after the required read-proof evidence exists.

This document does not call VCPToolBox, inspect runtime, read memory, generate a
real approval line, submit an approval request, generate a mutation proposal,
submit a proposal, write memory, update memory, supersede memory, tombstone
memory, call providers/APIs, expand public MCP tools, unlock M10, or claim
readiness.

## Source Plan Boundary

The archived plan defines M9 as `Governed Mutation Proposal Mode` with:

- goal: create non-durable mutation proposals before any write;
- scope: proposal envelope, diff/intent/rollback receipt, no durable write;
- allowed action: proposal generation inside approved boundary;
- forbidden actions: durable mutation and irreversible deletion;
- dependency: M8;
- next phase unlocked only by accepted proposal receipts.

The future-phase file also requires M8 trusted-full-read workflow evidence,
a specified mutation proposal envelope, and an L4 hard-stop shield for write
intent before M9 can run.

## Current Precondition State

```yaml
m9_precondition_state:
  precondition_id: m9_trusted_write_proposal_blocked_precondition_cm1740
  source_m8_closeout: cm1739
  profile: trusted-write-proposal
  m8_trusted_full_read_receipt_accepted: false
  trusted_write_proposal_profile_approved: false
  exact_proposal_scope_present: false
  exact_write_operation_list_present: false
  governance_proposal_envelope_present: false
  proposal_review_policy_present: false
  runtime_attempt_performed: false
  approval_line_present: false
  approval_line_generated: false
  approval_request_submitted: false
  approval_granted: false
  execution_authorized: false
  write_proposal_generated: false
  write_proposal_submitted: false
  durable_write_performed: false
  memory_write_performed: false
  memory_read_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
  current_decision: m9_blocked_missing_m8_receipt_and_exact_write_proposal_approval
```

## Blocking Conditions

M9 remains blocked because these inputs are absent:

| Required input | Current state | Consequence |
|---|---|---|
| Accepted M8 trusted-full-read workflow receipt | absent | write-proposal mode has no accepted read proof substrate |
| Jenn exact `trusted-write-proposal` boundary | absent | proposal generation is not authorized |
| Exact target alias, transport, client ids, workspace scope, owner scope, and visibility | absent | cross-client and scope leakage cannot be ruled out |
| Exact proposal operation list | absent | proposal generation could imply unauthorized write intent |
| Governance proposal envelope | absent | diff, intent, rollback posture, and acceptance/rejection semantics are not bound |
| Proposal review policy | absent | no reviewer route exists for accepting or rejecting proposals |
| L4 hard-stop shield for write intent | not evidenced for this phase | direct durable write requests must fail closed |

## Future Exact Approval Requirements

A future exact approval packet for M9 must define all of the following without
including raw paths, endpoints, tokens, secrets, raw memory, provider payloads,
or approval-line values:

```yaml
future_exact_approval_requirements:
  accepted_m8_trusted_full_read_receipt_id: required
  target_alias: required_low_disclosure_alias
  transport: required
  proposal_scope: required
  proposal_operations: required_exact_list
  proposal_payload_shape: required_low_disclosure_shape
  client_ids: required_presence_or_exact_approved_values
  workspace_scope: required
  owner_scope: required
  visibility: required
  max_calls: required_bounded_number
  max_proposals: required_bounded_number
  max_duration_seconds: required_bounded_number
  output_disclosure: required
  review_route: required
  write_allowed: false
  durable_write_allowed: false
  provider_api_allowed: false
  public_mcp_expansion_allowed: false
```

## Non-Claims

```yaml
write_proposal_ready: false
write_proposal_generated: false
write_proposal_submitted: false
durable_write_performed: false
memory_write_performed: false
accepted_m8_trusted_full_read_receipt_present: false
exact_trusted_write_proposal_approval_present: false
runtime_attempt_performed: false
approval_line_present: false
approval_line_generated: false
approval_request_submitted: false
approval_granted: false
execution_authorized: false
memory_read_performed: false
provider_api_called: false
secret_or_config_read: false
raw_private_payload_disclosed: false
public_mcp_expansion_performed: false
fallback_executed: false
m10_unlocked: false
readiness_claimed: false
```

## Current Decision

```yaml
decision: m9_blocked_missing_m8_receipt_and_exact_write_proposal_approval
serves_project_final_goal: true
runtime_attempt_performed: false
exact_approval_required_before_runtime: true
next_safe_route: m9_trusted_write_proposal_harness_draft_boundary_or_wait_for_exact_jenn_boundary
```

## M9-K0 Conclusion

CM-1740 records that M9 is not executable yet. The safe continuation is a
docs-only `trusted-write-proposal` harness draft boundary or exact approval
packet preparation, still without workflow execution, real approval line,
proposal generation, proposal submission, memory read, durable write, runtime,
provider/API call, public MCP expansion, readiness claim, or M10 unlock.
