const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const OPERATION_FAMILIES = [
  'real_memory_preview',
  'export',
  'import',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_creation',
  'restore_overwrite',
  'durable_report_write',
  'package_script_wiring',
  'public_mcp_expansion',
  'provider_model_call',
  'service_startup',
  'remote_release_action'
];

const APPROVAL_EVIDENCE = [
  'source_scope_evidence',
  'actor_scope_evidence',
  'operation_plan',
  'dry_run_report',
  'parity_report',
  'rollback_readiness_report',
  'backup_plan',
  'restore_plan',
  'redaction_report',
  'no_real_data_access_report',
  'explicit_a5_authorization_packet',
  'post_action_validation_plan',
  'failure_path_plan'
];

const APPROVAL_PACKETS = [
  'realMemoryPreview',
  'export',
  'import',
  'sqliteMigrationApply',
  'importExportApply',
  'backupCreation',
  'restoreOverwrite',
  'durableReportWrite',
  'packageScriptWiring',
  'publicMcpExpansion',
  'providerModelCall',
  'serviceStartup',
  'remoteReleaseAction'
];

const ALLOWED_SOURCE_TYPES = [
  'synthetic_fixture',
  'sanitized_metadata',
  'committed_fixture_reference'
];

const DENIED_SOURCE_TYPES = [
  'real_memory_content',
  'real_diary',
  'real_sqlite',
  'real_vector_index',
  'real_candidate_cache',
  'real_recall_audit',
  'operator_free_text',
  'provider_output',
  'runtime_service_output'
];

const A5_HARD_STOPS = [
  'push',
  'tag_create',
  'release_create',
  'deploy',
  'config_switch',
  'watchdog_install',
  'startup_install',
  'provider_call',
  'real_memory_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
  'rc_ready_claim'
];

function ids(rows) {
  return rows.map(row => row.id);
}

test('P66.48 migration approval fixture locks top-level blocked posture', () => {
  assert.equal(
    fixture.schemaVersion,
    'p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture-v1'
  );
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-migration-import-export-backup-restore-approval-fixture-manifest-v1'
  );
  assert.equal(
    fixture.phase,
    'P66.48-validation-aggregator-migration-import-export-backup-restore-approval-fixture-tests'
  );
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.48 selects only the migration import export backup restore approval gap', () => {
  assert.equal(
    fixture.selectedGap.id,
    'migration_import_export_backup_restore_approval_execution_blocked'
  );
  assert.equal(fixture.selectedGap.priority, 4);
  assert.equal(fixture.selectedGap.currentStatus, 'a5_blocked');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.48 binds back to P66.47 without granting authority', () => {
  assert.equal(
    fixture.sourcePlan.phase,
    'P66.47-validation-aggregator-migration-import-export-backup-restore-approval-gap-planning'
  );
  assert.equal(
    fixture.sourcePlan.fixture,
    'tests/fixtures/p66-validation-aggregator-migration-import-export-backup-restore-approval-gap-plan-v1.json'
  );
  assert.equal(fixture.sourcePlan.runtimeAuthority, false);
  assert.equal(fixture.sourcePlan.readinessAuthority, false);
  assert.equal(fixture.sourcePlan.executionAuthority, false);
});

test('P66.48 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.48 keeps approval migration import export backup restore and readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'approvalAcceptanceReady',
    'approvalExecutionReady',
    'approvalExecuted',
    'migrationFrameworkReady',
    'migrationApplyReady',
    'importExportFrameworkReady',
    'importExportApplyReady',
    'backupRestoreFrameworkReady',
    'backupRestoreApplyReady',
    'migrationApplied',
    'importApplied',
    'exportApplied',
    'backupCreated',
    'restorePerformed',
    'realMemoryScanned',
    'runtimeStoreScanned',
    'durableMemoryWritten',
    'durableAuditWritten',
    'runtimeReady',
    'finalRcMatrixReady',
    'v1RcReady',
    'rcReady',
    'cutoverReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('P66.48 source boundaries allow only synthetic or sanitized committed references', () => {
  assert.deepEqual(fixture.allowedSourceTypes, ALLOWED_SOURCE_TYPES);
  assert.deepEqual(fixture.deniedSourceTypes, DENIED_SOURCE_TYPES);
});

test('P66.48 operation-family acceptance cases are exact and non-executable', () => {
  assert.deepEqual(ids(fixture.operationFamilyAcceptanceCases), OPERATION_FAMILIES);

  for (const row of fixture.operationFamilyAcceptanceCases) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.currentStatus, 'acceptance_defined_not_runtime_executed', row.id);
    assert.equal(row.requiresExplicitA5Approval, true, row.id);
    assert.equal(row.executionAllowed, false, row.id);
    assert.equal(row.realDataAccessAllowed, false, row.id);
    assert.equal(row.durableWriteAllowed, false, row.id);
    assert.equal(row.mustFailClosedWhenRequested, true, row.id);
  }
});

