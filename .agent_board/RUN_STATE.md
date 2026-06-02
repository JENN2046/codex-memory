# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1355 Phase F1 no-write evidence harness completed/validated; live-client execution still requires exact A5-GAP-4 approval |
| Current area | P8-memory-governance / P0-mainline-health |
| Current route | Phase F1 current-head approval packet -> exact A5-GAP-4 live-client no-write execution -> A5-GAP-6 aggregation refresh -> true-live recall negative-control proof -> minimal personal dogfood preflight |
| Current status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | `src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js`; `src/cli/phase-f1-live-client-no-write.js`; plan-only/injected-test harness only, no live runtime behavior executed |
| Provider/API calls by current task | no |
| Real memory tools by current task | no |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1355 added a Phase F1 no-write evidence harness. No live client action ran. The plan-only CLI accepts the current exact `A5-GAP-4 live-client no-write contract refresh` line and returns `PHASE_F1_LIVE_CLIENT_NO_WRITE_PLAN_READY_NOT_EXECUTED`; `--execute` still requires exact approval, fresh clean synced current facts, and an already-present bearer token. Next safe action is to request exact A5-GAP-4 live-client no-write approval before executing any live-client calls. Before any live recall proof, dogfood write, strict gate refresh, or RC work, require the separate exact boundary for that action.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
