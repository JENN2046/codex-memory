# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1367 post-fix F1 sync and approval packet completed; push approval still required |
| Current area | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health |
| Current route | Phase F1 current-head approval packet -> exact A5-GAP-4 live-client no-write execution -> A5-GAP-6 aggregation refresh -> true-live recall negative-control proof -> minimal personal dogfood write preflight -> closeout |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | docs/board only; no live F1 rerun |
| Provider/API calls by current task | no |
| Real memory tools by current task | no new live memory tool calls; local tests only |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1367 records the exact normal non-force push approval template for syncing `main@c6804d676105f8051a329e46bd031847ef2aaa08` to `origin/main`, plus the post-push exact A5-GAP-4 F1 live no-write approval template. F1 remains blocked until explicit push approval is provided, the push succeeds, fresh synced HEAD is verified, and exact A5-GAP-4 approval is provided. Do not proceed to F2/F3/F4/F5 until accepted F1 live evidence exists.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
