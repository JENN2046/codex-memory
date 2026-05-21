# Autopilot Green File-Write Executor Boundary

Status: `NOT_READY_BLOCKED`
Evidence class: `design-boundary`, `fixture-only`, `read-only`
Task: `CM-0701`

This boundary reviews whether a real Green file-write executor may enter design. The answer is: design may proceed, but implementation is not authorized by this packet.

`readiness_claim_allowed=false`

## Boundary Decision

```text
GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED
```

The project has enough local no-op evidence to design the boundary for a real Green file-write executor, but not enough evidence to implement or activate it. Any later implementation must be a separate task.

## Required Design Gates

The design must specify:

- `exact_green_lane_only`
- `workspace_root_write_only`
- `allowed_path_classes_only`
- `explicit_write_set`
- `write_file_count_limit`
- `user_owned_diff_detection`
- `file_lock_check`
- `pre_write_diff_snapshot`
- `post_write_diff_review`
- `validation_before_checkpoint`
- `receipt_before_completion`
- `checkpoint_after_validation`
- `rollback_plan_required`
- `second_repair_stop`
- `readiness_claim_blocked`

## Allowed Path Classes

Only these path classes may be considered:

- docs
- fixtures
- tests
- schemas
- local_validators
- read_only_helpers
- dashboard_read_only_summaries
- `.agent_board`
- `README.md`
- `STATUS.md`

## Forbidden Path Classes

The design must keep these hard blocked:

- `package.json`
- `package-lock.json`
- `.env*`
- `data/**`
- `runs/**`
- `reports/**`
- `production/**`
- runtime durable data
- external repositories
- user Codex or Claude config files
- public MCP tool contract

## Implementation Hard Stops

The future executor must stop before:

- Amber or Red lane
- unknown target path
- disallowed target path
- dirty worktree ambiguity
- user-owned change conflict
- missing file lock evidence
- missing pre-write diff snapshot
- missing validation plan
- validation failure requiring judgment
- second repair attempt
- missing receipt or checkpoint plan
- overwrite without explicit allowance
- provider/API/MCP/memory/dependency/runtime/config/remote action
- readiness or cutover claim

## Not Authorized Here

This packet does not implement a file-write executor, does not write files through an executor, does not run validators through an executor, and does not activate sustained real mutation.
