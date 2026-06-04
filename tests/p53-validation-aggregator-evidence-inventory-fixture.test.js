const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p53-validation-aggregator-evidence-inventory-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_SOURCE_CLASSES = [
  'committed_evidence',
  'local_validation',
  'runtime_evidence',
  'final_rc_matrix_evidence'
];

const REQUIRED_SOURCE_TYPES = [
  'committed_code_contract',
  'committed_doc_contract',
  'committed_fixture_contract',
  'committed_helper_contract',
  'committed_test_contract',
  'local_validation_log',
  'local_git_commit',
  'explicit_input_evidence',
  'static_aggregator_report_shape',
  'runtime_boundary_report',
  'final_rc_matrix_report'
];

const REQUIRED_STATUS_SEMANTICS = [
  'fresh',
  'stale',
  'missing',
  'unsupported',
  'blocked',
  'not_executed'
];

test('P53 inventory fixture parses as inventory-only planning evidence', () => {
  assert.equal(fixture.schemaVersion, 'p53-validation-aggregator-evidence-inventory-v1');
  assert.equal(fixture.policyVersion, 'p53-validation-aggregator-inventory-policy-v1');
  assert.equal(fixture.manifestVersion, 'p53-validation-aggregator-inventory-manifest-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P53-T1-validation-aggregator-evidence-inventory');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.inventoryOnly, true);
  assert.equal(fixture.sourceMode, 'committed_fixture');
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P53 inventory does not claim full aggregator implementation, runtime readiness, or RC readiness', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.aggregatorExecutesInventory, false);
  assert.equal(fixture.runnerExecuted, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.rcReady, false);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
});

test('P53 source classes are exact and non-authoritative for readiness', () => {
  assert.deepEqual(fixture.sourceClasses.map(entry => entry.id), REQUIRED_SOURCE_CLASSES);

  for (const sourceClass of fixture.sourceClasses) {
    assert.equal(sourceClass.runtimeAuthority, false, sourceClass.id);
    assert.equal(sourceClass.readinessAuthority, false, sourceClass.id);
  }
});

test('P53 accepted source types are an exact allowlist', () => {
  assert.deepEqual(fixture.acceptedSourceTypes, REQUIRED_SOURCE_TYPES);

  for (const row of fixture.inventoryRows) {
    if (row.status === 'unsupported') {
      assert.equal(fixture.acceptedSourceTypes.includes(row.sourceType), false, row.id);
      assert.equal(row.acceptedForPlanning, false, row.id);
    } else {
      assert.equal(fixture.acceptedSourceTypes.includes(row.sourceType), true, row.id);
    }
  }
});

test('P53 status semantics cover fresh, stale, missing, unsupported, blocked, and not_executed exactly', () => {
  const statusMap = new Map(fixture.statusSemantics.map(entry => [entry.id, entry]));

  assert.deepEqual([...statusMap.keys()], REQUIRED_STATUS_SEMANTICS);
  assert.equal(statusMap.get('fresh').criticalGateDisposition, 'can_support_planning_only');
  assert.equal(statusMap.get('fresh').readinessAuthority, false);

  for (const status of REQUIRED_STATUS_SEMANTICS.filter(item => item !== 'fresh')) {
    const entry = statusMap.get(status);
    assert.equal(entry.criticalGateDisposition, 'fail_closed', status);
    assert.equal(entry.blocksV1Rc, true, status);
    assert.equal(entry.readinessAuthority, false, status);
  }
});

test('P53 inventory rows distinguish committed, local, runtime, and fresh evidence', () => {
  const rows = new Map(fixture.inventoryRows.map(row => [row.id, row]));

  assert.equal(rows.get('validation_aggregator_current_report_shape').committedEvidence, true);
  assert.equal(rows.get('validation_aggregator_current_report_shape').freshEvidence, true);
  assert.equal(rows.get('p52_local_validation_result').localEvidence, true);
  assert.equal(rows.get('p52_local_validation_result').freshEvidence, true);
  assert.equal(rows.get('schema_version_runtime_enforcement').runtimeEvidence, false);
  assert.equal(rows.get('schema_version_runtime_enforcement').status, 'missing');
  assert.equal(rows.get('final_rc_matrix_runner_execution').status, 'not_executed');
  assert.equal(rows.get('governance_review_approval_audit_runtime_loop').status, 'blocked');
  assert.equal(rows.get('stale_validation_log_example').status, 'stale');

  for (const row of fixture.inventoryRows) {
    assert.equal(row.readinessAuthority, false, row.id);
    if (row.status !== 'fresh') {
      assert.equal(row.acceptedForPlanning, false, row.id);
      assert.equal(row.freshEvidence, false, row.id);
    }
  }
});

test('P53 current committed inventory rows point only at safe artifact references', () => {
  const committedRows = fixture.inventoryRows.filter(row => row.committedEvidence);

  assert.ok(committedRows.length >= 4);
  for (const row of committedRows) {
    assert.ok(row.artifactRefs.length > 0, row.id);
    assert.equal(row.runtimeEvidence, false, row.id);
    assert.equal(row.readinessAuthority, false, row.id);
    assert.ok(row.artifactRefs.every(ref => ref.startsWith('src/') || ref.startsWith('tests/')), row.id);
  }
});

test('P53 required gaps and blocked actions preserve honest blockers', () => {
  for (const gap of [
    'schema_version_runtime_enforcement_missing',
    'validation_aggregator_full_implementation_incomplete',
    'final_rc_matrix_runner_not_executed',
    'runtime_governance_loop_blocked',
    'runtime_recall_isolation_unproven',
    'migration_import_export_backup_restore_approval_framework_missing',
    'http_runtime_observability_evidence_missing'
  ]) {
    assert.ok(fixture.requiredGaps.includes(gap), gap);
  }

  for (const action of [
    'execute_final_rc_matrix_runner',
    'read_real_memory_content',
    'scan_runtime_stores',
    'start_service',
    'call_provider',
    'public_mcp_expansion',
    'durable_memory_write',
    'durable_audit_write',
    'migration_import_export_apply',
    'backup_restore_apply',
    'push_tag_release_deploy'
  ]) {
    assert.ok(fixture.blockedActions.includes(action), action);
  }
});

test('P53 safety flags forbid collection, execution, mutation, provider, config, and remote writes', () => {
  for (const flag of [
    'noImplicitFileDiscovery',
    'noDirectoryScan',
    'noCommandExecution',
    'noServiceStart',
    'noProviderCall',
    'noConfigMutation',
    'noDependencyChange',
    'noPublicMcpExpansion',
    'noRealMemoryRead',
    'noRuntimeStoreScan',
    'noMigrationApply',
    'noBackupRestore',
    'noDurableMemoryWrite',
    'noDurableAuditWrite',
    'noRemoteWrite'
  ]) {
    assert.equal(fixture.safety[flag], true, flag);
  }
});

test('P53 required wording and forbidden claims prevent runtime-ready overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('inventory contract only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('support planning only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('fails closed')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not execute')));
  assert.ok(fixture.requiredWording.some(line => line.includes('NOT_READY_BLOCKED')));
  assert.ok(fixture.forbiddenClaims.includes('P53 implements the full ValidationAggregator'));
  assert.ok(fixture.forbiddenClaims.includes('P53 executes the final RC matrix runner'));
  assert.ok(fixture.forbiddenClaims.includes('P53 makes v1.0 RC ready'));
});

test('P53 fixture text does not expose raw secrets, workspace ids, URLs, or absolute paths', () => {
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

test('P53 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
