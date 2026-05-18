# P66.47 ValidationAggregator Migration Import Export Backup Restore Approval Gap Planning

Status: `PLANNING_ONLY`

Decision: `NOT_READY_BLOCKED`

## Purpose

P66.47 starts the fourth remaining P66.3 ValidationAggregator runtime gap:

```text
migration_import_export_backup_restore_approval_execution_blocked
```

This phase defines a local planning fixture and fixture test for future approval evidence around migration, import/export, backup, and restore work. It does not approve or execute any migration/import/export/backup/restore operation. It does not preview, export, import, read, or scan real memory. It does not read diary data, SQLite rows, vector index data, candidate cache data, or recall audit data. It does not write durable memory or audit records, execute commands, run gates or runners, start services, call providers, mutate config, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

The prior P66.46 closeout confirmed that the recall isolation local proof slice is complete, but that runtime gap remains open. P66.47 therefore moves to the next planned gap while preserving the same fail-closed posture.

## Scope

P66.47 adds:

- `tests/fixtures/p66-validation-aggregator-migration-import-export-backup-restore-approval-gap-plan-v1.json`
- `tests/p66-validation-aggregator-migration-import-export-backup-restore-approval-gap-plan-fixture.test.js`

The fixture records:

- selected gap id and priority
- P27/P39/P58/P62/P66.3 source-evidence references
- operation families that remain blocked
- approval framework stages
- approval states
- required approval evidence
- allowed future local work
- disallowed runtime and A5 actions
- fail-closed cases
- safety flags
- forbidden readiness claims

## Required Approval Evidence

Future phases must separately prove, with explicit A5 authorization where needed:

- `source_scope_evidence`
- `actor_scope_evidence`
- `operation_plan`
- `dry_run_report`
- `parity_report`
- `rollback_readiness_report`
- `backup_plan`
- `restore_plan`
- `redaction_report`
- `no_real_data_access_report`
- `explicit_a5_authorization_packet`
- `post_action_validation_plan`
- `failure_path_plan`

Every missing item fails closed. Missing, stale, unsupported, warning-only, scope-mismatched, or non-machine-readable approval evidence cannot be inferred from local planning evidence.

## Local-Only Next Work

Allowed next local work remains limited to:

- docs
- fixture
- test

The next recommended phase is:

```text
P66.48-validation-aggregator-migration-import-export-backup-restore-approval-fixture-tests
```

## Boundaries

P66.47 does not:

- approve migration/import/export/backup/restore
- execute migration/import/export/backup/restore
- preview, read, export, import, or scan real memory
- read diary data
- read SQLite rows
- read vector index data
- read candidate cache data
- read recall audit data
- write durable memory records
- write durable audit records
- execute commands, gates, or runners
- start services
- call providers
- mutate config
- perform startup/watchdog operations
- expand public MCP tools
- expose `validate_memory` publicly
- push, tag, release, or deploy

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

## Readiness

P66.47 preserves:

- `validationAggregatorFullImplementation=false`
- `approvalExecutionReady=false`
- `approvalExecuted=false`
- `migrationFrameworkReady=false`
- `migrationApplyReady=false`
- `importExportFrameworkReady=false`
- `importExportApplyReady=false`
- `backupRestoreFrameworkReady=false`
- `backupRestoreApplyReady=false`
- `migrationApplied=false`
- `importApplied=false`
- `exportApplied=false`
- `backupCreated=false`
- `restorePerformed=false`
- `realMemoryScanned=false`
- `runtimeStoreScanned=false`
- `durableMemoryWritten=false`
- `durableAuditWritten=false`
- `runtimeReady=false`
- `finalRcMatrixReady=false`
- `v1RcReady=false`
- `rcReady=false`
- `cutoverReady=false`

The release state remains `NOT_READY_BLOCKED`.

## Result

Result: `MIGRATION_IMPORT_EXPORT_BACKUP_RESTORE_APPROVAL_GAP_PLANNED_LOCAL_ONLY`

P66.47 is a docs/fixture/test planning phase only. It starts the migration/import-export/backup-restore approval gap track without closing the gap, executing runtime behavior, reading or writing real memory data, applying migration/import/export/backup/restore, or claiming readiness.
