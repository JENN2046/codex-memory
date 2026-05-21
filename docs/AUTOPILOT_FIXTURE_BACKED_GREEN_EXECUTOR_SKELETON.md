# Autopilot Fixture-Backed Green Executor Skeleton

Status: `NOT_READY_BLOCKED`
Evidence class: `fixture-only`, `read-only`, `no-op`
Task: `CM-0700`

This document defines the first controlled Green executor skeleton. It is fixture-backed and no-op only: it reads a local synthetic execution plan, classifies Green-only task fixtures, emits preflight and execution-plan summaries, and rejects every non-Green or side-effectful boundary.

It does not write files, execute tasks, run validators, apply repairs, write receipts, update checkpoints, call provider/API/MCP, access a real memory store, change dependencies or config, perform runtime probes, push, deploy, or make any readiness claim.

`readiness_claim_allowed=false`

## Skeleton Decision

```text
GREEN_EXECUTOR_SKELETON_NOOP_READY
```

This means the local no-op skeleton shape is present and validated. It does not mean the executor is activated for real task execution.

## Executor Scope

Allowed synthetic task kinds:

- `docs_update_fixture`
- `schema_fixture_update`
- `test_fixture_update`
- `board_status_update`
- `validator_local_update`
- `dashboard_summary_update`

Allowed adapter kinds:

- `file_edit_adapter_noop`
- `validation_command_adapter_noop`
- `checkpoint_adapter_noop`
- `receipt_adapter_noop`

All adapters are no-op stubs. They only report what would be required by a future Green execution.

## Required Preflight Fields

Every executable fixture task must include:

- `task_id`
- `lane`
- `task_kind`
- `target_files`
- `forbidden_files`
- `expected_write_count`
- `validation_plan`
- `checkpoint_required`
- `receipt_required`
- `rollback_or_cleanup_path`
- `hard_stop_conditions`
- `expected_noop_result`

## Fail-Closed Cases

The skeleton must reject:

- `amber_lane_requested`
- `red_lane_requested`
- `disallowed_path_requested`
- `unknown_task_kind`
- `missing_validation_plan`
- `missing_checkpoint_plan`
- `write_requested`
- `provider_requested`
- `mcp_requested`
- `real_memory_requested`
- `dependency_requested`
- `runtime_probe_requested`
- `push_requested`
- `readiness_claim_requested`

## Execution Boundary

The current skeleton may only return:

- `NOOP_EXECUTION_PLAN_READY`
- `REJECTED_FAIL_CLOSED`

It must never return a real mutation result. Any future implementation that writes files must be a separate task with stronger tests and a fresh boundary review.
