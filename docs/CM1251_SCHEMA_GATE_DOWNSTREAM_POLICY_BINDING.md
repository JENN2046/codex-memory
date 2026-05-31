# CM-1251 Schema Gate Downstream Policy Binding

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1251 binds the CM-1250 schema-gated startup recovery preflight into the downstream guarded startup recovery policy acceptance path.

This is local source/test policy hardening only. It does not enable startup recovery, run recovery apply, install startup/watchdog tasks, change config, start HTTP MCP, call providers, call MCP tools, scan real memory, apply migration/import/export/backup/restore, push, deploy, cut over, or claim readiness.

## Result

Updated:

- `src/core/MemoryWriteReconcileStartupSafetyPolicy.js`
- `tests/memory-write-reconcile-startup-safety-policy.test.js`

`hasAcceptedStartupRecoveryPreflight(...)` now requires the accepted preflight report to carry an accepted sanitized `shadowHealth.schemaStartupGate`.

Downstream `buildGuardedStartupRecoveryPolicyDesign(...)` therefore rejects:

- legacy accepted-looking preflight objects that omit `shadowHealth.schemaStartupGate`
- accepted-looking preflight objects whose schema gate is blocked

This prevents later startup recovery policy design and dry-run harness steps from treating a stale or handcrafted pre-CM-1250 preflight shape as sufficient evidence.

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

Targeted and adjacent test result: `27/27`.

Default test result: `2782/2782`.

## Interpretation

CM-1251 makes the schema startup gate a downstream policy acceptance invariant, not just a preflight-generation check.

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
