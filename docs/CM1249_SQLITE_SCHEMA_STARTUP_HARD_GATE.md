# CM-1249 SQLite Schema Startup Hard Gate

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1249 implements the first runtime-source slice of the SQLite schema startup hard gate planned by CM-1180.

This is a local source/test change only. It does not install or modify watchdog/startup tasks, change Codex or Claude config, run HTTP MCP, call providers, call MCP tools, scan broad real memory, apply migration/import/export/backup/restore, push, deploy, cut over, or claim readiness.

## Result

Updated:

- `src/storage/SqliteShadowStore.js`
- `tests/sqlite-schema-startup-gate.test.js`

`SqliteShadowStore.ensureReady()` now creates and checks internal schema metadata before ordinary runtime tables are initialized:

- current expected schema version: `1`
- metadata table: `codex_memory_schema_meta`
- version key: `sqlite_schema_version`
- new databases initialize the current version
- matching current version proceeds
- invalid schema metadata fails closed
- unknown future schema versions fail closed before ordinary runtime tables are created

`getHealth()` now exposes a sanitized `schemaStartupGate` object with:

- `status`
- `expectedVersion`
- `observedVersion`
- `blocked`
- `reason`

## Boundary

- no public MCP tool expansion
- no schema migration apply
- no import/export/backup/restore apply
- no service startup or watchdog install
- no config change
- no provider call
- no MCP `tools/call`
- no real memory scan
- no durable memory/audit write beyond isolated temp-local test databases
- no remote action
- no readiness claim

## Validation

Passed:

```powershell
node --check src\storage\SqliteShadowStore.js
node --test tests\sqlite-schema-startup-gate.test.js
node --test tests\storage-corruption-quarantine.test.js tests\memory-write-restart-durability-temp-local-evidence.test.js tests\memory-write-reconcile-startup-safety-policy.test.js tests\no-touch-boundary-regression.test.js
npm test
```

Targeted test result:

- schema startup gate: `3/3`
- adjacent storage/restart/startup/no-touch: `34/34`
- default test suite: `2780/2780`

## Interpretation

CM-1249 closes the narrow "unknown future SQLite schema fails closed at startup" source/test slice.

Still not proven:

- startup recovery policy execution
- watchdog/startup installation safety
- real migration/import/export/backup/restore apply safety
- production readiness
- write reliability
- recall reliability
- RC readiness

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
