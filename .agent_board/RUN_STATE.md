# RUN_STATE.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts source: `.agent_board/CURRENT_FACTS.json`.

Current task: `CM-1400 Phase H client-scope private read consistency source/test`.
Current validation: `CMV-1518`.
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

RC-1 current-head local baseline is recorded in `.agent_board/CHECKPOINT.md` for target commit `fe39bdc8e95fa34084ac179e3da2113e0ac7c538`: `npm test` passed, and `npm run gate:mainline` passed after local HTTP MCP was started with `npm run start:http:ensure`.

RC-2 A5-GAP-5 strict gate evidence is recorded at `docs/RC2_A5_GAP5_STRICT_GATE_PREFLIGHT.md` for target commit `9cb7df9b0aafc5951e8650f07633a4711cef7c55`: `npm run gate:mainline:strict` passed with health ok, contract `31/31`, test `2926/2926`, compare `43/43`, and rollback `43/43`.

RC-3 live HTTP / MCP no-write preflight is prepared at `docs/RC3_A5_GAP4_LIVE_HTTP_NO_WRITE_PREFLIGHT.md`: local `/health` is reachable, but health does not expose a commit/build hash, so runtime commit freshness is not proven by health alone.

Next safe action is either review/commit the RC-3 preflight packet, or provide a fresh A5-GAP-4 exact approval line after the packet is stabilized. Do not execute MCP initialize/tools-list, bearer-token use, memory tools, provider calls, real memory/store scans, durable writes, public MCP expansion, remote actions, release/cutover actions, or broad readiness/reliability claims without separate exact scope.

## Required Fresh Checks Before Any Branch-Sensitive Action

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

Repository reality overrides this file.
