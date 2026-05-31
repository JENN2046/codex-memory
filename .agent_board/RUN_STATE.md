# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1252 schema gate dry-run policy invariant implemented and targeted-validated |
| Current area | P0-mainline-health / P4-http-runtime / P5-rollback-readiness |
| Current route | documentation-surface slimdown completed enough -> A5/P66 runtime gap closure preflight -> personal RC dogfood later |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | `src/core/MemoryWriteReconcileStartupSafetyPolicy.js` dry-run harness policy acceptance invariant only |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1252 propagates the schema-gated prior-preflight invariant into downstream dry-run harness policy acceptance: `buildGuardedStartupRecoveryPolicyDesign(...)` now records `policyDesign.priorPreflightSchemaGateAccepted`, and `hasAcceptedGuardedStartupRecoveryPolicyDesign(...)` requires it before `buildTempLocalStartupRecoveryDryRunHarness(...)` can accept the policy design. It does not execute dry-run, recovery/apply, install startup/watchdog, change config, run HTTP MCP, apply migration/import/export/backup/restore, or claim readiness. Next safe action is final docs/ledger/diff validation, then commit or otherwise stabilize CM-1252.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
