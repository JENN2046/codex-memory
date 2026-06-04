# Current State

This is the short human-readable current state entrypoint for `codex-memory`.

Live branch, `HEAD`, `origin/main`, ahead/behind, and dirty-worktree facts are not committed here. Collect them with fresh Git commands before branch-sensitive, runtime-sensitive, remote, or approval-bound work.

## Snapshot

| Field | Value |
|---|---|
| Status | `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` |
| Current task | `CM-1441 Phase H governance scope suppression consistency source/test` |
| Current validation | `CMV-1551` |
| Current route | Governance scope suppression consistency source/test completed; future live gates remain exact-approval boundaries |
| Machine snapshot | `.agent_board/CURRENT_FACTS.json` |
| Intake contract | `docs/CONTEXT_INTAKE_CONTRACT.md` |
| Archive index | `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md` |

## Last Accepted Evidence

`CM-1441` adds `src/core/GovernanceScopeSuppressionConsistency.js` and `tests/governance-scope-suppression-consistency.test.js` as an explicit-input/no-apply consistency surface that combines deferred governance scope-pollution policy with lifecycle read-policy isolation. Targeted validation passed `13/13` across the new test and related existing governance suppression tests. It does not execute runtime, memory tools, bearer-token paths, provider/API calls, true memory reads/writes, raw store scans, durable writes, config/watchdog/startup changes, public MCP expansion, remote actions, readiness claims, or `RC_READY` claims.

`CM-1440` selects the next local-safe Phase H candidate after `CM-1439`: `CM-1441 Phase H governance scope suppression consistency source/test`. The selection is docs/board routing only and is recorded in `docs/CM1440_PHASE_H_NEXT_LOCAL_SAFE_SLICE_SELECTION.md`. It does not execute runtime, memory tools, bearer-token paths, provider/API calls, true memory reads/writes, raw store scans, durable writes, config/watchdog/startup changes, public MCP expansion, remote actions, readiness claims, or `RC_READY` claims.

`CM-1439` records the post-fast-forward local health validation after syncing local `main` to `origin/main` at short head `f0bcdf5`. Fresh Git status showed local `main` synced with `origin/main` and a clean worktree. `npm test` passed `3005/3005` with `0` failures, and post-test Git status/diff checks remained clean.

Side-effect evidence for CM-1439: no source/runtime change, no live `search_memory`, no `record_memory`, no `memory_overview`, no bearer-token use, no provider/API call, no true memory read/write, no raw store scan, no config/watchdog/startup change, no public MCP expansion, no remote action, no readiness claim, and no `RC_READY` claim.

`CM-1426` records the already executed CM-1422 Phase H bounded `search_memory` live read-only negative-control evidence. Fresh prerequisites were `main == origin/main == b7e20cc`, worktree clean, listener PID `4296`, runtime freshness accepted, and public tools unchanged as `memory_overview`, `record_memory`, `search_memory`. NC1 `xqzv-9137-lomdra-kepv-azmuth` and NC2 `nareth-48291-pluvox-darnel-kiv` both used `target=both`, `limit=1`, `include_content=false`, `access.mode=authenticated_bounded_search`, and both returned `resultCount=0`. Forbidden key paths were `0`; `rawContentReturned=false`, `pathsReturned=false`, and `memoryIdsReturned=false`.

Side-effect evidence for the CM-1422 execution: no `record_memory`, no `memory_overview`, no provider/API call, no raw store scan, no durable write observed, no public MCP expansion, and no readiness or `RC_READY` claim.

`CM-1427` prepares `docs/CM1427_BOUNDED_POSITIVE_SEARCH_MEMORY_SHAPE_SCOPE_PACKET.md` for a future `CM-1428` bounded positive `search_memory` shape gate. The packet is docs-only and does not execute live `search_memory`, use bearer token, read real memory, or scan raw stores. Future CM-1428 is limited to exactly one authenticated public HTTP MCP `search_memory` call with query `Phase H bounded search_memory negative-control evidence`, `target=both`, `limit=1`, `include_content=false`, expected `resultCount>=1`, forbidden key paths `0`, and no raw/id/path/title/snippet leakage.

