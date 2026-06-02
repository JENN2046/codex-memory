# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1379 Phase F2 aggregation accepted; F3 requires exact true-live recall approval |
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

CM-1379 completed the exact-approved F2 A5-GAP-6 aggregation refresh using only approved A5-GAP-1..5 evidence plus CM-1377 F1 evidence. Next safe action is local validation/guarded commit, then sync if approved. F3 execution still requires separate exact true-live recall negative-control approval for the current synced commit. Do not proceed to F4/F5 until F3 evidence is accepted.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
