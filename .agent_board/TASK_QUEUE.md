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
| CM-1203 | 1203 | done | P6-docs-drift | Green docs/board compression; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `STATUS.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `.agent_board/RUN_STATE.md`; `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md` | Compress largest active status surfaces, retain current summaries, and move old CM/Pxx流水 to Git/archive index lookup | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY: active status files are now small current surfaces. History is still retrievable through Git and the archive index. |
| CM-1202 | 1202 | done | P6-docs-drift | Green docs/board entrypoint alignment; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `DOCS_GOVERNANCE.md`; `PHASE_NAVIGATION.md`; `README.md`; `STATUS.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md` | Start the documentation-surface slimdown by fixing the official route and reducing recovery entrypoints to README, STATUS, next-phase plan, task queue, and validation ledger | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY: first slimdown slice aligned entrypoints only. |
| CM-1204 | 1204 | todo | P6-docs-drift | Green docs-only decision | `STATUS.md`; `.agent_board/*`; `DOCS_GOVERNANCE.md` if needed | Decide whether to commit CM-1202/CM-1203, then continue with any remaining docs-surface cleanup before runtime gap closure | fresh Git status; docs validation if edited | revert docs by Git | no | Do not start runtime gap closure from this task. |
