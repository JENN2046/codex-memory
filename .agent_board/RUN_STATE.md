# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1373 Phase F1 live no-write rerun executed and rejected fail-closed; F1 still blocked |
| Current area | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health |
| Current route | Phase F1 current-head approval packet -> exact A5-GAP-4 live-client no-write execution -> A5-GAP-6 aggregation refresh -> true-live recall negative-control proof -> minimal personal dogfood write preflight -> closeout |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | no source/runtime edit; exact-approved bounded live no-write harness executed against existing endpoint |
| Provider/API calls by current task | no |
| Real memory tools by current task | bounded HTTP JSON-RPC only: authenticated `memory_overview`, no-token `memory_overview`, no-token `record_memory/search_memory` rejection checks |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1373 consumed exact A5-GAP-4 approval on clean synced `main@dd5018dfbc564975e0e6a93aebdeba38821760a0` and executed the bounded live no-write harness. Evidence was rejected fail-closed because no-token `memory_overview` did not return selected projection and no-token `record_memory/search_memory` rejections did not expose expected reason codes. Do not proceed to F2/F3/F4/F5 until accepted F1 live evidence exists.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
