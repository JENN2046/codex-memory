# Autopilot Controlled Green Executor Entry Packet

Status: `NOT_READY_BLOCKED`
Evidence class: `fixture-only`, `read-only`, `no-op`
Task: `CM-0699`

This document defines the entry packet required before the project can move from read-only Autopilot control surfaces toward a controlled Green executor. It does not activate an executor, execute tasks, write runtime state, call provider/API/MCP, access a real memory store, change dependencies or config, perform runtime probes, push, deploy, or make any readiness claim.

`readiness_claim_allowed=false`

## Entry Decision

The current decision is:

```text
GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED
```

The packet is ready for local review, but the executor remains inactive. The only next safe action is to review this packet and, in a later separate task, decide whether a fixture-backed controlled Green executor skeleton may be implemented.

## Required Admission Conditions

The controlled Green executor must not activate unless every condition is true:

- `v3_default_model_active`
- `read_only_controller_ok`
- `closed_loop_summary_ok`
- `operator_console_ok`
- `action_adapter_contract_ok`
- `validation_planner_ok`
- `replay_harness_ok`
- `receipt_parser_ok`
- `dashboard_rollup_ok`
- `red_gate_inbox_fail_closed`
- `readiness_claim_allowed_false`
- `executor_scope_green_only`

## Allowed Green Executor Scope

The future controlled Green executor may only operate on:

- docs
- fixtures
- tests
- `.agent_board`
- local validators
- read-only helpers
- dashboard read-only summaries

It must remain local, reversible, non-destructive, non-secret-bearing, non-provider, non-MCP, non-real-memory, non-runtime, non-dependency-changing, and non-remote.

## Forbidden Boundaries

The entry packet does not authorize:

- provider/API/plugin/image generation
- MCP tool calls
- real memory scan/read/write/import/export/migration
- real VCPChat or VCPToolBox broad read/write
- dependency add/remove/upgrade/audit-fix/package-manager switch
- runtime startup/watchdog/config change
- secret read/edit
- `.env*` modification
- push/PR/tag/release/deploy/cutover
- destructive filesystem or Git action
- public MCP tool/schema expansion
- readiness, cutover, production, or `RC_READY` claim

## Preflight Contract

A future controlled Green executor attempt must produce a preflight before any write:

- task id
- lane
- exact target files
- forbidden files
- expected write count
- validation plan
- rollback or cleanup path
- receipt requirement
- checkpoint requirement
- hard-stop conditions

If the preflight cannot prove Green-only scope, the attempt must stop.

## Stop Reasons

The packet must fail closed on:

- non-green lane requested
- unknown file scope
- disallowed file scope
- missing validation plan
- missing checkpoint plan
- receipt ambiguity
- dirty worktree ambiguity
- user-owned change conflict
- second repair attempt
- hard-stop boundary detected
- readiness overclaim attempted

Machine-checkable stop reason ids:

- `non_green_lane_requested`
- `unknown_file_scope`
- `disallowed_file_scope`
- `missing_validation_plan`
- `missing_checkpoint_plan`
- `receipt_ambiguity`
- `dirty_worktree_ambiguity`
- `user_owned_change_conflict`
- `second_repair_attempt`
- `hard_stop_boundary_detected`
- `readiness_overclaim_attempted`

## Activation Boundary

This packet is not activation. A later implementation task must still keep the executor fixture-backed first, prove fail-closed behavior, and keep `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
