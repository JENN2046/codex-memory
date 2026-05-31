# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1287 lifecycle runtime-prep projection fallback normalization validated |
| Current area | P5-rollback-readiness / P8-memory-governance / P0-mainline-health |
| Current route | documentation-surface slimdown completed enough -> A5/P66 runtime gap closure preflight -> personal RC dogfood later |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | `src/core/DurableGovernanceTombstoneRuntimePrepHelper.js`; `src/core/MemorySupersedeRuntimePrepHelper.js`; lifecycle runtime-prep projection records now preserve full records while using first non-empty normalized camel/snake values and are passed downstream |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1287 fixes tombstone/supersede runtime-prep projection fallback normalization so blank camel-case projection memory id, lifecycle status, client id, visibility, and lifecycle update time fields do not mask snake_case fallbacks, and normalized records are passed to downstream preview checks. It does not execute runtime apply, call providers/MCP, scan real memory, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, or claim readiness. Next safe action after this local stage is another local-safe Codex/Claude client isolation or runtime-governance source/test slice, or a fresh exact approval path for A5/Red-lane evidence.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
