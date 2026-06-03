# CHECKPOINT.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current checkpoint: `CM-1427 bounded positive search_memory shape gate scope packet`.
Current validation: `CMV-1540`.
Current checkpoint facts are summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

## CM-1427 Bounded Positive Search Memory Shape Scope Packet

Status: `COMPLETED_VALIDATED_SCOPE_PACKET_NOT_EXECUTED`

Scope:

```text
docs-only scope packet; no live execution
```

Recorded:

- Prepared `docs/CM1427_BOUNDED_POSITIVE_SEARCH_MEMORY_SHAPE_SCOPE_PACKET.md`.
- Baseline recorded as fresh Git facts: `main == origin/main == 1b840e5`.
- Future CM-1428 requires runtime refresh, runtime freshness accepted, and fresh exact approval.
- Future live execution is exactly one authenticated HTTP `search_memory` call.
- Future query is `Phase H bounded search_memory negative-control evidence`.
- Future call shape is `target=both`, `limit=1`, `include_content=false`.
- Expected positive shape is `resultCount>=1`, forbidden key paths `0`, `rawContentReturned=false`, `pathsReturned=false`, `memoryIdsReturned=false`, `titlesReturned=false`, `snippetsReturned=false`.
- Query source is public/governance-safe status wording, not raw memory/store discovery.

Boundary:

- No runtime action in CM-1427.
- No live MCP `tools/call` in CM-1427.
- No live `search_memory` in CM-1427.
- No `memory_overview`.
- No provider/API call.
- No bearer-token use.
- No raw memory/audit/store scan.
- No durable memory/audit write.
- No config/watchdog/startup change.
- No public MCP expansion.
- No remote action.
- No readiness, reliability, release, cutover, or `RC_READY` claim.

Validation: `CMV-1540` docs-only validation.

## Recent Checkpoint References

- `CM-1420`: context intake and status-surface compaction.
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
