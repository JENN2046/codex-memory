# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1210 A5-GAP-4 HTTP evidence refresh partial; authenticated MCP evidence blocked |
| Current area | P4-http-runtime / P6-docs-drift |
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

CM-1210 executed the approved A5-GAP-4 endpoint-bound HTTP refresh at `main@db5a4d66cf472d35e80b12d512816cda5de09220`. `/health` and `observe:http` passed for `http://127.0.0.1:7605`; observe reported HTTP log error `0`, watchdog recovery `0`, governance `ok`, `noProvider=true`, `mutated=false`, and `migrationApplied=false`. Unauthenticated MCP `initialize` and `tools/list` returned Unauthorized because auth is required; no token material was read, printed, persisted, or used. Next safe action is either record/commit this partial evidence or request a separate exact approval for authenticated MCP initialize/tools-list using an already-present current-session bearer token without printing or persisting token material.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
