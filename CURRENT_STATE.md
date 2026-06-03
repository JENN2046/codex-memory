# Current State

This is the short human-readable current state entrypoint for `codex-memory`.

Live branch, `HEAD`, `origin/main`, ahead/behind, and dirty-worktree facts are not committed here. Collect them with fresh Git commands before branch-sensitive, runtime-sensitive, remote, or approval-bound work.

## Snapshot

| Field | Value |
|---|---|
| Status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Current task | `CM-1420 context intake and status-surface compaction` |
| Current validation | `CMV-1534` |
| Current route | Phase H state/context governance before bounded `search_memory` negative-control |
| Machine snapshot | `.agent_board/CURRENT_FACTS.json` |
| Intake contract | `docs/CONTEXT_INTAKE_CONTRACT.md` |
| Archive index | `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md` |

## Last Accepted Evidence

`CM-1418` recorded docs-only closeout for the already executed Phase H runtime refresh plus bounded `memory_overview` live no-mutation gate. It did not run a new probe, memory tool call, provider/API call, raw store scan, config/watchdog/startup change, public MCP expansion, remote action, or readiness claim.

Latest local validation before CM-1420:

- `npm test` passed `2992/2992`.
- `npm run gate:mainline` passed health, compare `43/43`, and rollback `43/43`.

These are local validation facts only. They are not `RC_READY`, release readiness, cutover readiness, provider readiness, or broad memory reliability.

## Next Safe Action

`CM-1420` docs/board context-governance compaction is complete locally. The next planned Phase H runtime task remains `CM-1419 search_memory negative-control`, but it requires exact bounded readonly scope and fresh Git/runtime preflight.

## Boundaries

Do not execute without separate exact approval or a valid bounded Amber receipt:

- push, PR, tag, release, deploy, cutover
- `record_memory` or live `search_memory`
- bearer-token use
- provider/API calls
- broad real memory scan/export/import/migration
- raw audit, raw `.jsonl`, raw SQLite, vector, or candidate-cache output
- config/watchdog/startup changes
- public MCP tool or schema expansion
- readiness, reliability, release, cutover, or `RC_READY` claims
