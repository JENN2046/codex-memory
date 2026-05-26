# CM-1180 SQLite Schema Version Startup Gate Plan

Date: 2026-05-26

Status: `CM1180_SQLITE_SCHEMA_VERSION_STARTUP_GATE_PLAN_COMPLETED_NOT_IMPLEMENTED_NOT_READY`

## Current Source Facts

`src/storage/SqliteShadowStore.js` currently creates and evolves the shadow database inside `SqliteShadowStore.ensureReady()`:

- It opens `DatabaseSync(this.config.dbPath)`.
- It executes `CREATE TABLE IF NOT EXISTS` for `memory_records`, `memory_chunks`, `reconcile_queue`, and `memory_write_manifests`.
- It calls `ensureColumn(...)`, which uses `PRAGMA table_info(...)` and `ALTER TABLE ... ADD COLUMN ...` when a column is missing.
- It refreshes memory record column metadata after those operations.

Current source does not expose a durable schema version gate:

- No `PRAGMA user_version` contract is enforced.
- No explicit schema compatibility status is returned before ordinary runtime use.
- Missing columns are still repaired opportunistically at store startup.
- Startup does not have a fail-closed mode for unknown future schema versions.

## Planned Gate

Future implementation should add a narrow SQLite schema startup gate before broader runtime readiness claims:

1. Define a local schema contract for the shadow store.
2. Record the expected schema version through `PRAGMA user_version` or an equivalent local metadata table.
3. Add a read-only inspection method that reports:
   - current schema version
   - expected schema version
   - known tables present
   - required columns present
   - opportunistic repair needed
   - unknown future version detected
   - startup gate decision
4. Fail closed for unknown future schema versions.
5. Keep additive known-column repair explicit and auditable.
6. Expose only selected, sanitized health/overview facts if operator surfaces need it.

## Non-Goals

CM-1180 does not implement the gate.

It does not run SQLite migrations, does not run `ALTER TABLE`, does not modify startup behavior, does not change config/watchdog/startup, does not touch real memory stores, does not apply migration/import/export/backup/restore, and does not claim readiness or reliability.

## Acceptance Criteria For A Future Implementation

A later implementation should include tests proving:

- fresh temp-local DB initializes at the expected schema version
- existing compatible DB passes without destructive mutation
- missing known additive column produces explicit repair evidence
- unknown future schema version fails closed
- schema inspection output is sanitized and does not include raw memory content
- public MCP tools remain unchanged
- no provider/API calls occur
- no readiness or reliability claim is emitted

## Decision

`CM1180_SQLITE_SCHEMA_VERSION_STARTUP_GATE_PLAN_COMPLETED_NOT_IMPLEMENTED_NOT_READY`

This plan turns the current schema-version startup gate gap into an explicit future implementation target. The gap remains open until a later source/test slice implements and validates the gate.
