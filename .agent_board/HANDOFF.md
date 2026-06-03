# HANDOFF.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current task: `CM-1436 scoped write follow-up search validation scope packet`.
Current validation: `CMV-1547`.
Current handoff: CM-1436 prepares a future CM-1437 bounded follow-up `search_memory` validation packet without live search.

<!-- CURRENT-FACTS-ACTIVE-END -->

## Active Handoff

Goal: prepare a docs-only scope packet for future CM-1437 scoped write follow-up bounded `search_memory` validation.

Current status: `COMPLETED_VALIDATED_SCOPE_PACKET_NOT_EXECUTED`.

Workspace: `A:\codex-memory`.

Current entrypoints:

- `CURRENT_STATE.md`
- `.agent_board/CURRENT_FACTS.json`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- `CURRENT_STATE.md`

Completed in this slice:

- Added `docs/CM1436_SCOPED_WRITE_FOLLOW_UP_SEARCH_VALIDATION_SCOPE_PACKET.md`.
- Fixed future CM-1437 query to `Checkpoint: CM-1432 scoped write proof marker`.
- Bound query source to the committed public/governance-safe phrase in `docs/CM1434_CORRECTED_SCOPED_RECORD_MEMORY_WRITE_PROOF_PACKET.md`.
- Future CM-1437 is limited to exactly one authenticated public HTTP MCP `search_memory` call with `target=process`, `limit=1`, `include_content=false`.
- Future expected shape is `resultCount>=1`, `access.mode=authenticated_bounded_search`, forbidden key paths `0`, `rawContentReturned=false`, `pathsReturned=false`, `memoryIdsReturned=false`, `titlesReturned=false`, and `snippetsReturned=false`.
- Future forbidden actions include `record_memory`, additional search calls, query change, `include_content=true`, `memory_overview`, provider/API, raw store scan, memoryId lookup, raw response print/persist, config/watchdog/startup change, public MCP expansion, and readiness / `RC_READY` claim.
- No live `search_memory`, `record_memory`, `memory_overview`, bearer-token use, provider/API, real memory read/write, raw store scan, memoryId lookup, raw response print/persist, runtime action, public MCP expansion, or readiness claim occurred in CM-1436.

Validation: `CMV-1547` docs-only validation.

Boundaries:

- No runtime action, live memory tool call, provider/API call, token use, raw store scan, memoryId lookup, raw response print/persist, real durable memory/audit write, config/watchdog/startup change, public MCP expansion, remote action, or readiness claim in CM-1436.

Next safe action:

Commit/push CM-1436 packet only if separately authorized. Future CM-1437 requires runtime refresh and fresh exact one-call approval after packet commit/push.

## Historical Handoff Archive

Long historical handoff text was compressed by `CM-1420`.

Use:

- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`
- Git history before the CM-1420 change
- targeted evidence docs named by task id

Do not paste full historical handoff text into default context unless the current decision requires exact wording.
