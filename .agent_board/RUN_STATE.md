# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1219 A5-GAP-6 post-recall-isolation aggregation preflight prepared; execution awaits exact fresh-HEAD approval |
| Current area | P0-mainline-health / P2-active-memory / P8-memory-governance / P10-observability-admin / P6-docs-drift |
| Current route | documentation-surface slimdown completed enough -> A5/P66 runtime gap closure preflight -> personal RC dogfood later |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | no |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1219 prepared the exact A5-GAP-6 aggregation refresh boundary after CM-1218. The selected unit list is `A5-GAP-1,A5-GAP-2,A5-GAP-4,A5-GAP-5`; historical `A5-GAP-3` is background only unless a future exact approval names it. No ValidationAggregator execution, file/store scan, MCP `tools/call`, provider call, durable write, public MCP expansion, remote write, readiness claim, or reliability claim occurred. Next safe action is to commit or otherwise stabilize CM-1219, then use fresh `HEAD` for exact A5-GAP-6 approval before execution.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
