# Current State

This is the short human-readable current state entrypoint for `codex-memory`.

Live branch, `HEAD`, `origin/main`, ahead/behind, and dirty-worktree facts are not committed here. Collect them with fresh Git commands before branch-sensitive, runtime-sensitive, remote, or approval-bound work.

## Snapshot

| Field | Value |
|---|---|
| Status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Current task | `CM-1425 search_memory negative-control precision / no-result policy patch` |
| Current validation | `CMV-1538` |
| Current route | Phase H authenticated HTTP `search_memory` high-entropy negative-control now enters proofNoResultMode locally; no live rerun |
| Machine snapshot | `.agent_board/CURRENT_FACTS.json` |
| Intake contract | `docs/CONTEXT_INTAKE_CONTRACT.md` |
| Archive index | `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md` |

## Last Accepted Evidence

`CM-1425` implemented a source-side no-result precision policy for authenticated HTTP high-entropy negative-control `search_memory` calls. The CM-1422 NC1/NC2 family previously returned `resultCount=1` because ordinary recall admits any positive vector/hash score into the candidate pool and then returns the top candidate for `limit=1`; the authenticated bounded path had no precision policy. The patch detects high-entropy nonce-style negative-control queries under the exact bounded public HTTP shape and passes `proofNoResultMode` into the existing precision policy, while leaving ordinary authenticated bounded search behavior unchanged.

Latest local validation before CM-1420:

- `npm test` passed `2992/2992`.
- `npm run gate:mainline` passed health, compare `43/43`, and rollback `43/43`.

These are local validation facts only. They are not `RC_READY`, release readiness, cutover readiness, provider readiness, or broad memory reliability.

## Next Safe Action

After this patch is committed, pushed, and the runtime is refreshed, CM-1422 rerun can be considered with fresh exact approval. Do not rerun it from the dirty local worktree.

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
