# Autopilot Green File-Write Executor Contract

Status: `NOT_READY_BLOCKED`
Evidence class: `design-contract`, `fixture-only`, `read-only`
Task: `CM-0702`

This document defines the contract for a future real Green file-write executor. It is a design contract only: it does not implement an executor, does not write files, does not run validators, does not write receipts or checkpoints, and does not activate sustained mutation.

`readiness_claim_allowed=false`

## Contract Decision

```text
GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED
```

The contract is ready for review as the next design layer after the boundary packet. Implementation remains blocked until a later task proves the same rules with code-level preflight tests and a separate activation review.

## Execution Model

The future executor may only accept tasks that are already classified as Green. It must reject Amber, Red, unknown, mixed-lane, or unclassified tasks before any file mutation.

The execution cycle must be:

1. `intake_task`
2. `classify_lane_green_only`
3. `resolve_workspace_root`
4. `normalize_explicit_write_set`
5. `classify_path_classes`
6. `check_file_locks`
7. `detect_user_owned_diff`
8. `capture_pre_write_snapshot`
9. `apply_single_write_batch`
10. `inspect_post_write_diff`
11. `run_required_validation_plan`
12. `emit_receipt`
13. `update_checkpoint`
14. `select_next_safe_task_or_stop`

## Required Task Fields

Every future executable task must include:

- `task_id`
- `goal_id`
- `lane`
- `task_kind`
- `scope`
- `allowed_files_or_systems`
- `forbidden_files_or_systems`
- `explicit_write_set`
- `expected_write_count`
- `max_write_files`
- `overwrite_existing_files_allowed`
- `validation_required`
- `validation_plan`
- `receipt_required`
- `checkpoint_required`
- `rollback_or_cleanup_plan`
- `repair_attempt_count`
- `stop_conditions`

## Allowed Write Operations

Only these operation kinds may be designed:

- `create_new_text_file`
- `update_existing_text_file`
- `append_board_record`
- `update_dashboard_summary_shape`
- `update_local_validator_contract`
- `update_schema_or_fixture`

All operations must be workspace-root relative, text-only, deterministic, and covered by the explicit write set.

## Required Preflight Gates

The future executor must pass every preflight before writing:

- `green_lane_confirmed`
- `workspace_root_confirmed`
- `explicit_write_set_present`
- `write_count_within_budget`
- `all_paths_workspace_relative`
- `all_paths_allowed_class`
- `forbidden_paths_absent`
- `file_locks_available`
- `user_owned_diff_absent_or_owned_by_task`
- `pre_write_snapshot_available`
- `validation_plan_present`
- `receipt_plan_present`
- `checkpoint_plan_present`
- `rollback_plan_present`
- `readiness_claim_blocked`

## Required Post-Write Gates

After a future write batch, the executor must prove:

- `post_write_diff_available`
- `diff_matches_explicit_write_set`
- `no_forbidden_path_touched`
- `validation_executed_or_documented_unavailable`
- `validation_passed_before_checkpoint`
- `receipt_emitted_before_completion`
- `checkpoint_updated_after_validation`
- `repair_attempt_count_at_most_one`
- `next_safe_task_selected_or_stop_reason_recorded`
- `readiness_claim_still_blocked`

## Fail-Closed Rejection Cases

The future executor must reject:

- `amber_lane_task`
- `red_lane_task`
- `unknown_lane_task`
- `mixed_lane_task`
- `missing_explicit_write_set`
- `write_count_exceeds_budget`
- `absolute_path_requested`
- `outside_workspace_path`
- `disallowed_path_class`
- `forbidden_path_requested`
- `file_lock_missing`
- `user_owned_diff_conflict`
- `pre_write_snapshot_missing`
- `validation_plan_missing`
- `receipt_plan_missing`
- `checkpoint_plan_missing`
- `rollback_plan_missing`
- `overwrite_without_allowance`
- `second_repair_attempt`
- `external_side_effect_requested`
- `readiness_claim_requested`

## Activation Block

This contract does not authorize:

- executor implementation
- executor activation
- real file writes through executor
- validator execution through executor
- receipt or checkpoint writes through executor
- provider/API/MCP calls
- real memory read/write
- dependency/config/runtime changes
- push/PR/tag/release/deploy
- readiness, cutover, production, or `RC_READY` claim

The next safe step is a separate implementation preflight packet, not implementation or activation.

## Code-Level Preflight Tests

Task `CM-0703` adds code-level preflight tests without executor implementation.

The preflight helper may evaluate synthetic task input and return only:

- `PREFLIGHT_ACCEPTED_NO_WRITE`
- `REJECTED_FAIL_CLOSED`

It must always report:

- `mutated=false`
- `writes_files=false`
- `executes_tasks=false`
- `validators_run_by_executor=false`
- `receipts_written_by_executor=false`
- `checkpoints_written_by_executor=false`
- `readiness_claim_allowed=false`

The tests cover:

- a complete Green docs task accepted as no-write preflight
- allowed path classes
- lane and write-set rejection
- path boundary rejection
- evidence and closeout rejection

These tests are not executor activation. They only lock the future executor's pre-write gate behavior.