`CM-1429` investigates the CM-1428 `memoryIdsReturned=true` fail-closed receipt without rerunning live search or reading raw memory. Source review shows `projectAuthenticatedBoundedSearchResponse(...)` sets `access.memoryIdsReturned=false` and strips result `memoryId` fields in bounded projection. The likely root cause is evidence collector false positive: the ad hoc CM-1428 collector inferred `memoryIdsReturned=true` from the safe key path `structuredContent.access.memoryIdsReturned` instead of checking that access flag's boolean value or actual result item fields. Added `inspectBoundedSearchEvidenceShape(...)` synthetic tests to distinguish safe access flag keys from true access-flag or result-item leakage.

`CM-1430` records the already executed CM-1428 bounded positive `search_memory` shape gate pass evidence. Fresh prerequisites were `main == origin/main == 75cd937e7bdc607dc1b7df561a15aef9c36314db`, worktree clean, listener PID `15112`, runtime freshness accepted, and public tools unchanged as `memory_overview`, `record_memory`, `search_memory`. Exactly one authenticated `search_memory` call executed with query `Phase H bounded search_memory negative-control evidence`, `target=both`, `limit=1`, `include_content=false`, and `access.mode=authenticated_bounded_search`. The sanitized result was `resultCount=1`, `resultsLength=1`, forbidden key paths `0`, `rawContentReturned=false`, `pathsReturned=false`, `memoryIdsReturned=false`, `titlesReturned=false`, `snippetsReturned=false`, and `wrapperContentIgnored=true`. Bounded result shape keys were only `baseScore`, `contentHitCount`, `dynamicCoreWeight`, `evidenceHitCount`, `exactCoreTagCount`, `rerankScore`, `score`, `sourceKinds`, `tagHitCount`, `tagMemoSurfaceScore`, `target`, and `titleHitCount`.

Side-effect evidence for the CM-1428 execution: no `record_memory`, no `memory_overview`, no provider/API call, no raw store scan, no durable write, no public MCP expansion, and no readiness or `RC_READY` claim.

`CM-1431` prepares `docs/CM1431_SCOPED_RECORD_MEMORY_WRITE_PROOF_SCOPE_PACKET.md` for a future `CM-1432` scoped `record_memory` write proof. The packet is docs-only and does not execute `record_memory`, `search_memory`, `memory_overview`, bearer-token use, provider/API calls, runtime refresh, real memory read/write, raw store scans, public MCP expansion, remote action, readiness claim, or `RC_READY` claim. Future CM-1432 is limited to exactly one authenticated public HTTP MCP `record_memory` call with `target=process`, synthetic governance-safe marker content only, required scope fields `project_id`, `client_id`, `visibility`, `task_id`, and `retention_policy`, payload SHA-256 `015df43d6ca44197da9a3811a02c39c1696f1d27661a399c6ecc421ba9a757fb`, and no follow-up search unless separately authorized.

`CM-1433` investigates the CM-1432 single live `record_memory` rejection without rerunning live `record_memory`, using bearer token, reading true memory, scanning raw stores, or printing/persisting the raw CM-1432 response. Source and temp/synthetic test evidence show the exact CM-1431 payload passes public `record_memory` schema / `ToolArgumentValidator` and includes required scope fields, but fails `MemoryWriteService` process-target semantic validation at `validateProcessEntry(title, content)`: process memory must include a `checkpoint`, `risk`, `todo`, `pending`, or `stage-conclusion` signal in title/content. The CM-1431 marker content was synthetic and governance-safe, but lacked that process-memory signal.

