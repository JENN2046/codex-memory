# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1304 true-live recall proof metadata alias fallback validated; local commit pending |
| Current area | P4-http-runtime / P8-memory-governance / P0-mainline-health |
| Current route | documentation-surface slimdown completed enough -> A5/P66 runtime gap closure preflight -> personal RC dogfood later |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | `src/core/TrueLiveRecallExecutorAdapter.js`; `src/core/TrueLiveRecallReadonlyProofRunner.js`; sanitized proof metadata now falls through blank camel-case aliases to later non-empty snake_case/id values |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1304 fixes true-live recall proof sanitized metadata alias fallback so blank camel-case `memoryId`, `createdAt`, and `updatedAt` do not mask snake_case/id fallbacks before sanitized output/hash construction. It does not execute true-live recall, read real memory/store/jsonl, call providers/MCP, change approval profiles, change config/watchdog/startup, expand public MCP, or claim readiness. Targeted true-live recall proof tests passed `31/31`; default `npm test` passed `2827/2827`. Next safe action is docs/ledger validation, changed-scope review, and local commit if validation remains clean.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
