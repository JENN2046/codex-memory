# CM-1253 Schema Gate Dry-Run Execution Preflight Invariant

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1253 propagates the accepted schema startup gate from the temp-local dry-run harness into the downstream dry-run execution preflight acceptance boundary.

This is local source/test policy hardening only. It does not execute dry-run, enable startup recovery, run recovery apply, install startup/watchdog tasks, change config, start HTTP MCP, call providers, call MCP tools, scan real memory, apply migration/import/export/backup/restore, push, deploy, cut over, or claim readiness.

## Result

Updated:

- `src/core/MemoryWriteReconcileStartupSafetyPolicy.js`
- `tests/memory-write-reconcile-startup-safety-policy.test.js`

`buildTempLocalStartupRecoveryDryRunHarness(...)` now records `dryRunPlan.priorPolicySchemaGateAccepted`.

`hasAcceptedTempLocalStartupRecoveryDryRunHarness(...)` now requires `dryRunPlan.priorPolicySchemaGateAccepted === true`.

Downstream `buildTempLocalStartupRecoveryDryRunExecutionPreflight(...)` therefore rejects accepted-looking dry-run harness objects that do not carry the schema-gated policy invariant.

This prevents dry-run execution preflight preparation from relying on stale or handcrafted dry-run harness objects that do not prove the chain remained schema-gated.

## Boundary

- no dry-run execution
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

Targeted and adjacent test result: `27/27`.

Default test result: `2782/2782`.

## Interpretation

CM-1253 makes the accepted schema startup gate an invariant that must survive through dry-run harness preparation before dry-run execution preflight can become ready.

Still not proven:

- automatic startup recovery execution
- dry-run execution
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
