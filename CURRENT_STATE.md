# Current State

This is the short human-readable current state entrypoint for `codex-memory`.

Live branch, `HEAD`, `origin/main`, ahead/behind, and dirty-worktree facts are not committed here. Collect them with fresh Git commands before branch-sensitive, runtime-sensitive, remote, or approval-bound work.

## Snapshot

| Field | Value |
|---|---|
| Status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Current task | `CM-1421 Phase H search_memory negative-control scope packet for CM-1419` |
| Current validation | `CMV-1535` |
| Current route | Phase H bounded `search_memory` negative-control exact scope prepared, not executed |
| Machine snapshot | `.agent_board/CURRENT_FACTS.json` |
| Intake contract | `docs/CONTEXT_INTAKE_CONTRACT.md` |
| Archive index | `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md` |

## Last Accepted Evidence

`CM-1421` prepared the exact future scope for the `CM-1419 Phase H search_memory negative-control` thread: two bounded readonly public HTTP MCP `search_memory` negative-control calls. It did not execute `search_memory`, use bearer token material, call providers, read raw stores, write durable state, change config/watchdog/startup, expand public MCP, or claim readiness.

Latest local validation before CM-1420:

- `npm test` passed `2992/2992`.
- `npm run gate:mainline` passed health, compare `43/43`, and rollback `43/43`.

These are local validation facts only. They are not `RC_READY`, release readiness, cutover readiness, provider readiness, or broad memory reliability.

## Next Safe Action

If the operator wants execution, use `docs/CM1419_PHASE_H_SEARCH_MEMORY_NEGATIVE_CONTROL_SCOPE_PACKET.md` to provide the exact approval line after the packet is committed and synced. Otherwise continue only local docs/source/test work.

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
