# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1273 policy preflight fixture baseline ownerless private validated |
| Current area | P9-codex-claude-client-scope / P8-memory-governance / P0-mainline-health |
| Current route | documentation-surface slimdown completed enough -> A5/P66 runtime gap closure preflight -> personal RC dogfood later |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | none; `tests/policy-read-preflight.test.js` fixture baseline aligned with CM-1272 ownerless-private counts |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1273 aligns the `tests/policy-read-preflight.test.js` CI-safe fixture baseline with CM-1272 `gate:ci` policy preflight evidence: 9 fixture records, 4 kept records, and separate private visibility / cross-client private / ownerless private filtered counts. It does not change runtime source behavior, call providers/MCP, scan real memory, write durable memory/audit, change config/watchdog/startup, or claim readiness. Next safe action after this local stage is another local-safe Codex/Claude client isolation or runtime-governance source/test slice, or a fresh exact approval path for A5/Red-lane evidence.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
