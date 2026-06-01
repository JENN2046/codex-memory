# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1310 knowledge-base sync memory-id alias fallback completed/validated; commit state must be checked from fresh Git |
| Current area | P10-observability-admin / P8-memory-governance / P0-mainline-health |
| Current route | documentation-surface slimdown completed enough -> A5/P66 runtime gap closure preflight -> personal RC dogfood later |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | `src/recall/KnowledgeBaseSyncService.js`; knowledge-base sync now falls through blank `memoryId` to `memory_id` before shadow write, sync token, governance entries, and cache invalidation |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1310 fixes knowledge-base sync record id fallback so blank `memoryId` does not mask effective `memory_id` before shadow write, reconcile clear, prune protection, chunk/manifest checks, sync token, default governance entries, and candidate-cache invalidation. It does not execute live write/recall, read real memory/store/jsonl, call providers/MCP, change config/watchdog/startup, expand public MCP, or claim readiness. Targeted recall/sync tests passed `60/60`; default `npm test` passed `2836/2836`. Next safe action is to verify fresh Git state; if CM-1310 is already committed, continue to the next runtime gap, otherwise commit the validated scope.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
