# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1313 SQLite shadow memory-id input normalization completed/validated; commit state must be checked from fresh Git |
| Current area | P10-observability-admin / P8-memory-governance / P0-mainline-health |
| Current route | documentation-surface slimdown completed enough -> A5/P66 runtime gap closure preflight -> personal RC dogfood later |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | `src/storage/SqliteShadowStore.js`; batch memory-id lookup inputs now trim/drop blank/null/dedupe before record/scope/policy/isolation/lifecycle queries |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1313 fixes SQLite shadow-store batch memory-id input normalization so whitespace-padded, duplicate, blank, or null ids do not cause record/scope/policy/isolation/lifecycle lookup misses. It does not execute live write/recall, read real memory/store/jsonl, call providers/MCP, change config/watchdog/startup, expand public MCP, or claim readiness. Targeted governance/policy/lifecycle/recall tests passed `55/55`; default `npm test` passed `2839/2839`. Next safe action is to verify fresh Git state; if CM-1313 is already committed, continue to the next runtime gap, otherwise commit the validated scope.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
