const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p58-migration-import-export-backup-restore-approval-boundary-v1.json'
);

const expectedPublicMcpTools = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

const expectedAllowedSourceTypes = [
  'synthetic_fixture',
  'sanitized_metadata'
];

const expectedDeniedSourceTypes = [
  'real_memory_content',
  'real_diary',
  'real_sqlite',
  'real_vector_index',
  'real_candidate_cache',
  'real_recall_audit',
  'operator_free_text',
  'provider_output'
];

const expectedSourceEvidenceIds = [
  'p27_migration_import_export_approval_packet_contract',
  'p39_synthetic_migration_dry_run_contract',
  'p43_recall_migration_isolation_helper',
  'p55_evidence_runtime_trace_contract',
  'p57_recall_isolation_runtime_proof_helper'
];

const expectedStageIds = [
  'source_scope_review',
  'migration_plan_review',
  'import_export_plan_review',
  'backup_plan_review',
  'restore_plan_review',
  'parity_and_rollback_readiness_review',
  'approval_packet_review',
  'failure_path_review',
  'execution_gate'
];

const expectedApprovalStates = [
  'not_requested',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired',
  'approval_scope_mismatch',
  'reviewed_not_executable',
  'approved_but_a5_blocked'
];

const expectedApprovalEvidence = [
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

function readFixtureText() {
  return fs.readFileSync(fixturePath, 'utf8');
}

function loadFixture() {
  return JSON.parse(readFixtureText());
}

function ids(rows) {
  return rows.map(row => row.id);
}

test('P58 approval boundary fixture locks top-level blocked posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p58-migration-import-export-backup-restore-approval-boundary-v1');
  assert.equal(fixture.policyVersion, 'p58-approval-framework-policy-v1');
  assert.equal(fixture.manifestVersion, 'p58-approval-framework-manifest-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.dryRunOnly, true);
  assert.equal(fixture.boundaryInventoryOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.publicMcpTools, expectedPublicMcpTools);
});

test('P58 source types allow only synthetic fixtures or sanitized metadata', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.allowedSourceTypes, expectedAllowedSourceTypes);
  assert.deepEqual(fixture.deniedSourceTypes, expectedDeniedSourceTypes);
});

test('P58 fixture does not implement approval execution or data operations', () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.approvalFrameworkImplemented, false);
  assert.equal(fixture.approvalExecutionReady, false);
  assert.equal(fixture.approvalExecuted, false);
  assert.equal(fixture.migrationFrameworkReady, false);
  assert.equal(fixture.migrationApplyReady, false);
  assert.equal(fixture.importExportFrameworkReady, false);
  assert.equal(fixture.importExportApplyReady, false);
  assert.equal(fixture.backupRestoreFrameworkReady, false);
  assert.equal(fixture.backupRestoreApplyReady, false);
  assert.equal(fixture.migrationApplied, false);
  assert.equal(fixture.importApplied, false);
  assert.equal(fixture.exportApplied, false);
  assert.equal(fixture.backupCreated, false);
  assert.equal(fixture.restorePerformed, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.runtimeStoreScanned, false);
  assert.equal(fixture.durableMemoryWritten, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.providerCalls, 0);
});

test('P58 source evidence is exact and non-authoritative', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.sourceEvidence), expectedSourceEvidenceIds);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.executionAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P58 framework stages are exact and non-executable', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.frameworkStages), expectedStageIds);

  for (const stage of fixture.frameworkStages) {
    assert.equal(stage.executionAllowed, false, stage.id);
    assert.equal(stage.durableWriteAllowed, false, stage.id);
    assert.equal(stage.requiresExplicitA5Approval, true, stage.id);
    assert.equal(stage.inputMode, 'explicit_input', stage.id);
  }
});

test('P58 approval states never authorize execution', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.approvalStates), expectedApprovalStates);

  assert.equal(fixture.approvalStates[0].id, 'not_requested');
  assert.equal(fixture.approvalStates[0].acceptedForPlanning, true);

  for (const state of fixture.approvalStates) {
    assert.equal(state.executionAllowed, false, state.id);
  }

  for (const state of fixture.approvalStates.filter(state =>
    !['not_requested', 'reviewed_not_executable', 'approved_but_a5_blocked'].includes(state.id)
  )) {
    assert.equal(state.acceptedForPlanning, false, state.id);
  }

  assert.equal(
    fixture.approvalStates.find(state => state.id === 'reviewed_not_executable').acceptedForPlanning,
    true
  );
  assert.equal(
    fixture.approvalStates.find(state => state.id === 'approved_but_a5_blocked').acceptedForPlanning,
    true
  );
});

