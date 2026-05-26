# CM-1166 Startup Recovery Safety Preflight

Status: `CM1166_STARTUP_RECOVERY_SAFETY_PREFLIGHT_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1166 continues the durable write kernel hardening chain after CM-1165.

This slice adds a preflight-only safety surface for future startup recovery decisions:

```text
app initialization observes write-manifest health
pending manifest remains pending
startup recovery is not enabled
preflight sanitizes health counters only
execution/config/provider/readiness requests fail closed
public MCP tools remain frozen
```

## Implemented

- Added `buildStartupRecoverySafetyPreflight(...)` to `src/core/MemoryWriteReconcileStartupSafetyPolicy.js`.
- Added `sanitizeStartupRecoveryHealth(...)` to expose selected manifest/reconcile counters without paths, raw errors, or memory ids.
- Added exact source/mode checks for preflight-only inputs.
- Added bounded limit checks for future recovery/repair/cancel planning.
- Added fail-closed blockers for startup recovery execution, runtime recovery, config/watchdog/startup changes, public MCP expansion, provider calls, real-store writes, schema migration, backup/restore, import/export, and readiness/reliability claims.
- Added CM-1166 temp-local tests in `tests/memory-write-reconcile-startup-safety-policy.test.js`.

## Validation

Passed:

```text
node --check src\core\MemoryWriteReconcileStartupSafetyPolicy.js
node --check tests\memory-write-reconcile-startup-safety-policy.test.js
node --test .\tests\memory-write-reconcile-startup-safety-policy.test.js
node --test .\tests\memory-write-reconcile-startup-safety-policy.test.js .\tests\v1-1-hardening-validation-aggregator.test.js .\tests\v1-1-hardening-evidence-packet-runner.test.js .\tests\v1-1-hardening-staged-closeout.test.js .\tests\governance-runtime-approval-audit-loop.test.js
npm test
```

Targeted startup safety tests passed `9/9`.

Adjacent v1.1/governance bundle passed `33/33`.

Full project validation passed `2774/2774`.

Additional local checks passed:

```text
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
focused no-secret/no-overclaim scan
changed-scope re-review
```

The focused scan returned expected boundary/negative wording and sanitizer-test synthetic secret strings only.

Changed-scope re-review found one actionable counter-normalization issue: `pickCounter()` originally used `Number(value)`, which could treat `null` or an empty string as `0`. It was repaired to require an actual non-negative integer, and the malformed-health test now covers a `null` manifest counter. Source/test syntax, targeted tests, adjacent bundle, and full `npm test` were rerun after this repair.

## Boundaries

CM-1166 does not implement:

- automatic startup recovery
- automatic startup repair or cancellation
- runtime recovery execution
- background worker enablement
- scheduler/watchdog recovery
- retry/backoff policy
- real memory store recovery
- cross-store transactionality
- backup/restore
- migration/import/export
- production readiness
- write reliability
- recall reliability
- RC readiness

CM-1166 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores during validation
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slices:

```text
guarded startup recovery policy design
retry/backoff policy for reconcile and recovery tasks
real-store recovery approval packet design
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
