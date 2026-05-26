# CM-1167 Guarded Startup Recovery Policy Design

Status: `CM1167_GUARDED_STARTUP_RECOVERY_POLICY_DESIGN_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1167 continues the durable write kernel hardening chain after CM-1166.

This slice adds a policy-design-only gate for future startup recovery:

```text
accepted CM-1166 startup recovery preflight
disabled startup recovery policy draft
dry-run-first requirement
manual approval requirement
bounded 1..10 planning limits
no startup recovery execution
next step limited to temp-local dry-run harness
```

## Implemented

- Added `buildGuardedStartupRecoveryPolicyDesign(...)` to `src/core/MemoryWriteReconcileStartupSafetyPolicy.js`.
- Added exact mode/source checks for policy-design-only input.
- Required an accepted CM-1166 preflight report with all execution and mutation flags false.
- Required bounded future limits for startup recovery, reconcile replay, and repair planning.
- Required `dryRunRequired=true` and `manualApprovalRequired=true`.
- Blocked startup-time pending recovery, degraded repair, missing-diary cancellation, reconcile replay, real-store scope, policy activation, runtime recovery, dry-run execution, provider calls, public MCP expansion, config/watchdog/startup changes, schema migration, backup/restore, import/export, and readiness/reliability claims.
- Added CM-1167 tests in `tests/memory-write-reconcile-startup-safety-policy.test.js`.

## Validation

Passed:

```text
node --check src\core\MemoryWriteReconcileStartupSafetyPolicy.js
node --check tests\memory-write-reconcile-startup-safety-policy.test.js
node --test .\tests\memory-write-reconcile-startup-safety-policy.test.js
node --test .\tests\memory-write-reconcile-startup-safety-policy.test.js .\tests\v1-1-hardening-validation-aggregator.test.js .\tests\v1-1-hardening-evidence-packet-runner.test.js .\tests\v1-1-hardening-staged-closeout.test.js .\tests\governance-runtime-approval-audit-loop.test.js
npm test
```

Targeted startup safety/policy tests passed `12/12`.

Adjacent v1.1/governance bundle passed `36/36`.

Full project validation passed `2777/2777`.

Additional local checks passed:

```text
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
focused no-secret/no-overclaim scan
changed-scope re-review
```

The focused scan returned expected boundary/negative wording, historical board entries, and sanitizer-test synthetic secret strings only.

Changed-scope re-review found one actionable scope-tightening issue: the first policy-design helper accepted a missing/unspecified policy store scope. It was repaired to require `realStoreScope` to be `temp_local` or `fixture_only`, and the malformed-policy test now covers broad scope rejection. Source/test syntax, targeted tests, adjacent bundle, and full `npm test` were rerun after this repair.

## Boundaries

CM-1167 does not implement:

- startup recovery execution
- runtime recovery execution
- dry-run recovery harness
- automatic startup repair or cancellation
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

CM-1167 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores during validation
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slice:

```text
implement temp-local startup recovery dry-run harness only
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
