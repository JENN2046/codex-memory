# CHECKPOINT.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current checkpoint: `CM-1424 search_memory authenticated bounded/noRawContentRead projection patch`.
Current validation: `CMV-1537`.
Current checkpoint facts are summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

## CM-1424 Search Memory Authenticated Bounded Projection Patch

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_HARDENING_NO_LIVE_RERUN`

Scope:

```text
local source/test HTTP boundary patch; no live rerun
```

Changed:

- Added authenticated HTTP `search_memory` bounded projection in `src/app.js`.
- Marked authenticated HTTP search requests in `src/adapters/codex-mcp/http.js`.
- Kept no-token `search_memory` rejected.
- Rejected `include_content=true` before search execution for authenticated bounded HTTP search.
- Added synthetic/key-path sanitizer tests and HTTP contract tests for the bounded projection.

Boundary:

- No runtime action.
- No live MCP `tools/call` in CM-1424.
- No live `search_memory` rerun in CM-1424.
- No provider/API call.
- No bearer-token use.
- No raw NC1 response print or persistence.
- No raw memory/audit/store scan.
- No durable memory/audit write.
- No config/watchdog/startup change.
- No public MCP expansion.
- No remote action.
- No readiness, reliability, release, cutover, or `RC_READY` claim.

Validation: `CMV-1537` source/test/hardening validation.

## Recent Checkpoint References

- `CM-1420`: context intake and status-surface compaction.
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
