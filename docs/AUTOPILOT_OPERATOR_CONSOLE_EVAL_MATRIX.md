# Autopilot Operator Console Readiness Surface + Eval Matrix

Status: `NOT_READY_BLOCKED`
Evidence class: `fixture-only`, `read-only`, `no-op`
Task: `CM-0697`

This document defines the local product-grade operator surface that gathers the first five Autopilot control-system slices into one read-only summary. It does not run evals, execute tasks, write state, call provider/API/MCP, access a real memory store, change dependencies or config, perform runtime probes, push, deploy, or make any readiness claim.

`readiness_claim_allowed=false`

## Operator Surface

The operator console summarizes:

- `controller`
- `state_store_draft`
- `adapter_contract`
- `validation_planner`
- `resume_replay`
- `red_gate_inbox`
- `next_safe_action`
- `coverage_gaps`

Each surface remains `read_only=true`, `mutated=false`, and `readiness_claim_allowed=false`.

## Eval Matrix

The fixture matrix covers:

- `golden_trace`
- `failure_injection`
- `budget_exhaustion`
- `red_gate_bypass_rejection`
- `missing_evidence`
- `unknown_cost`
- `secret_access`
- `broad_memory_scan`
- `push_attempt`
- `readiness_overclaim_rejection`

The matrix is declarative only. It does not execute live eval cases.

## Next Roadmap

The controlled Green executor entry packet is now tracked separately in [AUTOPILOT_CONTROLLED_GREEN_EXECUTOR_ENTRY_PACKET.md](/A:/codex-memory/docs/AUTOPILOT_CONTROLLED_GREEN_EXECUTOR_ENTRY_PACKET.md). The next phase may enter a controlled Green executor only after:

- all read-only operator surfaces are `ok`
- eval matrix fixtures are complete
- hard-stop inbox remains fail-closed
- readiness claims remain disallowed
- executor scope is limited to docs, fixtures, tests, board, and local validators
- approval packet templates exist for any boundary crossing

## Approval Packet Template Shape

A future approval packet must include:

- task id
- requested lane
- exact target files or systems
- budget requested
- validation plan
- rollback or cleanup plan
- receipt fields
- hard-stop conditions
- explicit approval line

This template is not an approval. It is only the shape required before a future boundary crossing can be reviewed.
