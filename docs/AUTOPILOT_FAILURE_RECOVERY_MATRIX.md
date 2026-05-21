# Autopilot Failure Recovery Matrix

Updated: 2026-05-21

This matrix defines fail-closed stop reasons for the local Smart Standing Authorization v3 closed loop.

It is local governance only. It does not grant provider, MCP, real memory, dependency, config, push, release, deploy, or readiness authority.

| Failure Type | Stop Reason | Safe State | Next After Approval |
|---|---|---|---|
| validation_fail | validation_failed_after_allowed_attempt | preserve diff and validation output summary | user decides repair direction or approves broader validation |
| scope_drift | scope_drift_detected | stop before editing unrelated files | user narrows or expands scope explicitly |
| budget_exhausted | autonomy_envelope_budget_exhausted | record used budget and stop | user grants a new exact envelope |
| red_gate | red_lane_condition_detected | no Red action executed | user gives explicit exact approval or cancels |
| dirty_worktree | unexpected_dirty_worktree | protect user-owned changes | user confirms ownership or asks for isolation |
| user_owned_change | user_owned_change_would_be_overwritten | leave files untouched | user authorizes overwrite or supplies merge direction |
| missing_evidence | required_evidence_missing | mark task blocked, no readiness claim | user approves evidence collection or narrows acceptance |
| non_obvious_repair | repair_requires_design_judgment | stop after at most one obvious repair | user decides design or approves a new task |

## Repair Rule

The closed loop may attempt one obvious, local, reversible repair after validation failure.

It must stop when:

- the first repair fails
- the repair is not obvious
- the fix would cross a Red Lane boundary
- the fix would overwrite user-owned work
- the fix requires provider/runtime/memory/dependency/config action not already exact and budgeted
