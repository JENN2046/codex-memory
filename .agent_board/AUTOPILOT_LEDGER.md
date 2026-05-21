# AUTOPILOT_LEDGER.md - codex-memory

Purpose: local-only Smart Standing Authorization v3 ledger for goals, route plans, receipts, validation, and Red stops.

This ledger is append-only in meaning. Repository reality remains authoritative.

| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |
|---|---|---|---|---|---|---|---|---:|---|---|
| CM-0684 | Build Smart Standing Authorization v3 complete autopilot governance kernel | Green | `default_autonomy_envelope` | Add profile/runtime docs, schema examples, validators, and ledger surfaces | `not_required_no_amber_external_or_write_action` | `CMV-0808` validators/docs/diff checks passed | provider=0; api=0; mcp=0; runtime=0; memory_reads=0; memory_writes=0; dependencies=0; cost=0 | 0 | completed_validated | 2026-05-21 |

## Blocked Red Lane Items

- push / PR / tag / release / deploy
- provider calls outside exact v3 envelope
- real MCP memory write without exact sanitized scope and receipt
- broad real memory scan/export/import/migration
- dependency change without exact package/action list
- config/watchdog/startup change
- public MCP tool or schema expansion
- readiness, cutover, or `RC_READY` claim without required evidence
