# VCP Memory Observe-Full M7 Blocked Precondition Record

Task id: `M7-K0-OBSERVE-FULL-BLOCKED-PRECONDITION-RECORD`
Implementation slice: `CM-1727`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_M6_BLOCKED_CLOSEOUT_SUMMARY.md`
Evidence type: `docs-only`, `blocked precondition`, `no-runtime`

## Purpose

This document records why M7 observe-full read shape proof is not currently
unlocked and defines the safe precondition boundary for future M7 work.

It is not a read-shape proof packet, read query, runtime call, target binding,
approval request, approval grant, approval-line generation, fallback execution,
or M8 unlock. It does not call VCPToolBox, inspect runtime, read memory, write
memory, call providers/APIs, read secrets/config, expand public MCP tools, or
push remote state.

## M7 Plan Requirement

M7 requires an exact-approved bounded read-shape proof with low-disclosure
output. The archived plan requires:

- M6 observe-lite receipt accepted;
- Jenn exact read-shape approval;
- exact target alias;
- exact profile of `observe-full` or narrower;
- exact query;
- exact result budget;
- redacted shape/metadata output unless otherwise approved;
- no write;
- no broad scan;
- abort on unexpected private data, result budget overflow, visibility
  mismatch, or cross-client leakage.

None of the live/read prerequisites are satisfied by CM-1727.

## Current Precondition State

```yaml
m7_precondition_state:
  record_id: m7_observe_full_blocked_precondition_record_cm1727
  source_m6_closeout: cm1726
  m6_observe_lite_receipt_accepted: false
  jenn_exact_read_shape_approval_present: false
  target_alias_bound: false
  profile_bound: false
  exact_query_present: false
  result_budget_present: false
  output_disclosure_bound: false
  read_shape_proof_started: false
  runtime_attempt_performed: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  fallback_executed: false
  m8_unlocked: false
  readiness_claimed: false
  current_decision: m7_blocked_missing_m6_receipt_and_exact_read_approval
```

## Blocking Conditions

M7 remains blocked before runtime by:

- missing accepted M6 observe-lite receipt;
- missing Jenn exact read-shape approval;
- missing exact target alias;
- missing exact profile;
- missing exact query;
- missing exact result budget;
- missing exact output disclosure boundary;
- missing client/scope/visibility confirmation for read-shape proof.

Any read-shape runtime attempt before these are present would be out of scope.

## Future Exact Approval Requirement

A future M7 approval boundary must include:

| Field | Required before runtime | Notes |
|---|---|---|
| `m6_receipt_id` | exact accepted receipt id | proves observe-lite target/transport only |
| `target_alias` | exact safe alias | no path, endpoint, token, secret, or locator |
| `profile` | exact `observe-full` or narrower | no trusted-full-read escalation |
| `query` | exact bounded query | no broad scan or raw dump |
| `client_id` | exact client id | used for scope and visibility checks |
| `workspace_scope` | exact workspace/project | no scope expansion |
| `owner_scope` | exact owner/operator | no ambiguous principal |
| `visibility` | exact visibility boundary | prevent cross-client leakage |
| `max_calls` | exact integer | bounded runtime budget |
| `max_results` | exact integer | bounded result shape only |
| `max_duration_seconds` | exact integer | bounded runtime duration |
| `output_disclosure` | exact redacted shape/metadata boundary | raw private output forbidden unless separately exact-approved |

## Non-Claims

```yaml
m7_precondition_non_claims:
  m7_started: false
  m7_read_shape_proof_completed: false
  m7_completion_claimed: false
  m8_unlocked: false
  exact_read_approval_present: false
  query_present: false
  runtime_attempt_performed: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  fallback_executed: false
  readiness_claimed: false
```

## Current Record Result

```yaml
current_record_result:
  decision: m7_blocked_missing_m6_receipt_and_exact_read_approval
  serves_project_final_goal: true
  blocked_before_runtime: true
  read_shape_proof_started: false
  m8_unlocked: false
  next_safe_route: m7_exact_approval_packet_preparation_without_query_or_runtime
```

## M7-K0 Blocked Precondition Conclusion

CM-1727 records that M7 is not unlocked. The only safe next M7 work is a
non-authorizing exact approval packet preparation that still omits real query
values and does not execute runtime.

No read-shape proof may start until an accepted M6 observe-lite receipt and a
separate current Jenn exact read-shape approval exist.
