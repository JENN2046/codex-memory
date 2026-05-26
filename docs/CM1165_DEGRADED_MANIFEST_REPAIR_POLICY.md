# CM-1165 Degraded Manifest Repair Policy

Status: `CM1165_DEGRADED_MANIFEST_REPAIR_POLICY_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1165 continues the durable write kernel hardening chain after CM-1164.

This slice adds a bounded explicit repair policy for the case:

```text
degraded write manifest exists
reconcile queue still has tasks
explicit repair retains degraded manifest
reconcile queue drains
explicit repair transitions degraded -> repaired
duplicate canonical write replays repaired result
selected write-manifest audit reports repaired metadata
```

## Implemented

- Added `SqliteShadowStore.repairDegradedMemoryWriteManifest(...)` with a `WHERE status = 'degraded'` guard.
- Added `MemoryWriteService.repairDegradedMemoryWriteManifests(...)` as an explicit internal operation.
- Extended idempotent replay to accept `repaired` manifests while preserving `repaired` and `repairReason` metadata.
- Extended selected write-manifest audit metadata with `repaired` and `repairReason`.
- Added a temp-local CM-1165 test in `tests/memory-write-restart-durability-temp-local-evidence.test.js`.

## Validation

Passed:

```text
node --check src\storage\SqliteShadowStore.js
node --check src\core\MemoryWriteService.js
node --check src\storage\AuditLogStore.js
node --check tests\memory-write-restart-durability-temp-local-evidence.test.js
node --test .\tests\memory-write-restart-durability-temp-local-evidence.test.js .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\storage-corruption-quarantine.test.js .\tests\memory-write-reconcile-worker.test.js .\tests\audit-log-store-selected-correlation.test.js
npm test
```

Targeted tests passed `40/40`.

Full project validation passed `2770/2770`.

Note: the first targeted run exposed that duplicate replay did not preserve `idempotency.repaired`; this was repaired narrowly by carrying `repaired` and `repairReason` through idempotent replay, then the targeted bundle passed.

Additional local checks passed:

```text
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
focused no-secret/no-overclaim scan
changed-scope re-review
```

The focused scan returned only expected boundary/negative wording plus the existing secret-scanner pattern in `MemoryWriteService`.

## Boundaries

CM-1165 does not implement:

- automatic startup repair
- background repair worker enablement
- automatic reconcile replay
- automatic degraded repair during worker replay
- retry/backoff policy
- repair over real memory stores
- cross-store transactionality
- backup/restore
- migration/import/export
- production readiness
- write reliability
- recall reliability
- RC readiness

CM-1165 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores during validation
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slices:

```text
guarded automatic pending-manifest recovery policy design
retry/backoff policy for reconcile and recovery tasks
startup recovery safety preflight
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
