# Current State

This is the short human-readable current state entrypoint for `codex-memory`.

Live branch, `HEAD`, `origin/main`, ahead/behind, and dirty-worktree facts are not committed here. Collect them with fresh Git commands before branch-sensitive, runtime-sensitive, remote, or approval-bound work.

## Snapshot

| Field | Value |
|---|---|
| Status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Current task | `CM-1426 Phase H bounded search_memory negative-control evidence closeout` |
| Current validation | `CMV-1539` |
| Current route | Phase H authenticated HTTP `search_memory` negative-control passed with bounded sanitized no-result evidence |
| Machine snapshot | `.agent_board/CURRENT_FACTS.json` |
| Intake contract | `docs/CONTEXT_INTAKE_CONTRACT.md` |
| Archive index | `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md` |

## Last Accepted Evidence

`CM-1426` records the already executed CM-1422 Phase H bounded `search_memory` live read-only negative-control evidence. Fresh prerequisites were `main == origin/main == b7e20cc`, worktree clean, listener PID `4296`, runtime freshness accepted, and public tools unchanged as `memory_overview`, `record_memory`, `search_memory`. NC1 `xqzv-9137-lomdra-kepv-azmuth` and NC2 `nareth-48291-pluvox-darnel-kiv` both used `target=both`, `limit=1`, `include_content=false`, `access.mode=authenticated_bounded_search`, and both returned `resultCount=0`. Forbidden key paths were `0`; `rawContentReturned=false`, `pathsReturned=false`, and `memoryIdsReturned=false`.

Side-effect evidence for the CM-1422 execution: no `record_memory`, no `memory_overview`, no provider/API call, no raw store scan, no durable write observed, no public MCP expansion, and no readiness or `RC_READY` claim.

Latest local validation before CM-1420:

- `npm test` passed `2992/2992`.
- `npm run gate:mainline` passed health, compare `43/43`, and rollback `43/43`.

These are local validation facts only. They are not `RC_READY`, release readiness, cutover readiness, provider readiness, or broad memory reliability.

## Next Safe Action

CM-1426 is a docs-only closeout. Do not rerun live `search_memory` from this closeout task. Any further live client, write, provider, or readiness work requires a separate exact approval.

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
