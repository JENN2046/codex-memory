# CHECKPOINT.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current checkpoint: `CM-1431 scoped record_memory write proof scope packet`.
Current validation: `CMV-1543`.
Current checkpoint facts are summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

## CM-1431 Scoped Record Memory Write Proof Scope Packet

Status: `COMPLETED_VALIDATED_SCOPE_PACKET_NOT_EXECUTED`

Scope:

```text
docs-only scope packet; no live write
```

Recorded:

- Packet path: `docs/CM1431_SCOPED_RECORD_MEMORY_WRITE_PROOF_SCOPE_PACKET.md`.
- Baseline before packet: `main == origin/main == 61a20c694c49aa937049846f3d8d37a586a01a0c`.
- Future gate: `CM-1432 scoped record_memory write proof`.
- Future write shape: exactly one authenticated public HTTP MCP `record_memory` call.
- Future target: `process`.
- Future content: synthetic governance-safe marker only.
- Required future scope fields: `project_id`, `client_id`, `visibility`, `task_id`, `retention_policy`.
- Future payload SHA-256: `015df43d6ca44197da9a3811a02c39c1696f1d27661a399c6ecc421ba9a757fb`.
- Future validation: write accepted, no provider/API, no raw store scan, no broad search, no follow-up search unless separately authorized, evidence closeout required.
- Future exact approval template included in the packet.
- No live `record_memory`, `search_memory`, `memory_overview`, bearer-token use, provider/API, real memory read/write, raw store scan, durable write, runtime action, public MCP expansion, or readiness / `RC_READY` claim occurred in CM-1431.

Boundary:

- No runtime action in CM-1431.
- No live MCP `tools/call` in CM-1431.
- No live `record_memory` in CM-1431.
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

Validation: `CMV-1543` docs-only validation.

## Recent Checkpoint References

- `CM-1420`: context intake and status-surface compaction.
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
