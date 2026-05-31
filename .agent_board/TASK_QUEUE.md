# TASK_QUEUE.md - codex-memory

Persistent active task queue. Historical task rows before CM-1203 are archived through Git; see [docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md).

Statuses:

```text
todo
in_progress
done
blocked
skipped
cancelled
```

Areas:

```text
P0-mainline-health
P1-donor-compatibility
P2-active-memory
P3-provider-profile
P4-http-runtime
P5-rollback-readiness
P6-docs-drift
P7-vcp-parity-hardening
P8-memory-governance
P9-codex-claude-client-scope
P10-observability-admin
```

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-1206 | 1206 | done | P6-docs-drift | Green docs/status wording; user-authorized push sync; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `STATUS.md`; `.agent_board/RUN_STATE.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md` | Reword active Git fact surfaces so validation-time HEAD/origin snapshots cannot be mistaken for current post-commit or post-push truth | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY after validation: current Git facts must come from fresh commands, not embedded self-referential SHA fields. |
| CM-1205 | 1205 | done | P6-docs-drift | Green docs/history-memory compression; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `MEMORY.md`; `README.md`; `DOCS_GOVERNANCE.md`; `STATUS.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` | Compress stale `MEMORY.md` current-status snapshot into a historical memory index | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY after validation: current facts remain in STATUS and active board ledgers; MEMORY is only historical index. |
| CM-1204 | 1204 | done | P6-docs-drift | Green docs/backlog compression; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `MAINTENANCE_BACKLOG.md`; `DOCS_GOVERNANCE.md`; `STATUS.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md` | Compress `MAINTENANCE_BACKLOG.md` into a candidate pool and move historical backlog lookup to Git/archive index | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY after validation: active task execution remains in TASK_QUEUE and VALIDATION_LOG; backlog is only candidate pool. |
| CM-1203 | 1203 | done | P6-docs-drift | Green docs/board compression; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `STATUS.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `.agent_board/RUN_STATE.md`; `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md` | Compress largest active status surfaces, retain current summaries, and move old CM/Pxx流水 to Git/archive index lookup | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY: active status files are now small current surfaces. History is still retrievable through Git and the archive index. |
| CM-1202 | 1202 | done | P6-docs-drift | Green docs/board entrypoint alignment; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `DOCS_GOVERNANCE.md`; `PHASE_NAVIGATION.md`; `README.md`; `STATUS.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md` | Start the documentation-surface slimdown by fixing the official route and reducing recovery entrypoints to README, STATUS, next-phase plan, task queue, and validation ledger | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY: first slimdown slice aligned entrypoints only. |
| CM-1207 | 1207 | todo | P6-docs-drift | Green docs-only decision | `.agent_board/DECISIONS.md`; `README.md` if needed | Review whether the long decision ledger needs an index-only active surface, or should remain as a durable decisions table | fresh Git status; docs validation if edited | revert docs by Git | no | Do not start runtime gap closure from this task; skip if decision history is still useful as-is. |