test('P66.48 approval-evidence acceptance cases are exact and missing by default', () => {
  assert.deepEqual(ids(fixture.approvalEvidenceAcceptanceCases), APPROVAL_EVIDENCE);

  for (const row of fixture.approvalEvidenceAcceptanceCases) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.currentStatus, 'missing', row.id);
    assert.equal(row.machineReadableRequired, true, row.id);
    assert.equal(row.syntheticOrSanitizedOnly, true, row.id);
    assert.equal(row.mustFailClosedWhenMissing, true, row.id);
  }
});

test('P66.48 approval packets are exact and blocked pending explicit approval', () => {
  assert.deepEqual(fixture.approvalPacketAcceptanceCases, APPROVAL_PACKETS);
  assert.equal(fixture.approvalPacketRules.required, true);
  assert.equal(fixture.approvalPacketRules.status, 'blocked_pending_explicit_approval');
  assert.equal(fixture.approvalPacketRules.executionAllowed, false);
  assert.equal(fixture.approvalPacketRules.runtimeAuthority, false);
  assert.equal(fixture.approvalPacketRules.readinessAuthority, false);
  assert.equal(fixture.approvalPacketRules.mustFailClosedWhenPacketMissing, true);
  assert.equal(fixture.approvalPacketRules.mustFailClosedWhenPacketScopeMismatched, true);
  assert.equal(fixture.approvalPacketRules.mustFailClosedWhenPacketWarningOnly, true);
});

test('P66.48 fail-closed cases cover set drift approvals data access apply and readiness failures', () => {
  for (const failClosedCase of [
    'missing_operation_family',
    'duplicate_operation_family',
    'unknown_operation_family',
    'operation_execution_requested',
    'real_data_access_requested',
    'durable_write_requested',
    'missing_approval_evidence',
    'duplicate_approval_evidence',
    'unknown_approval_evidence',
    'non_machine_readable_evidence',
    'unsupported_source_type',
    'denied_source_type',
    'missing_approval_packet',
    'approval_missing',
    'approval_unknown',
    'approval_warning_only',
    'approval_expired',
    'approval_scope_mismatch',
    'rollback_not_ready',
    'backup_unverified',
    'restore_unverified',
    'apply_requested',
    'real_memory_preview_requested',
    'sqlite_migration_apply_requested',
    'provider_call_requested',
    'service_start_requested',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.48 disallowed work covers real data reads apply execution durable writes MCP and release actions', () => {
  for (const disallowed of [
    'real_memory_read',
    'real_memory_preview',
    'real_memory_export',
    'real_memory_import',
    'real_memory_scan',
    'diary_scan',
    'sqlite_scan',
    'vector_index_scan',
    'candidate_cache_scan',
    'recall_audit_scan',
    'sqlite_migration_apply',
    'migration_apply',
    'import_apply',
    'export_apply',
    'import_export_apply',
    'backup_create',
    'restore_perform',
    'backup_restore_apply',
    'approval_execution',
    'durable_memory_writer',
    'durable_audit_writer',
    'public_mcp_expansion',
    'validate_memory_public_exposure',
    'provider_call',
    'service_start',
    'config_mutation',
    'startup_watchdog_operation',
    'push',
    'tag',
    'release',
    'deploy',
    'rc_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.48 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.48 accepted future local work remains docs fixture and test only', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test'
  ]);

  for (const disallowed of [
    'pure_explicit_input_helper',
    'static_report_shape_bridge',
    'approval_execution',
    'real_memory_scan',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore_apply'
  ]) {
    assert.equal(fixture.acceptedFutureLocalWork.includes(disallowed), false, disallowed);
  }
});

test('P66.48 safety flags forbid runtime provider data config MCP package secret remote and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.48 forbidden claims keep apply execution approval readiness and RC readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.48 approves migration import export backup or restore'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 executes migration import export backup or restore'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 reads previews exports imports or scans real memory'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 writes durable memory or audit records'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 makes approvalAcceptanceReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 makes approvalExecutionReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 closes migration_import_export_backup_restore_approval_execution_blocked'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.48 authorizes push tag release deploy'));
});

test('P66.48 next phase remains local closeout and not helper bridge or runtime execution', () => {
  assert.equal(
    fixture.nextRecommendedPhase,
    'P66.49-validation-aggregator-migration-import-export-backup-restore-approval-local-closeout'
  );
});

test('P66.48 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
  assert.doesNotMatch(fixtureText, /authorization\s*:/i);
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /password\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /token\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /set-cookie/i);
  assert.doesNotMatch(fixtureText, /(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
  assert.doesNotMatch(fixtureText, /https?:\/\//i);
});

test('P66.48 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
