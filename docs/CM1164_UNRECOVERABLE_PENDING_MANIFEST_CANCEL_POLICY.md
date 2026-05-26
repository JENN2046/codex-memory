# CM-1164 Unrecoverable Pending Manifest Cancel Policy

Status: `CM1164_UNRECOVERABLE_PENDING_MANIFEST_CANCEL_POLICY_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1164 continues the durable write kernel validation chain after CM-1163.

This slice adds a bounded explicit cancellation policy for the case:

```text
pending write manifest exists
matching diary record is absent
explicit recovery reports missing diary
explicit cancel policy runs
manifest transitions from pending to cancelled
duplicate canonical write remains terminally rejected
no SQLite/vector/chunk projection is created
selected write-manifest audit reports cancelled metadata
```

## Implemented

- Added `SqliteShadowStore.cancelPendingMemoryWriteManifest(...)` with a `WHERE status = 'pending'` guard.
- Added `MemoryWriteService.cancelUnrecoverablePendingWriteManifests(...)` as an explicit internal operation.
- Added terminal `cancelled` / `aborted` idempotency handling in `MemoryWriteService.record(...)`.
- Extended selected write-manifest audit metadata with `cancelled` and `cancelReason`.
- Added a temp-local CM-1164 test in `tests/memory-write-restart-durability-temp-local-evidence.test.js`.

## Validation

Passed:

```text
node --check src\storage\SqliteShadowStore.js
node --check src\core\MemoryWriteService.js
node --check src\storage\AuditLogStore.js
node --check tests\memory-write-restart-durability-temp-local-evidence.test.js
node --test .\tests\memory-write-restart-durability-temp-local-evidence.test.js .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\storage-corruption-quarantine.test.js .\tests\memory-write-reconcile-worker.test.js .\tests\audit-log-store-selected-correlation.test.js
node --test ./tests/*.test.js
npm test
```

Targeted tests passed `39/39`.

Full project validation passed `2769/2769`.

Note: the first `npm test` run after the source change reported `2766` pass / `3` fail, but the follow-up failure extraction run using the same underlying Node test command exited `0`, and the subsequent `npm test` rerun passed `2769/2769`. No code change was made between the failing run and the passing reruns.

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

CM-1164 does not implement:

- automatic startup cancellation
- background recovery or cancellation worker enablement
- automatic missing-diary repair
- manifest deletion
- retry/backoff policy
- recovery scheduling
- recovery or cancellation over real memory stores
- cross-store transactionality
- backup/restore
- migration/import/export
- production readiness
- write reliability
- recall reliability
- RC readiness

CM-1164 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores during validation
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slices:

```text
manifest degraded-to-repaired status policy design
guarded automatic pending-manifest recovery policy design
retry/backoff policy for reconcile and recovery tasks
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
