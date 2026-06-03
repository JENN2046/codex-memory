# CHECKPOINT.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current checkpoint: `CM-1434 corrected scoped record_memory write proof packet`.
Current validation: `CMV-1545`.
Current checkpoint facts are summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

## CM-1434 Corrected Scoped Record Memory Write Proof Packet

Status: `COMPLETED_VALIDATED_CORRECTED_PACKET_NOT_EXECUTED`

Scope:

```text
docs/test corrected packet; no live write
```

Recorded:

- Corrected packet path: `docs/CM1434_CORRECTED_SCOPED_RECORD_MEMORY_WRITE_PROOF_PACKET.md`.
- CM-1432 fail-closed fact remains preserved.
- CM-1433 root cause remains process-target semantic signal missing in CM-1431 payload.
- Corrected payload remains synthetic governance-safe and `target=process`.
- Corrected payload adds `Checkpoint:` in title/content.
- Required scope fields remain present: `project_id`, `client_id`, `visibility`, `task_id`, `retention_policy`.
- Corrected payload SHA-256: `25a5f0bd9edd4ee011bff414f09a4d6f61f5dc1db31b9fc21695d9779678ba67`.
- Temp/synthetic validation accepted the corrected payload.
- Future exact approval template included in the corrected packet.
- No live `record_memory`, second live write attempt, `search_memory`, `memory_overview`, bearer-token use, provider/API, true memory read/write, raw store scan, runtime action, public MCP expansion, or readiness / `RC_READY` claim occurred in CM-1434.

Boundary:

- No runtime action in CM-1434.
- No live MCP `tools/call` in CM-1434.
- No live `record_memory` in CM-1434.
- No second live write attempt.
- No live `search_memory`.
- No `memory_overview`.
- No provider/API call.
- No bearer-token use.
- No raw memory/audit/store scan.
- No durable memory/audit write.
- No config/watchdog/startup change.
- No public MCP expansion.
- No remote action.
- No readiness, reliability, release, cutover, or `RC_READY` claim.

Validation: `CMV-1545` docs/test validation.

## Recent Checkpoint References

- `CM-1420`: context intake and status-surface compaction.
- `CM-1433`: `record_memory` rejection reason investigation.
- `CM-1431`: scoped `record_memory` write proof scope packet.
- `CM-1430`: bounded positive `search_memory` shape evidence closeout.
- `CM-1429`: positive bounded `search_memory` `memoryIdsReturned` flag investigation.
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
