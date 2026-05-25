# CM-1083 Memory Write Reconcile Retry/Backoff Durable Persistence Preview

Status: `DURABLE_PERSISTENCE_PREVIEW_NOT_APPLIED_NOT_READY`

## Purpose

CM-1083 turns the CM-1067 retry/backoff metadata helper into a reviewable durable persistence preview for `reconcile_queue`.

This slice does not migrate the SQLite schema, does not update queued tasks, does not start or schedule a reconcile worker, and does not claim write reliability or readiness.

## Preview Contract

The preview helper requires the existing base queue columns:

```yaml
id
memory_id
store_kind
reason
payload_json
created_at
```

It also requires future retry persistence columns before a durable update can be previewed:

```yaml
retry_metadata_json
retry_state
retry_attempt_count
next_attempt_after
last_attempt_at
last_error_code
```

When those columns are absent, CM-1083 returns `blocked` with `reconcile_queue_retry_columns_missing`.

When those columns are present in an isolated temp-local fixture, CM-1083 builds a no-apply planned update:

```yaml
table: reconcile_queue
where:
  id: exact reconcile task id
  memoryId: exact queued memory id
  storeKind: exact queued store kind
columns:
  retry_metadata_json: sanitized CM-1067 metadata JSON
  retry_state: deferred | dead_letter
  retry_attempt_count: integer
  next_attempt_after: iso8601 | null
  last_attempt_at: iso8601
  last_error_code: sanitized_lowercase_token
applies: false
```

## Store-Backed Dry-Run Boundary

`SqliteShadowStore` now exposes two read-only helpers:

- `getReconcileTaskById(taskId)`
- `getReconcileQueueColumnNames()`

The store-backed preview uses those helpers to read one exact queued task and `PRAGMA table_info(reconcile_queue)`. It does not read diary files, raw memory `.jsonl`, raw audit logs, provider state, or external systems.

## Apply Gate

CM-1083 keeps all apply gates closed:

```yaml
applyApproved: false
applyExecuted: false
cleanupApplyExecuted: false
rollbackApplyExecuted: false
schemaMigrationApplied: false
automaticStartupWorkerEnabled: false
requiresExplicitReplay: true
publicMcpExpansion: false
readinessClaimed: false
reliabilityClaimed: false
rawErrorStored: false
```

If an input requests apply approval, the helper blocks with `apply_requested_but_not_allowed_in_cm1083`.

## Non-Claims

CM-1083 does not prove:

- production or runtime retry persistence
- SQLite schema migration safety
- automatic reconcile recovery
- startup reconcile worker safety
- long-running worker durability
- write reliability
- rollback readiness
- runtime readiness
- RC readiness
- production readiness

## Validation

Targeted validation:

```powershell
node --check .\src\core\MemoryWriteReconcileRetryBackoffPersistencePreview.js
node --check .\src\storage\SqliteShadowStore.js
node --check .\tests\memory-write-reconcile-retry-backoff-persistence-preview.test.js
node --test .\tests\memory-write-reconcile-retry-backoff-persistence-preview.test.js
node --test .\tests\memory-write-reconcile-retry-backoff-metadata.test.js
node --test .\tests\memory-write-reconcile-service.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
node scripts\validate_autopilot_ledger_consistency.js
```
