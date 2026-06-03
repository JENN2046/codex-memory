# CHECKPOINT.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current checkpoint: `CM-1429 positive bounded search memoryIdsReturned flag investigation`.
Current validation: `CMV-1541`.
Current checkpoint facts are summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

## CM-1429 Positive Bounded Search MemoryIdsReturned Flag Investigation

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_NO_LIVE_RERUN`

Scope:

```text
local source/test investigation; no live rerun
```

Recorded:

- CM-1428 fail-closed receipt had `resultCount=1`, forbidden key paths `0`, and `memoryIdsReturned=true`.
- Source projection `projectAuthenticatedBoundedSearchResponse(...)` sets `access.memoryIdsReturned=false`.
- HTTP authenticated bounded path injects `requestContext.authenticatedBoundedSearch=true` for bearer requests.
- Existing synthetic HTTP projection test proves non-empty bounded projection strips `memoryId` and returns `access.memoryIdsReturned=false`.
- Root cause is likely evidence collector false positive from key path `structuredContent.access.memoryIdsReturned`, not source projection leakage.
- Added `inspectBoundedSearchEvidenceShape(...)` to distinguish safe access flag keys from true access flag value or result item leakage.

Boundary:

- No runtime action in CM-1429.
- No live MCP `tools/call` in CM-1429.
- No live `search_memory` rerun in CM-1429.
- No `memory_overview`.
- No provider/API call.
- No bearer-token use.
- No raw memory/audit/store scan.
- No durable memory/audit write.
- No config/watchdog/startup change.
- No public MCP expansion.
- No remote action.
- No readiness, reliability, release, cutover, or `RC_READY` claim.

Validation: `CMV-1541` source/test/docs validation.

## Recent Checkpoint References

- `CM-1420`: context intake and status-surface compaction.
- `CM-1427`: bounded positive `search_memory` shape gate scope packet.
- `CM-1426`: Phase H bounded `search_memory` negative-control evidence closeout.
- `CM-1425`: `search_memory` negative-control precision / no-result policy patch.
- `CM-1424`: authenticated `search_memory` bounded/noRawContentRead projection patch.
- `CM-1418`: Phase H bounded `memory_overview` live no-mutation evidence closeout, docs-only closeout of already executed live evidence.
- `CM-1417`: authenticated `memory_overview` bounded projection source/test/docs hardening.
- `CM-1416`: strict no-token `/health` split.
- `CM-1415`: temp DB query quality gate.
- `CM-1414`: internal `audit_memory` readonly public-tool draft.

## Historical Archive

Long checkpoint history was compressed by `CM-1420`.

Historical checkpoint text is available through Git history and the archive index:

- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`
- `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`

Repository reality and fresh Git output override historical checkpoint text.
- `CM-1421`: Phase H `search_memory` negative-control scope packet.
- `CM-1423`: search_memory response sanitizer shape investigation.
