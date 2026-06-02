# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1381 Phase F3 evidence accepted; F4 requires exact minimal dogfood write approval |
| Current area | P0-mainline-health / P8-memory-governance / P9-codex-claude-client-scope |
| Current route | Phase F1 current-head approval packet -> exact A5-GAP-4 live-client no-write execution -> A5-GAP-6 aggregation refresh -> true-live recall negative-control proof -> minimal personal dogfood write preflight -> closeout |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | local snapshot CLI/test and docs/board only; no runtime mutation |
| Provider/API calls by current task | no |
| Real memory tools by current task | none |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1381 completed the exact-approved F3 true-live recall negative-control proof on clean synced `main@4bbd27892d07159ebb9397701985e31507126a74`. Next safe action is local validation/guarded commit, then sync if approved. F4 minimal personal dogfood write still requires separate exact approval and must not execute until the CM-1381 evidence commit is stable.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
