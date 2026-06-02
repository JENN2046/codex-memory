# RUN_STATE.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts source: `.agent_board/CURRENT_FACTS.json`.

Current task: `CM-1393 Phase G G1.3 governance mutation preview consistency`.
Current validation: `CMV-1511`.
Current status: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
Branch and HEAD values are intentionally not repeated here; read `.agent_board/CURRENT_FACTS.json` and fresh Git output.

<!-- CURRENT-FACTS-ACTIVE-END -->

## Historical Run State Archive

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Last observed HEAD | not pinned in this file after commit/push; run fresh checks below |
| Last observed remote main | not pinned in this file after commit/push; run fresh checks below |
| Current task | CM-1388 Phase G authoritative route entrypoint |
| Current area | P8-memory-governance / P9-codex-claude-client-scope / P10-observability-admin / P6-docs-drift |
| Current route | Phase G -> G1 Memory Governance Runtime Boundary -> CM-1389 governance runtime inventory |
| Current status | `PERSONAL_DOGFOOD_READY_NOT_RC_READY / RC_READY=false` |
| Active entrypoints | `README.md`; `STATUS.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `PHASE_G_MEMORY_GOVERNANCE_RUNTIME_BOUNDARY_PLAN.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/VALIDATION_LOG.md` |
| Historical archive index | `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`; `docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md`; `docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md` |
| Untracked files left untouched | `CLAUDE.md`; `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` |
| Runtime/source touched by current task | local docs/board route authority only; no runtime mutation |
| Provider/API calls by current task | no |
| Real memory tools by current task | none |
| Durable memory/audit writes by current task | no |
| Public MCP expansion by current task | no |
| Push/tag/release/deploy by current task | no |
| Readiness/reliability claim by current task | no |

## Next Safe Action

CM-1393 adds a shared no-apply preview consistency summary for tombstone and supersede runtime-prep plans. Next safe local task is a changed-scope review, then either commit this local batch if requested or continue with a narrow follow-up selected from Phase G. Do not execute memory tools, provider calls, runtime governance actions, durable writes, public MCP expansion, remote actions, release/cutover actions, or broad readiness/reliability claims without separate scope.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