`CM-1434` prepares `docs/CM1434_CORRECTED_SCOPED_RECORD_MEMORY_WRITE_PROOF_PACKET.md` for a future CM-1432 rerun. The corrected payload remains synthetic governance-safe, keeps `target=process`, preserves required scope fields, and adds `Checkpoint:` to title/content to satisfy the process-memory semantic rule. Corrected payload SHA-256 is `25a5f0bd9edd4ee011bff414f09a4d6f61f5dc1db31b9fc21695d9779678ba67`. Temp/synthetic validation accepts the corrected payload; no live `record_memory`, second live write, bearer token use, `search_memory`, `memory_overview`, provider/API, true memory read/write, raw store scan, runtime action, public MCP expansion, or readiness / `RC_READY` claim occurred in CM-1434.

`CM-1435` records the already executed CM-1432 corrected scoped `record_memory` write proof accepted evidence. Fresh prerequisites were `main == origin/main == da1caa25302b2cf7b233a162bcbec00d48602040`, worktree clean, listener PID `16804`, runtime freshness accepted, and public tools unchanged as `memory_overview`, `record_memory`, `search_memory`. The corrected payload hash matched `25a5f0bd9edd4ee011bff414f09a4d6f61f5dc1db31b9fc21695d9779678ba67`. Exactly one authenticated public HTTP MCP `record_memory` call executed with `target=process`, required scope fields present, synthetic governance-safe marker content, and `Checkpoint` process signal present.

The sanitized accepted evidence was `decision=accepted`, `shadowWriteStatus=ok`, `idempotencyStatus=committed`, and `memoryIdReturned=true` as a boolean only. The memory id value was not printed; raw response was not printed or persisted. Side-effect evidence for the CM-1432 corrected execution: no `search_memory`, no `memory_overview`, no provider/API call, no raw store scan, no follow-up validation, and no readiness or `RC_READY` claim. CM-1435 itself is docs-only and performs no new live probe, bearer-token use, memory tool call, real memory read/write, raw store scan, durable write, config/watchdog/startup change, public MCP expansion, remote action, or readiness claim.

`CM-1436` prepares `docs/CM1436_SCOPED_WRITE_FOLLOW_UP_SEARCH_VALIDATION_SCOPE_PACKET.md` for a future CM-1437 bounded follow-up `search_memory` validation of the CM-1432 accepted write. The packet is docs-only and does not execute `search_memory`, `record_memory`, `memory_overview`, bearer-token use, provider/API calls, runtime refresh, real memory read/write, raw store scan, memoryId lookup, raw response print/persist, public MCP expansion, remote action, readiness claim, or `RC_READY` claim. Future CM-1437 is limited to exactly one authenticated public HTTP MCP `search_memory` call with query `Checkpoint: CM-1432 scoped write proof marker`, `target=process`, `limit=1`, `include_content=false`, expected `resultCount>=1`, `access.mode=authenticated_bounded_search`, forbidden key paths `0`, and no raw/id/path/title/snippet leakage.

`CM-1438` records CM-1437 as `SEARCH_SHAPE_PASSED_BUT_BOUNDARY_DEVIATED`: sanitized follow-up `search_memory` shape was positive (`resultCount=1`, `resultsLength=1`, `access.mode=authenticated_bounded_search`, forbidden key paths `0`, no raw/id/path/title/snippet leakage), but the execution used bearer token for authenticated MCP `initialize` session setup while the approval wording said bearer token only for the one `search_memory` call. No retry or second `search_memory` occurred. CM-1438 clarifies that future authenticated MCP live gates may explicitly allow bearer token use for authenticated `initialize` session setup, authenticated `tools/list` if required, and the exactly approved `tools/call`; extra tool calls, extra search, broad reads, raw response output/persistence, provider/API, raw store scan, memoryId lookup, and readiness / `RC_READY` claims remain forbidden unless separately and exactly approved.

Latest local validation before CM-1420:

- `npm test` passed `2992/2992`.
- `npm run gate:mainline` passed health, compare `43/43`, and rollback `43/43`.

These are local validation facts only. They are not `RC_READY`, release readiness, cutover readiness, provider readiness, or broad memory reliability.

## Next Safe Action

Choose the next explicit local source/test slice or scoped board task before implementation. Future live gates should use the clarified authenticated MCP preflight envelope wording and still require exact approval before execution.

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
