# P66.3 ValidationAggregator Runtime Gap Plan

Phase: `P66.3-validation-aggregator-runtime-gap-plan`

Mode: `A4.8 docs/fixture/test only`

Risk: `A1/A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Plan the next local-safe proof sequence for the seven remaining ValidationAggregator runtime gaps.

This phase is planning and fixture-test evidence only. It does not implement a runtime collector, read evidence files, execute gates, start live HTTP MCP, scan real memory or runtime stores, write durable memory or audit records, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Inputs

This plan follows:

- [P66 remaining runtime gap inventory refresh](/A:/codex-memory/docs/P66_REMAINING_RUNTIME_GAP_INVENTORY_REFRESH.md)
- [P66.1 full implementation definition](/A:/codex-memory/docs/P66_1_VALIDATION_AGGREGATOR_FULL_IMPLEMENTATION_DEFINITION.md)
- P66.2 ValidationAggregator static report-shape bridge

P63/P64 locally evidenced two gaps, but seven gaps remain open.

## Planned Gap Sequence

The fixture [p66-validation-aggregator-runtime-gap-plan-v1.json](/A:/codex-memory/tests/fixtures/p66-validation-aggregator-runtime-gap-plan-v1.json) locks this local planning sequence:

1. `validation_aggregator_full_implementation_incomplete`
2. `governance_review_approval_audit_runtime_loop_not_executed`
3. `recall_isolation_runtime_proof_not_executed`
4. `migration_import_export_backup_restore_approval_execution_blocked`
5. `live_http_operation_readiness_not_claimed`
6. `mainline_strict_gate_not_executed_for_cutover`
7. `rc_cutover_not_executed`

Each item must start as docs/fixture/test or pure explicit-input helper work unless a later phase receives separate explicit authorization for a higher-risk action.

## Local-Safe Evidence Rules

For every planned gap:

- required evidence must be explicit, sanitized, and source-bound
- missing required evidence keeps `validationAggregatorFullImplementation=false`
- unknown or stale evidence keeps `NOT_READY_BLOCKED`
- local helper evidence has no runtime authority by itself
- local runner evidence has no final-RC or cutover authority by itself
- A5 hard stops require separate explicit approval
- readiness claims must fail closed unless all required evidence and approvals are present

## Blocked Runtime and A5 Actions

P66.3 does not authorize:

- governance review/approval/audit runtime loop execution
- recall isolation runtime proof over real memory or runtime stores
- migration/import-export/backup/restore apply
- live HTTP MCP startup or operation-readiness claim
- cutover-context mainline strict gate execution
- RC cutover execution
- push, tag, release, or deploy
- provider calls
- durable memory or audit writes
- public MCP expansion
- `validate_memory` public exposure
- `.env`, secret, package, or lockfile changes
- `RC_READY`

## Validation Plan

Allowed validation for this phase:

- fixture parse
- targeted fixture test
- `npm test` when the targeted test passes
- `git diff --check`
- docs validation

Excluded validation:

- provider smoke or benchmark
- live HTTP startup
- startup/watchdog commands
- migration/import-export apply
- real memory preview or scan
- push, tag, release, deploy

## Result

Result: `P66_3_RUNTIME_GAP_PLAN_DEFINED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.4-validation-aggregator-gap-priority-fixture-tests
```

Chinese explanation: P66.4 should lock the first remaining gap's detailed fixture/test acceptance criteria. It should not execute runtime collection, read real memory, start services, or claim readiness.
