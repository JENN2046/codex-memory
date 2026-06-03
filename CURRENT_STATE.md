# Current State

This is the short human-readable current state entrypoint for `codex-memory`.

Live branch, `HEAD`, `origin/main`, ahead/behind, and dirty-worktree facts are not committed here. Collect them with fresh Git commands before branch-sensitive, runtime-sensitive, remote, or approval-bound work.

## Snapshot

| Field | Value |
|---|---|
| Status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Current task | `CM-1431 scoped record_memory write proof scope packet` |
| Current validation | `CMV-1543` |
| Current route | Phase H scoped `record_memory` write proof packet prepared; no live write |
| Machine snapshot | `.agent_board/CURRENT_FACTS.json` |
| Intake contract | `docs/CONTEXT_INTAKE_CONTRACT.md` |
| Archive index | `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md` |

## Last Accepted Evidence

`CM-1426` records the already executed CM-1422 Phase H bounded `search_memory` live read-only negative-control evidence. Fresh prerequisites were `main == origin/main == b7e20cc`, worktree clean, listener PID `4296`, runtime freshness accepted, and public tools unchanged as `memory_overview`, `record_memory`, `search_memory`. NC1 `xqzv-9137-lomdra-kepv-azmuth` and NC2 `nareth-48291-pluvox-darnel-kiv` both used `target=both`, `limit=1`, `include_content=false`, `access.mode=authenticated_bounded_search`, and both returned `resultCount=0`. Forbidden key paths were `0`; `rawContentReturned=false`, `pathsReturned=false`, and `memoryIdsReturned=false`.

Side-effect evidence for the CM-1422 execution: no `record_memory`, no `memory_overview`, no provider/API call, no raw store scan, no durable write observed, no public MCP expansion, and no readiness or `RC_READY` claim.

`CM-1427` prepares `docs/CM1427_BOUNDED_POSITIVE_SEARCH_MEMORY_SHAPE_SCOPE_PACKET.md` for a future `CM-1428` bounded positive `search_memory` shape gate. The packet is docs-only and does not execute live `search_memory`, use bearer token, read real memory, or scan raw stores. Future CM-1428 is limited to exactly one authenticated public HTTP MCP `search_memory` call with query `Phase H bounded search_memory negative-control evidence`, `target=both`, `limit=1`, `include_content=false`, expected `resultCount>=1`, forbidden key paths `0`, and no raw/id/path/title/snippet leakage.

`CM-1429` investigates the CM-1428 `memoryIdsReturned=true` fail-closed receipt without rerunning live search or reading raw memory. Source review shows `projectAuthenticatedBoundedSearchResponse(...)` sets `access.memoryIdsReturned=false` and strips result `memoryId` fields in bounded projection. The likely root cause is evidence collector false positive: the ad hoc CM-1428 collector inferred `memoryIdsReturned=true` from the safe key path `structuredContent.access.memoryIdsReturned` instead of checking that access flag's boolean value or actual result item fields. Added `inspectBoundedSearchEvidenceShape(...)` synthetic tests to distinguish safe access flag keys from true access-flag or result-item leakage.

`CM-1430` records the already executed CM-1428 bounded positive `search_memory` shape gate pass evidence. Fresh prerequisites were `main == origin/main == 75cd937e7bdc607dc1b7df561a15aef9c36314db`, worktree clean, listener PID `15112`, runtime freshness accepted, and public tools unchanged as `memory_overview`, `record_memory`, `search_memory`. Exactly one authenticated `search_memory` call executed with query `Phase H bounded search_memory negative-control evidence`, `target=both`, `limit=1`, `include_content=false`, and `access.mode=authenticated_bounded_search`. The sanitized result was `resultCount=1`, `resultsLength=1`, forbidden key paths `0`, `rawContentReturned=false`, `pathsReturned=false`, `memoryIdsReturned=false`, `titlesReturned=false`, `snippetsReturned=false`, and `wrapperContentIgnored=true`. Bounded result shape keys were only `baseScore`, `contentHitCount`, `dynamicCoreWeight`, `evidenceHitCount`, `exactCoreTagCount`, `rerankScore`, `score`, `sourceKinds`, `tagHitCount`, `tagMemoSurfaceScore`, `target`, and `titleHitCount`.

Side-effect evidence for the CM-1428 execution: no `record_memory`, no `memory_overview`, no provider/API call, no raw store scan, no durable write, no public MCP expansion, and no readiness or `RC_READY` claim.

`CM-1431` prepares `docs/CM1431_SCOPED_RECORD_MEMORY_WRITE_PROOF_SCOPE_PACKET.md` for a future `CM-1432` scoped `record_memory` write proof. The packet is docs-only and does not execute `record_memory`, `search_memory`, `memory_overview`, bearer-token use, provider/API calls, runtime refresh, real memory read/write, raw store scans, public MCP expansion, remote action, readiness claim, or `RC_READY` claim. Future CM-1432 is limited to exactly one authenticated public HTTP MCP `record_memory` call with `target=process`, synthetic governance-safe marker content only, required scope fields `project_id`, `client_id`, `visibility`, `task_id`, and `retention_policy`, payload SHA-256 `015df43d6ca44197da9a3811a02c39c1696f1d27661a399c6ecc421ba9a757fb`, and no follow-up search unless separately authorized.

Latest local validation before CM-1420:

- `npm test` passed `2992/2992`.
- `npm run gate:mainline` passed health, compare `43/43`, and rollback `43/43`.

These are local validation facts only. They are not `RC_READY`, release readiness, cutover readiness, provider readiness, or broad memory reliability.

## Next Safe Action

CM-1431 is a docs-only scope packet. Commit/push only when explicitly authorized. After the CM-1431 packet is committed and pushed, CM-1432 still requires runtime refresh and a fresh exact one-write approval before any `record_memory` call.

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
