# CM-1250 Schema-Gated Startup Recovery Policy

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1250 connects the CM-1249 SQLite schema startup hard gate to the existing startup recovery policy preflight.

This is local source/test policy integration only. It does not enable automatic startup recovery, run recovery apply, install startup/watchdog tasks, change config, start HTTP MCP, call providers, call MCP tools, scan real memory, apply migration/import/export/backup/restore, push, deploy, cut over, or claim readiness.

## Result

Updated:

- `src/core/MemoryWriteReconcileStartupSafetyPolicy.js`
- `tests/memory-write-reconcile-startup-safety-policy.test.js`

`buildStartupRecoverySafetyPreflight(...)` now sanitizes and requires `shadowHealth.schemaStartupGate`.

Accepted schema gate statuses:

- `initialized_current_schema_version`
- `current_schema_version_confirmed`
- `older_schema_version_allowed_for_additive_repair`

Fail-closed blockers:

- `schema_startup_gate_required`
- `schema_startup_gate_blocked`
- `schema_startup_gate_status_unaccepted`
- `schema_startup_gate_version_malformed`
- `schema_startup_gate_future_version_blocked`

The startup recovery preflight still reports recovery as disabled and not executed. CM-1250 only prevents recovery policy progression when the schema gate is absent, blocked, malformed, or future-versioned.

## Boundary

- no startup recovery execution
- no runtime recovery execution
- no manifest recovery/repair/cancel execution
- no reconcile replay apply
- no startup/watchdog install
- no config change
- no service start
- no provider call
- no MCP `tools/call`
- no real memory scan
- no durable memory/audit write
- no migration/import/export/backup/restore apply
- no public MCP expansion
- no remote action
- no readiness or reliability claim

## Validation

Passed:

```powershell
node --check src\core\MemoryWriteReconcileStartupSafetyPolicy.js
node --test tests\memory-write-reconcile-startup-safety-policy.test.js tests\sqlite-schema-startup-gate.test.js tests\no-touch-boundary-regression.test.js
npm test
```

Targeted and adjacent test result: `26/26`.

Default test result: `2781/2781`.

## Interpretation

CM-1250 turns the existing startup recovery policy preflight into a schema-gated preflight. This is the safe ordering needed after CM-1249: recovery policy cannot proceed unless the SQLite startup schema gate has accepted the store.

Still not proven:

- automatic startup recovery execution
- real reconcile/rebuild/recovery apply
- startup/watchdog installation safety
- production readiness
- write reliability
- recall reliability
- RC readiness

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
