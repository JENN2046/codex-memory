# CM-1709 VCPToolBox Stage 02 Exact Approval Decision Intake Boundary

CM-1709 adds a fixture-only helper:

```text
src/core/VcpToolBoxStage02ExactApprovalDecisionIntakeBoundary.js
```

The helper accepts a sanitized human review outcome after CM-1708 packet review.
It classifies the outcome without issuing, consuming, storing, validating,
exposing, or generating an approval line. It does not inspect runtime or
authorize runtime.

## Contract

The helper accepts caller-provided sanitized summaries for:

- Master / Stage 02 / Version references;
- CM-1708 packet review boundary status;
- CM-1707 packet preflight status;
- future approval packet candidate scope;
- sanitized human review outcome;
- CM-1705 future execution boundary;
- current zero-runtime decision-intake envelope;
- CM-1704 receipt plan;
- zero counters;
- `project_final_goal` review.

Accepted outputs:

```text
exact_approval_approve_request_intake_ready
exact_approval_reject_intake_ready
exact_approval_needs_adjustment_intake_ready
```

Blocked outputs:

```text
blocked_needs_exact_approval_packet_review_boundary
blocked_needs_exact_approval_packet_preflight
blocked_needs_exact_approval_decision_intake_boundary
blocked_needs_receipt_plan
needs_plan_adjustment
```

## Outcome Routes

`approve_requested` means only that a future exact approval request may be
prepared. It does not mean an approval line exists, approval was granted, or
runtime may start.

`reject` closes the current runtime route and does not prepare a future approval
request.

`needs_adjustment` routes back to plan adjustment and does not prepare a future
approval request.

All three accepted outcomes keep:

```text
approval line issue/consume/store/validate/generate: 0
runtime authorization: false
runtime route opened: false
readiness claim: false
complete V8 claim: false
```

## Current Intake Boundary

Current intake actions are limited to:

```text
sanitized_human_review_outcome_intake
decision_route_classification
receipt_plan_review
no_approval_no_runtime_intake
```

All current budgets are zero:

```text
runtime: 0
memory: 0
provider: 0
write: 0
approval line issue/consume/store/validate/generate: 0
```

## Future Runtime Boundary

Future runtime actions remain only the CM-1705 bounded set:

```text
target_presence_probe
runtime_handshake_probe
target_specific_no_memory_inspection
```

Those future actions are not executed by CM-1709 and still require a later
fresh exact approval path.

## Fail-Closed Conditions

The helper rejects:

- missing Master, Stage 02, Version, or `project_final_goal` review;
- missing CM-1708 packet review boundary;
- missing CM-1707 packet preflight;
- missing or expanded CM-1705 boundary;
- missing or unsafe CM-1704 receipt plan;
- missing packet scope summaries;
- missing, unknown, or unsafe decision outcome;
- approval-line value exposure, validation, generation, issue, consume, store,
  or presence;
- target locator, endpoint, path, port, host, process, runtime log, config,
  secret, token, credential, raw memory, raw runtime, or provider response
  fields;
- current intake action or budget expansion;
- future runtime action expansion;
- nonzero runtime, memory, provider, write, MCP, startup/config, approval,
  readiness, release, deploy, push, or complete-V8 counters.

## Review

Closeout question:

```text
Does this work still serve project_final_goal?
```

Answer for CM-1709:

```text
yes - it keeps human review outcome intake separate from exact approval and
runtime authorization, preserving the Stage 02 no-approval/no-runtime boundary.
```
