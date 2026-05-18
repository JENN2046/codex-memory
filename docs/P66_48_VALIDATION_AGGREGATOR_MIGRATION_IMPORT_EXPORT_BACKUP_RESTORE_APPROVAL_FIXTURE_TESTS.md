# P66.48 ValidationAggregator Migration Import Export Backup Restore Approval Fixture Tests

Status: `FIXTURE_TESTS_ONLY`

Decision: `NOT_READY_BLOCKED`

## Purpose

P66.48 defines detailed local fixture/test acceptance criteria for the P66.47 migration/import-export/backup-restore approval gap:

```text
migration_import_export_backup_restore_approval_execution_blocked
```

This phase turns the P66.47 planning contract into a stricter machine-readable acceptance fixture. It does not approve or execute migration/import/export/backup/restore work. It does not preview, export, import, read, or scan real memory. It does not read diary data, SQLite rows, vector index data, candidate cache data, or recall audit data. It does not write durable memory or audit records, execute commands, run gates or runners, start services, call providers, mutate config, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Scope

P66.48 adds:

- `tests/fixtures/p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture-v1.json`
- `tests/p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture.test.js`

The fixture locks:

- selected gap identity and priority
- P66.47 source-plan binding
- operation-family acceptance cases
- approval-evidence acceptance cases
- approval-packet acceptance cases
- source boundary expectations
- fail-closed cases
- disallowed work
- A5 hard stops
- safety flags
- forbidden readiness claims

## Acceptance Cases

Every operation family remains non-executable:

```text
real_memory_preview
export
import
sqlite_migration_apply
import_export_apply
backup_creation
restore_overwrite
durable_report_write
package_script_wiring
public_mcp_expansion
provider_model_call
service_startup
remote_release_action
```

Every required approval-evidence group remains missing until a future separately authorized phase supplies explicit, machine-readable evidence. Missing, stale, unsupported, warning-only, scope-mismatched, non-machine-readable, real-data, durable-write, or readiness-claim evidence must fail closed.

## Controls

The fixture requires synthetic or sanitized-metadata source boundaries only. It rejects real memory content, real diary data, real SQLite rows, real vector index data, real candidate cache data, real recall audit data, operator free text, provider output, and any claim that approval execution is ready.

P66.48 only defines the acceptance contract. It does not run controls against real memory, runtime stores, providers, services, or remote systems.

## Boundaries

P66.48 does not:

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

## Readiness

P66.48 preserves:

- `validationAggregatorFullImplementation=false`
- `approvalAcceptanceReady=false`
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

## Validation

Required validation:

```text
node --check tests\p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture.test.js
node -e "JSON.parse(require('fs').readFileSync('tests/fixtures/p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture-v1.json','utf8'))"
node --test tests\p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Result: `MIGRATION_IMPORT_EXPORT_BACKUP_RESTORE_APPROVAL_ACCEPTANCE_FIXTURE_DEFINED`

P66.48 is a docs/fixture/test acceptance phase only. It strengthens local approval acceptance requirements for migration/import-export/backup-restore without approving or executing runtime behavior, scanning or writing real memory data, applying migration/import/export/backup/restore, or claiming readiness.
