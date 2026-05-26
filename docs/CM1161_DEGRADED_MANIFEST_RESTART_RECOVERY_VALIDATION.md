# CM-1161 Degraded Manifest Restart Recovery Validation

Status: `CM1161_DEGRADED_MANIFEST_RESTART_RECOVERY_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1161 continues the durable write kernel validation chain after CM-1160.

This slice adds temp-local degraded-path coverage for the case:

```text
SQLite write manifest pending
diary record written
store/service reopened
manual pending-manifest recovery run
vector projection fails during recovery
SQLite/chunk projection succeeds
manifest finalizes as degraded
reconcile task remains visible
duplicate canonical write replays the degraded manifest
```

## Implemented

- Added a temp-local test in `tests/memory-write-restart-durability-temp-local-evidence.test.js`.
- The test creates a pending write manifest and writes only the diary record.
- It closes/reopens the temp-local stores to simulate a process boundary.
- It injects a synthetic vector projection failure during explicit recovery.
- It verifies degraded manifest finalization, selected degraded audit correlation, persisted SQLite/chunk projection, vector absence, reconcile queue visibility, and duplicate canonical replay of the degraded manifest.

## Validation

Passed:

```text
node --check tests\memory-write-restart-durability-temp-local-evidence.test.js
node --test .\tests\memory-write-restart-durability-temp-local-evidence.test.js .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\storage-corruption-quarantine.test.js
npm test
```

Targeted tests passed `12/12`.

Full project validation passed `2766/2766`.

Additional local checks passed:

```text
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
focused no-secret/no-overclaim scan
changed-scope re-review
```

## Boundaries

CM-1161 does not implement:

- automatic startup recovery
- background recovery worker enablement
- degraded projection auto-healing
- recovery scheduling
- recovery over real memory stores
- cross-store transactionality
- backup/restore
- migration/import/export
- production readiness
- write reliability
- recall reliability
- RC readiness

CM-1161 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores during validation
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slices:

```text
degraded reconcile replay after restart validation
missing-diary pending-manifest restart validation
guarded automatic pending-manifest recovery policy design
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
