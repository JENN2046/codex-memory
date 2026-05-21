# Autopilot Checkpoint / Resume / Replay Harness

Status: `NOT_READY_BLOCKED`
Evidence class: `fixture-only`, `read-only`, `no-op`
Task: `CM-0696`

This document defines the product-grade resume and replay skeleton for the local Autopilot loop. It is a control-plane contract only. It does not replay real actions, write runtime state, modify `.agent_board`, call provider/API/MCP, access a real memory store, change dependencies or config, perform runtime probes, push, deploy, or make any readiness claim.

`readiness_claim_allowed=false`

## Purpose

The harness lets an operator or future controller inspect whether a previous local Autopilot attempt can be resumed or replayed from evidence. It models:

- cycle checkpoint verification
- attempt replay in no-op mode
- receipt reconciliation
- dirty worktree protection
- partial attempt recovery
- stale board detection
- resume token inspection
- stop reason replay

## Required Scenarios

- `cycle_checkpoint_ok`: confirms a cycle checkpoint can be summarized from fixture evidence.
- `attempt_replay_noop`: replays an attempt trace as a no-op summary only.
- `receipt_reconciliation_missing_receipt`: fails closed when a completed Amber-like action has no receipt evidence.
- `dirty_worktree_protection`: fails closed when the replay fixture says user-owned or unknown worktree changes are present.
- `partial_attempt_recovery`: reports recoverable read-only state when a partial attempt has enough local evidence to resume planning, but not to replay actions.
- `stale_board_detection`: fails closed when board snapshot age or task facts drift from replay evidence.
- `resume_token_ok`: proves the resume token shape can be read without mutation.
- `stop_reason_replay`: replays a hard stop reason as blocked evidence.

The fixture also includes `second_repair_attempt_replay` to verify that a second repair attempt remains fail-closed.

## Fail-Closed Reasons

The harness must cover:

- `dirty_worktree_detected`
- `missing_receipt_evidence`
- `stale_board_snapshot`
- `partial_attempt_without_checkpoint`
- `red_gate_event_replayed`
- `second_repair_attempt_replayed`

These are replay results, not live runtime events.

## Boundaries

The harness must not:

- replay real actions
- write `.agent_board`, ledger, checkpoints, runtime state, or durable data
- call provider/API/MCP
- call `record_memory`, `search_memory`, or `memory_overview`
- read or write a real memory store
- run runtime probes
- change dependencies, config, watchdog, or startup behavior
- push, PR, tag, release, deploy, or cut over
- expose secrets
- claim runtime readiness, cutover readiness, production readiness, or `RC_READY`

## Dashboard Surface

The dashboard may show a read-only summary:

- `autopilotReplay.status`
- `harness_id`
- `scenario_count`
- `fail_closed_scenario_count`
- `recovery_scenario_count`
- `resume_token_supported`
- `receipt_reconciliation_supported`
- `dirty_worktree_protection_supported`
- `read_only=true`
- `replays_real_actions=false`
- `writes_state=false`
- `readiness_claim_allowed=false`

This is an operator observation surface only.
