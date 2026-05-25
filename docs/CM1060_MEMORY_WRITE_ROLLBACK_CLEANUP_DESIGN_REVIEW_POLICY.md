# CM-1060 Memory Write Rollback Cleanup Design Review Policy

Status: `COMPLETED_VALIDATED_ROLLBACK_CLEANUP_DESIGN_REVIEW_POLICY_NOT_EXECUTED_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1060 consumes the CM-1059 rollback cleanup plan boundary and adds a fail-closed policy for the design review itself.

The policy makes the next cleanup review step machine-checkable before any real cleanup, rollback, public MCP expansion, config change, dependency change, or readiness claim can occur.

## Change

- Added `src/core/MemoryWriteRollbackCleanupDesignReviewPolicy.js`.
- Added `tests/memory-write-rollback-cleanup-design-review-policy.test.js`.
- No public MCP tool, runtime source entry, package, config, watchdog, startup, provider, real cleanup, real rollback, true memory store, durable audit, or durable projection change was made.

## Design Review Boundary

The helper accepts only explicit caller-provided input.

It requires an accepted CM-1059 plan boundary report and then requires the cleanup design review to stay in `design_review_only` mode with scope `memory_id_and_store_kind_scoped`.

The required review sequence is exact:

- `identify_exact_memory_id`
- `preview_projection_targets`
- `preview_candidate_cache_entries`
- `preview_reconcile_tasks_by_memory_id_and_store_kind`
- `verify_diary_audit_retention`
- `require_runtime_validation_plan`
- `stop_before_apply`

The only reviewable cleanup target stores are:

- `sqlite_shadow_record`
- `vector_index_record`
- `candidate_cache_entries`
- `reconcile_queue_tasks`

The retained stores must remain:

- `diary_record`
- `write_audit_log`

The policy accepts only when the review also requires exact memory-id handling, store-kind handling for partial residuals, unrelated-memory-id preservation, dry-run preview, operator receipt, separate apply approval, separate diary/audit policy, runtime validation before apply, and stop-before-apply.

It fails closed on cleanup execution, rollback apply, diary deletion by default, audit rewrite, public MCP expansion, config/watchdog/startup change, dependency change, real cleanup safety claim, real rollback safety claim, write reliability claim, readiness claim, malformed counters, or unknown positive counters.

## Validation

- `node --check .\src\core\MemoryWriteRollbackCleanupDesignReviewPolicy.js` passed.
- `node --check .\tests\memory-write-rollback-cleanup-design-review-policy.test.js` passed.
- `node --test .\tests\memory-write-rollback-cleanup-design-review-policy.test.js` passed `6/6`.
- Adjacent rollback cleanup/reconcile/MCP regression bundle passed `54/54`.
- Full `npm test` passed `2520/2520`.

## Result

CM-1060 is completed and validated as a rollback cleanup design-review policy.

It allows a future stage to review a proposed cleanup design only when the design is memory-id/store-kind scoped, preview-first, diary/audit retaining, and stopped before apply.

It does not execute cleanup, apply rollback, prove real cleanup safety, prove real rollback safety, add a public cleanup tool, prove broad write reliability, prove automatic degraded recovery, prove rollback readiness, prove runtime readiness, close governance, claim RC readiness, claim production readiness, or prove VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
