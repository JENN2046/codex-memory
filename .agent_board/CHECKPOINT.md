# CHECKPOINT.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current checkpoint: `CM-1425 search_memory negative-control precision / no-result policy patch`.
Current validation: `CMV-1538`.
Current checkpoint facts are summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

## CM-1425 Search Memory Negative-Control Precision Patch

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_HARDENING_NO_LIVE_RERUN`

Scope:

```text
local source/test HTTP precision policy patch; no live rerun
```

Changed:

- Added high-entropy nonce negative-control detection in `src/app.js`.
- Authenticated bounded HTTP `search_memory` now passes `proofNoResultMode` for exact nonce-style `target=both`, `limit=1`, `include_content=false` calls.
- Ordinary authenticated bounded search remains without precision policy.
- Added HTTP contract coverage proving the negative-control path receives `proofNoResultMode`.

Boundary:

- No runtime action.
- No live MCP `tools/call` in CM-1425.
- No live `search_memory` rerun in CM-1425.
- No provider/API call.
- No bearer-token use.
- No raw memory/audit/store scan.
- No durable memory/audit write.
- No config/watchdog/startup change.
- No public MCP expansion.
- No remote action.
- No readiness, reliability, release, cutover, or `RC_READY` claim.

Validation: `CMV-1538` source/test/hardening validation.

## Recent Checkpoint References

- `CM-1420`: context intake and status-surface compaction.
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
