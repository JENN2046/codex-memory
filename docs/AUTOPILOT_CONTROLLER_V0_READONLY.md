# AutopilotController v0 Read-Only / No-Op Executor

Updated: 2026-05-21

This document defines the first product-grade Autopilot controller surface for `codex-memory`.

It is a local read-only / no-op controller. It does not execute tasks, write runtime state, call providers, call MCP tools, read real memory stores, change dependencies, change config, push, deploy, cut over, or claim readiness.

## Purpose

`AutopilotController v0` turns the existing Smart Standing Authorization v3 governance surfaces into one controller cycle summary:

```text
goal + board reality
-> controller cycle
-> lane decision
-> execution boundary
-> validation plan
-> receipt requirement
-> checkpoint requirement
-> stop reason or next safe task
```

## Input Surfaces

- `AGENTS.md`
- `STATUS.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/AUTOPILOT_LEDGER.md`
- `.agent_board/VALIDATION_LOG.md`
- closed-loop dry-run summary
- Smart Standing Authorization v3 receipt parser summary
- dashboard local summaries

## Output Fields

- `goal_id`
- `controller_cycle_id`
- `current_state`
- `next_safe_task`
- `lane_decision`
- `execution_boundary`
- `validation_plan`
- `repair_once_available`
- `receipt_requirement`
- `checkpoint_requirement`
- `stop_reason`
- `red_gate_status`
- `readiness_claim_allowed=false`

## Boundary

The controller uses `read_only_noop_executor` mode.

It may:

- read local governance files
- summarize the next safe local task
- classify lane posture from local queue evidence
- emit validation and receipt requirements
- expose dashboard status

It must not:

- edit files as part of controller execution
- execute the selected task
- call provider/API/MCP
- read or write real memory
- run runtime probes
- change dependencies or config
- push, PR, tag, release, deploy, or cut over
- claim runtime, production, cutover, or `RC_READY` readiness
