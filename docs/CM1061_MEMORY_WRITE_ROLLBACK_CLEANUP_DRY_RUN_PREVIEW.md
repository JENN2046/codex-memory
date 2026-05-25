# CM-1061 Memory Write Rollback Cleanup Dry-Run Preview

Status: `COMPLETED_VALIDATED_ROLLBACK_CLEANUP_DRY_RUN_PREVIEW_NOT_EXECUTED_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1061 consumes the CM-1060 cleanup design-review policy and adds a pure explicit-input dry-run preview builder.

The helper turns an accepted cleanup design into a reviewable list of cleanup actions while still not reading stores, writing stores, executing cleanup, applying rollback, deleting diary records, rewriting audit logs, or claiming readiness.

## Change

- Added `src/core/MemoryWriteRollbackCleanupDryRunPreview.js`.
- Added `tests/memory-write-rollback-cleanup-dry-run-preview.test.js`.
- No public MCP tool, runtime source entry, package, config, watchdog, startup, provider, real cleanup, real rollback, store read/write, durable audit, durable projection, diary deletion, or audit rewrite change was made.

## Dry-Run Preview Boundary

The helper accepts only caller-provided input.

It requires an accepted CM-1060 design-review report, then requires the preview to stay in `dry_run_preview_only` mode and `memory_id_and_store_kind_scoped` scope.

Accepted input must include:

- exact `process` target
- exact non-empty `memoryId`
- exact target stores: `sqlite_shadow_record`, `vector_index_record`, `candidate_cache_entries`, and `reconcile_queue_tasks`
- exact retained stores: `diary_record` and `write_audit_log`
- explicit target evidence for at least one cleanup target
- reconcile tasks whose `memoryId` matches the preview `memoryId`
- explicit reconcile `storeKind` values
- preview-only, exact-memory-id, store-kind-scoped, unrelated-memory-id-preserving, diary-retaining, audit-append-only, separate-apply-approval, runtime-validation-before-apply, and stop-before-apply flags

Accepted output produces `plannedActions` only:

- `delete_sqlite_shadow_record`
- `delete_vector_index_record`
- `clear_candidate_cache_entries`
- `clear_reconcile_tasks` grouped by store kind

Every planned action has `applies=false`.

The retained evidence output keeps diary and write audit retained, also with `applies=false`.

The helper fails closed on missing exact memory id, missing cleanup targets, target-store drift, retained-store drift, reconcile memory-id mismatch, missing reconcile store kind, cleanup apply, rollback apply, diary deletion, audit rewrite, public MCP expansion, config/watchdog/startup change, dependency change, real cleanup safety claim, real rollback safety claim, write reliability claim, readiness claim, side-effect counters, malformed counters, or unknown positive counters.

## Validation

- `node --check .\src\core\MemoryWriteRollbackCleanupDryRunPreview.js` passed.
- `node --check .\tests\memory-write-rollback-cleanup-dry-run-preview.test.js` passed.
- `node --test .\tests\memory-write-rollback-cleanup-dry-run-preview.test.js` passed `6/6`.
- Adjacent rollback cleanup/reconcile/MCP regression bundle passed `60/60`.
- Full `npm test` passed `2526/2526`.

## Result

CM-1061 is completed and validated as a rollback cleanup dry-run preview builder.

It lets a future stage generate a scoped, preview-only action list from explicit reviewed input while still stopping before any apply path.

It does not read real stores, write stores, execute cleanup, apply rollback, prove real cleanup safety, prove real rollback safety, add a public cleanup tool, prove broad write reliability, prove automatic degraded recovery, prove rollback readiness, prove runtime readiness, close governance, claim RC readiness, claim production readiness, or prove VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
