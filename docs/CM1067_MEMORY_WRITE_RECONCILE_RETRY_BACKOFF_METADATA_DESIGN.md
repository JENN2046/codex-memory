# CM-1067 Memory Write Reconcile Retry/Backoff Metadata Design

Status: `DESIGN_AND_TEMP_LOCAL_HELPER_ONLY_NOT_INTEGRATED_NOT_READY`

## Purpose

CM-1067 defines bounded retry/backoff metadata for future write reconcile queue handling.

It does not start an automatic worker, does not change Codex/Claude startup configuration, does not migrate the durable SQLite schema, and does not claim automatic degraded write recovery.

## Metadata Contract

The current design helper emits `cm1067_reconcile_retry_backoff_metadata_v1`:

```yaml
taskId: CM-1067_MEMORY_WRITE_RECONCILE_RETRY_BACKOFF_METADATA_DESIGN
schemaVersion: cm1067_reconcile_retry_backoff_metadata_v1
state: deferred | dead_letter
attemptCount: integer >= 1
firstAttemptAt: iso8601
lastAttemptAt: iso8601
nextAttemptAfter: iso8601 | null
backoffDelayMs: integer
backoffBaseDelayMs: integer
backoffMaxDelayMs: integer
deadLetterAfterAttempts: integer
lastErrorCode: sanitized_lower_snake_case
rawErrorStored: false
automaticStartupWorkerEnabled: false
requiresExplicitReplay: true
```

## Policy

- A failed replay increments `attemptCount`.
- Backoff is exponential and capped by `backoffMaxDelayMs`.
- Once `attemptCount >= deadLetterAfterAttempts`, state becomes `dead_letter` and `nextAttemptAfter` is `null`.
- Error metadata stores only a sanitized error code, never raw error text, stack traces, memory IDs, payloads, provider details, or secrets.
- This slice is helper-only. Durable queue persistence and scheduling integration require a later explicit patch.

## Non-Claims

CM-1067 does not prove:

- automatic reconcile recovery
- startup reconcile safety
- long-running worker durability
- real-memory cleanup safety
- rollback readiness
- write reliability
- runtime readiness
- RC readiness
- production readiness

## Validation

Targeted temp-local validation:

```powershell
node --check .\src\core\MemoryWriteReconcileRetryBackoffMetadata.js
node --check .\tests\memory-write-reconcile-retry-backoff-metadata.test.js
node --test .\tests\memory-write-reconcile-retry-backoff-metadata.test.js
```
