# VCP Memory Trusted-Full-Read M8 Blocked Precondition Record

Task id: `M8-K0-TRUSTED-FULL-READ-BLOCKED-PRECONDITION-RECORD`
Implementation slice: `CM-1733`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_FULL_M7_BLOCKED_CLOSEOUT_SUMMARY.md`
Evidence type: `docs-only`, `blocked precondition`, `no-runtime`

## Purpose

This document records why M8 trusted-full-read workflow harness work is not
currently unlocked and defines the safe precondition boundary for future M8
work.

It is not a trusted-full-read harness draft, workflow run, read query, runtime
call, target binding, approval request, approval grant, approval-line
generation, mutation proposal, readiness claim, fallback execution, or M9
unlock. It does not call VCPToolBox, inspect runtime, read memory, write
memory, call providers/APIs, read secrets/config, expand public MCP tools, or
push remote state.

## M8 Plan Requirement

M8 requires sustained bounded read-only workflow evidence for Codex and Claude
after target and read shape are bounded. The archived plan requires:

- an accepted M7 observe-full read-shape receipt;
- an approved trusted-full-read profile;
- multiple bounded recall operations;
- client_id isolation evidence;
- checkpoint/handoff receipt chain;
- audit receipts;
- fallback and abort behavior evidence;
- no durable writes;
- no public MCP expansion;
- no production claim.

None of the live/read workflow prerequisites are satisfied by CM-1733.

## Current Precondition State

```yaml
m8_precondition_state:
  record_id: m8_trusted_full_read_blocked_precondition_record_cm1733
  source_m7_closeout: cm1732
  m7_observe_full_read_shape_receipt_accepted: false
  trusted_full_read_profile_approved: false
  workflow_harness_started: false
  multi_step_read_only_workflow_bound: false
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
  current_decision: m8_blocked_missing_m7_read_shape_receipt
```

## Blocking Conditions

M8 remains blocked before workflow/runtime by:

- missing accepted M7 observe-full read-shape receipt;
- missing approved trusted-full-read profile;
- missing exact workflow step limit;
- missing exact bounded recall operation set;
- missing exact client id and client isolation boundary;
- missing exact workspace scope;
- missing exact owner scope;
- missing exact visibility boundary;
- missing exact runtime call budget;
- missing exact result budget per step;
- missing exact duration budget;
- missing checkpoint/handoff receipt boundary;
- missing audit receipt chain boundary.

Any trusted-full-read workflow attempt before these are present would be out of
scope.

## Future Exact Approval Requirement

A future M8 approval boundary must include:

| Field | Required before workflow/runtime | Notes |
|---|---|---|
| `m7_read_shape_receipt_id` | exact accepted receipt id | proves observe-full result shape only |
| `profile` | exact `trusted-full-read` or narrower | no write or mutation profile |
| `workflow_step_limit` | exact integer | bounded sustained workflow |
| `recall_operations` | exact bounded operation list | no broad scan or raw dump |
| `client_ids` | exact client id set | Codex/Claude isolation required |
| `workspace_scope` | exact workspace/project | no scope expansion |
| `owner_scope` | exact owner/operator | no ambiguous principal |
| `visibility` | exact visibility boundary per client | prevent cross-client leakage |
| `max_calls` | exact integer | bounded runtime budget |
| `max_results_per_step` | exact integer | bounded result shape only |
| `max_duration_seconds` | exact integer | bounded workflow duration |
| `output_disclosure` | exact redacted receipt boundary | raw private output forbidden unless separately exact-approved |
| `receipt_chain` | exact checkpoint/handoff/audit receipt rules | no durable memory write implied |

The approved action must remain read-only workflow evidence only: bounded recall
steps, client-isolation checks, checkpoint/handoff receipt capture, audit
receipt capture, fallback/abort evaluation, and policy evaluation.

## Non-Claims

```yaml
m8_precondition_non_claims:
  m8_started: false
  m8_trusted_full_read_harness_completed: false
  m8_completion_claimed: false
  m9_unlocked: false
  m7_read_shape_receipt_accepted: false
  trusted_full_read_profile_present: false
  workflow_harness_started: false
  runtime_attempt_performed: false
  memory_read_performed: false
  memory_write_performed: false
  durable_write_allowed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  readiness_claimed: false
```

## Current Record Result

```yaml
current_record_result:
  decision: m8_blocked_missing_m7_read_shape_receipt
  serves_project_final_goal: true
  blocked_before_workflow_runtime: true
  trusted_full_read_harness_started: false
  m9_unlocked: false
  next_safe_route: m8_non_authorizing_harness_draft_boundary_or_wait_for_exact_approval
```

## M8-K0 Blocked Precondition Conclusion

CM-1733 records that M8 is not unlocked. The only safe next M8 work is a
non-authorizing harness draft boundary that still omits real workflow values
and does not execute runtime, or waiting for an accepted M7 observe-full receipt
and a separate current Jenn exact trusted-full-read approval.

No trusted-full-read workflow may start until an accepted M7 read-shape receipt
and a separate current Jenn exact trusted-full-read approval exist.
