# HANDOFF.md — codex-memory

## Goal

Resume after `P11.4-lifecycle-read-policy-runtime-flag-planning` in `A:\codex-memory`.

## Workspace

- Workspace: A:\codex-memory
- Branch: main
- HEAD before this planning batch: `720a852`
- Remote state before this planning batch: local `main == origin/main == remote main`
- Remote boundary: no push / tag / release / deploy without explicit authorization

## Current Area

memory-governance / lifecycle-read-policy-planning

## Completed In Current Batch

- Added [MEMORY_LIFECYCLE_READ_POLICY_PLAN.md](/A:/codex-memory/docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md).
- Planned `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=false` as default-off future flag.
- Kept relationship with `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY=false` explicit.
- Defined status visibility matrix:
  - `active` and `stale` visible when policy is enabled.
  - `proposal`, `rejected`, `superseded`, and `tombstoned` hidden by default.
- Defined lifecycle policy ordering with project/workspace/client/visibility scope.
- Defined future read audit fields:
  - `readPolicyApplied`
  - `lifecyclePolicyApplied`
  - `lifecycleIncludedStatuses`
  - `lifecycleExcludedStatuses`
  - `hiddenByLifecycleCount`
  - `staleResultCount`
- Linked the new plan from lifecycle core and SQLite dry-run plans.
- Updated backlog/status/board state.

## Changed Files

- `docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md`
- `docs/MEMORY_LIFECYCLE_CORE_PLAN.md`
- `docs/MEMORY_LIFECYCLE_SQLITE_DRY_RUN_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `git diff --check`：passed with CRLF/LF normalization warning only for `.agent_board/TASK_QUEUE.md`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`：passed

## MCP Mode

- Public MCP tools remain `record_memory` / `search_memory` / `memory_overview`.
- This batch does not modify MCP tool definitions or add new tools.

## HTTP Health

- Not required for P11.4 docs/board-only planning.

## Audit / Recall Impact

- No runtime audit or recall behavior changed.
- `search_memory` default behavior is unchanged.
- Lifecycle read policy is planning only; no filtering was implemented.

## Remaining Risks

- P11.5 fixture tests are needed before runtime implementation.
- P11.6 optional runtime flag implementation must preserve default-off behavior.
- Controlled mutation tools remain P12 future work and require separate approval.

## Next Safe Step

Close out without push. Recommended next task: `P11.5-lifecycle-read-policy-fixture-tests`.
