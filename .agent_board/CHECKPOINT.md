# CHECKPOINT.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current checkpoint: `CM-1426 Phase H bounded search_memory negative-control evidence closeout`.
Current validation: `CMV-1539`.
Current checkpoint facts are summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

## CM-1426 Phase H Bounded Search Memory Negative-Control Evidence Closeout

Status: `COMPLETED_VALIDATED_DOCS_ONLY_CM1422_SEARCH_MEMORY_NEGATIVE_CONTROL_PASSED`

Scope:

```text
docs-only evidence closeout; no new live probe
```

Recorded:

- `main == origin/main == b7e20cc`.
- Runtime freshness accepted.
- Listener PID `4296`.
- Public tools unchanged: `memory_overview`, `record_memory`, `search_memory`.
- NC1 and NC2 both returned `resultCount=0`.
- Both used `target=both`, `limit=1`, `include_content=false`.
- `access.mode=authenticated_bounded_search`.
- Forbidden key paths `0`.
- `rawContentReturned=false`, `pathsReturned=false`, `memoryIdsReturned=false`.
- No `record_memory`, provider/API, raw store scan, durable write observed, or readiness / `RC_READY` claim.

Boundary:

- No runtime action in CM-1426.
- No live MCP `tools/call` in CM-1426.
- No live `search_memory` rerun in CM-1426.
- No `memory_overview`.
- No provider/API call.
- No bearer-token use.
- No raw memory/audit/store scan.
- No durable memory/audit write.
- No config/watchdog/startup change.
- No public MCP expansion.
- No remote action.
- No readiness, reliability, release, cutover, or `RC_READY` claim.

Validation: `CMV-1539` docs-only validation.

## Recent Checkpoint References

- `CM-1420`: context intake and status-surface compaction.
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