test('P58 required approval evidence is exact and unsatisfied', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredApprovalEvidence, expectedApprovalEvidence);
  assert.deepEqual(fixture.unsatisfiedApprovalEvidence, expectedApprovalEvidence);
});

test('P58 fail-closed states and blockers preserve A5 hard stops', () => {
  const fixture = loadFixture();

  for (const state of [
    'missing',
    'unknown',
    'warning_only',
    'failed',
    'stale',
    'unsupported',
    'duplicate',
    'approval_missing',
    'approval_unknown',
    'approval_warning_only',
    'approval_expired',
    'scope_mismatch',
    'source_scope_mismatch',
    'rollback_not_ready',
    'backup_unverified',
    'restore_unverified',
    'real_data_requested',
    'apply_requested'
  ]) {
    assert.equal(fixture.failClosedStates.includes(state), true, state);
  }

  for (const action of [
    'real_memory_read',
    'real_memory_export',
    'real_memory_import',
    'real_memory_scan',
    'diary_scan',
    'sqlite_scan',
    'vector_index_scan',
    'candidate_cache_scan',
    'recall_audit_scan',
    'sqlite_migration_apply',
    'import_apply',
    'export_apply',
    'backup_create',
    'restore_perform',
    'approval_execution',
    'durable_memory_write',
    'durable_audit_write',
    'provider_call',
    'public_mcp_expansion',
    'push_tag_release_deploy'
  ]) {
    assert.equal(fixture.blockedActions.includes(action), true, action);
  }
});

test('P58 readiness remains local boundary inventory only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.readiness.localBoundaryInventoryReady, true);
  assert.equal(fixture.readiness.approvalFrameworkReady, false);
  assert.equal(fixture.readiness.approvalExecutionReady, false);
  assert.equal(fixture.readiness.migrationFrameworkReady, false);
  assert.equal(fixture.readiness.importExportFrameworkReady, false);
  assert.equal(fixture.readiness.backupRestoreFrameworkReady, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
});

test('P58 safety flags forbid side effects and real data access', () => {
  const fixture = loadFixture();

  assert.equal(fixture.safety.readsFilesImplicitly, false);
  assert.equal(fixture.safety.scansDirectories, false);
  assert.equal(fixture.safety.executesCommands, false);
  assert.equal(fixture.safety.startsServices, false);
  assert.equal(fixture.safety.callsProviders, false);
  assert.equal(fixture.safety.readsRealMemory, false);
  assert.equal(fixture.safety.scansRuntimeStores, false);
  assert.equal(fixture.safety.writesDurableMemory, false);
  assert.equal(fixture.safety.writesDurableAudit, false);
  assert.equal(fixture.safety.expandsPublicMcp, false);
  assert.equal(fixture.safety.remoteWrites, false);
  assert.equal(fixture.safety.rawSensitiveOutputExposed, false);
});

test('P58 forbidden claims prevent readiness and apply overclaims', () => {
  const fixture = loadFixture();

  for (const claim of [
    'migration_framework_ready',
    'import_export_framework_ready',
    'backup_restore_framework_ready',
    'approval_execution_ready',
    'migration_apply_authorized',
    'import_export_apply_authorized',
    'backup_restore_authorized',
    'runtime_ready',
    'final_rc_matrix_ready',
    'v1_rc_ready'
  ]) {
    assert.equal(fixture.forbiddenClaims.includes(claim), true, claim);
  }
});

test('P58 fixture does not expose raw sensitive fragments', () => {
  const text = readFixtureText().toLowerCase();

  for (const forbidden of [
    'authorization:',
    'bearer ',
    'api_key',
    'raw_workspace_id',
    'providerapikey',
    'set-cookie',
    'token=',
    'password=',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test('reading the P58 fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
