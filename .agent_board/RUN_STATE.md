# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1377 Phase F1 live no-write evidence accepted; F2 requires exact A5-GAP-6 approval |
| Current area | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health |
| Current route | Phase F1 current-head approval packet -> exact A5-GAP-4 live-client no-write execution -> A5-GAP-6 aggregation refresh -> true-live recall negative-control proof -> minimal personal dogfood write preflight -> closeout |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | exact-approved live no-write harness only; no service restart or runtime mutation |
| Provider/API calls by current task | no |
| Real memory tools by current task | none |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1377 accepted F1 live-client no-write evidence at synced `main@bbb9f2a5104cf0d0f3a0e9447ac5faaf7edd6182`. Next safe action is local docs/ledger validation and guarded evidence commit. After that, F2 requires a separate exact A5-GAP-6 aggregation approval using sanitized approved evidence only. Do not proceed to F3/F4/F5 until F2 evidence is accepted.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
