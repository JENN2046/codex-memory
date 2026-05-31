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
| CM-1208 | 1208 | blocked | P0-mainline-health / P6-docs-drift | A5 approval-required runtime gate preflight; docs-marker repair only after failed gate | `docs/P66_A5_RUNTIME_GAP_CLOSURE_APPROVAL_PACKET.md`; `docs/CM1207_RUNTIME_GAP_CLOSURE_SCOPE_PREFLIGHT.md`; `.agent_board/AUTOPILOT_LEDGER.md` | A5-GAP-5 cutover-context strict gate was approved for `main@f81c6fa13ee4466115b8c2cabb88a5e5a6c794ce`; the gate failed in test stage because CM-1203 compressed away the parseable Red Lane list marker | exact user approval line; fresh Git preflight; `npm run gate:mainline:strict`; `npm test` diagnostic; `node --test .\tests\autopilot-closed-loop-dry-run-cli.test.js`; docs validation | no remote write; no config/watchdog/startup/provider/real-memory/durable-write action; restore marker by Git if needed | yes, explicit A5 for any strict-gate rerun | BLOCKED_NOT_READY: local marker repair restores `blocked_red_count`, but A5 strict gate was not rerun as commit-bound evidence; commit the docs-marker repair or otherwise establish a new `HEAD`, then request a fresh exact A5 approval before rerun. |
| CM-1207 | 1207 | done | P6-docs-drift / P0-mainline-health | Green docs-only scope preflight; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `STATUS.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `docs/CM1207_RUNTIME_GAP_CLOSURE_SCOPE_PREFLIGHT.md` | Review `DECISIONS.md` and prepare runtime gap closure scope preflight without executing A5 work | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY after validation: `DECISIONS.md` remains durable decision ledger; next runtime action requires exact A5 approval. |
| CM-1206 | 1206 | done | P6-docs-drift | Green docs/status wording; user-authorized push sync; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `STATUS.md`; `.agent_board/RUN_STATE.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md` | Reword active Git fact surfaces so validation-time HEAD/origin snapshots cannot be mistaken for current post-commit or post-push truth | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY after validation: current Git facts must come from fresh commands, not embedded self-referential SHA fields. |
| CM-1205 | 1205 | done | P6-docs-drift | Green docs/history-memory compression; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `MEMORY.md`; `README.md`; `DOCS_GOVERNANCE.md`; `STATUS.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` | Compress stale `MEMORY.md` current-status snapshot into a historical memory index | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY after validation: current facts remain in STATUS and active board ledgers; MEMORY is only historical index. |
| CM-1204 | 1204 | done | P6-docs-drift | Green docs/backlog compression; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `MAINTENANCE_BACKLOG.md`; `DOCS_GOVERNANCE.md`; `STATUS.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md` | Compress `MAINTENANCE_BACKLOG.md` into a candidate pool and move historical backlog lookup to Git/archive index | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY after validation: active task execution remains in TASK_QUEUE and VALIDATION_LOG; backlog is only candidate pool. |
| CM-1203 | 1203 | done | P6-docs-drift | Green docs/board compression; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `STATUS.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `.agent_board/RUN_STATE.md`; `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md` | Compress largest active status surfaces, retain current summaries, and move old CM/Pxx流水 to Git/archive index lookup | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY: active status files are now small current surfaces. History is still retrievable through Git and the archive index. |
| CM-1202 | 1202 | done | P6-docs-drift | Green docs/board entrypoint alignment; no source/runtime/test/package/config/env/provider/real-memory action; no readiness/reliability claim | `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `DOCS_GOVERNANCE.md`; `PHASE_NAVIGATION.md`; `README.md`; `STATUS.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/RUN_STATE.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/AUTOPILOT_LEDGER.md` | Start the documentation-surface slimdown by fixing the official route and reducing recovery entrypoints to README, STATUS, next-phase plan, task queue, and validation ledger | `git status --short --branch`; `git diff --stat`; `git diff --check`; docs validation via `scripts/validate-local.ps1 -Area docs`; changed-scope review | revert docs/board changes by Git; no runtime state changed | no | COMPLETED_VALIDATED_NOT_READY: first slimdown slice aligned entrypoints only. |
