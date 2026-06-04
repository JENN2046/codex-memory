const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-migration-import-export-backup-restore-approval-gap-plan-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const SOURCE_EVIDENCE = [
  'p27_migration_import_export_approval_packet_contract',
  'p39_synthetic_migration_dry_run_contract',
  'p58_migration_import_export_backup_restore_approval_boundary_inventory',
  'p62_a5_runtime_authorization_precondition_matrix',
  'p66_runtime_gap_plan'
];

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

const FRAMEWORK_STAGES = [
  'source_scope_review',
  'operation_plan_review',
  'dry_run_evidence_review',
  'parity_and_rollback_readiness_review',
  'backup_restore_plan_review',
  'redaction_and_no_real_data_access_review',
  'explicit_a5_authorization_packet_review',
  'post_action_validation_plan_review',
  'execution_gate'
];

const APPROVAL_STATES = [
  'not_requested',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired',
  'approval_scope_mismatch',
  'reviewed_not_executable',
  'approved_but_a5_blocked'
];

const REQUIRED_APPROVAL_EVIDENCE = [
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

test('P66.47 migration approval gap plan parses as planning-only and blocked', () => {
  assert.equal(
    fixture.schemaVersion,
    'p66-validation-aggregator-migration-import-export-backup-restore-approval-gap-plan-v1'
  );
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-migration-import-export-backup-restore-approval-gap-plan-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-migration-import-export-backup-restore-approval-gap-plan-manifest-v1'
  );
  assert.equal(
    fixture.phase,
    'P66.47-validation-aggregator-migration-import-export-backup-restore-approval-gap-planning'
  );
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.47 selects only the migration import export backup restore approval gap', () => {
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

test('P66.47 keeps recall isolation local proof complete while runtime gap remains open', () => {
  assert.equal(fixture.priorGapLocalProofReview.id, 'recall_isolation_runtime_proof_not_executed');
  assert.equal(fixture.priorGapLocalProofReview.localProofSlicesComplete, true);
  assert.equal(fixture.priorGapLocalProofReview.runtimeGapStillOpen, true);
  assert.equal(fixture.priorGapLocalProofReview.readinessAuthority, false);
});

test('P66.47 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.47 keeps approval execution migration import export backup restore and readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
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

test('P66.47 source evidence is exact and non-authoritative', () => {
  assert.deepEqual(ids(fixture.sourceEvidence), SOURCE_EVIDENCE);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.executionAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P66.47 operation families are exact but do not authorize operations', () => {
  assert.deepEqual(fixture.operationFamilies, OPERATION_FAMILIES);
});

test('P66.47 framework stages are exact and non-executable', () => {
  assert.deepEqual(ids(fixture.frameworkStages), FRAMEWORK_STAGES);

  for (const stage of fixture.frameworkStages) {
    assert.equal(stage.inputMode, 'explicit_input', stage.id);
    assert.equal(stage.executionAllowed, false, stage.id);
    assert.equal(stage.durableWriteAllowed, false, stage.id);
    assert.equal(stage.requiresExplicitA5Approval, true, stage.id);
  }
});

test('P66.47 approval states never authorize execution', () => {
  assert.deepEqual(ids(fixture.approvalStates), APPROVAL_STATES);

  for (const state of fixture.approvalStates) {
    assert.equal(state.executionAllowed, false, state.id);
  }

  for (const state of fixture.approvalStates.filter(state =>
    !['not_requested', 'reviewed_not_executable', 'approved_but_a5_blocked'].includes(state.id)
  )) {
    assert.equal(state.acceptedForPlanning, false, state.id);
  }
});

test('P66.47 required approval evidence is exact and fully unsatisfied', () => {
  assert.deepEqual(fixture.requiredApprovalEvidence, REQUIRED_APPROVAL_EVIDENCE);
  assert.deepEqual(fixture.unsatisfiedApprovalEvidence, REQUIRED_APPROVAL_EVIDENCE);
});

test('P66.47 accepted future local work excludes helpers runtime scans and apply actions', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test'
  ]);

  for (const disallowed of [
    'pure_explicit_input_helper',
    'static_report_shape_bridge',
    'real_memory_scan',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore_apply'
  ]) {
    assert.equal(fixture.acceptedFutureLocalWork.includes(disallowed), false, disallowed);
  }
});

test('P66.47 disallowed work covers data reads apply execution durable writes MCP and release actions', () => {
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

test('P66.47 fail-closed cases cover missing evidence approval drift unsafe data and readiness failures', () => {
  for (const failClosedCase of [
    'missing_source_scope_evidence',
    'missing_actor_scope_evidence',
    'missing_operation_plan',
    'missing_dry_run_report',
    'missing_parity_report',
    'missing_rollback_readiness_report',
    'missing_backup_plan',
    'missing_restore_plan',
    'missing_explicit_a5_authorization_packet',
    'approval_missing',
    'approval_unknown',
    'approval_warning_only',
    'approval_expired',
    'approval_scope_mismatch',
    'source_scope_mismatch',
    'rollback_not_ready',
    'backup_unverified',
    'restore_unverified',
    'real_data_requested',
    'apply_requested',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.47 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.47 safety flags forbid runtime provider data config MCP package secret remote and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.47 forbidden claims keep apply execution and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.47 approves migration import export backup or restore'));
  assert.ok(fixture.forbiddenClaims.includes('P66.47 executes migration import export backup or restore'));
  assert.ok(fixture.forbiddenClaims.includes('P66.47 reads previews exports imports or scans real memory'));
  assert.ok(fixture.forbiddenClaims.includes('P66.47 writes durable memory or audit records'));
  assert.ok(fixture.forbiddenClaims.includes('P66.47 closes migration_import_export_backup_restore_approval_execution_blocked'));
  assert.ok(fixture.forbiddenClaims.includes('P66.47 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.47 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.47 authorizes push tag release deploy'));
});

test('P66.47 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.47 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
