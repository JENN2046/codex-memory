const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p62-v1-rc-cutover-preflight-boundary-v1.json'
);

const expectedPublicMcpTools = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

const expectedSourceEvidenceIds = [
  'p52_runtime_schema_version_enforcement_helper',
  'p53_validation_aggregator_inventory_and_posture',
  'p54_final_rc_runner_local_chain',
  'p56_governance_loop_boundary_helper',
  'p57_recall_isolation_runtime_proof_helper',
  'p58_migration_import_export_backup_restore_helper',
  'p59_http_observability_helper',
  'p60_no_touch_no_leak_redaction_regression',
  'p61_rc_evidence_report_helper'
];

const expectedPreflightGates = [
  'schema_version_runtime_enforcement_ready',
  'validation_aggregator_full_implementation_ready',
  'final_rc_matrix_runner_executed',
  'governance_review_approval_audit_loop_executable',
  'recall_isolation_runtime_proof_passed',
  'migration_import_export_backup_restore_approval_framework_ready',
  'http_runtime_observability_operation_hardened',
  'no_touch_no_leak_redaction_regression_passed',
  'mainline_strict_gate_passed',
  'rc_evidence_report_generated',
  'a5_authorizations_resolved',
  'cutover_release_controls_ready'
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

test('P62 cutover preflight boundary fixture locks top-level blocked posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p62-v1-rc-cutover-preflight-boundary-v1');
  assert.equal(fixture.policyVersion, 'p62-rc-cutover-preflight-policy-v1');
  assert.equal(fixture.manifestVersion, 'p62-rc-cutover-preflight-manifest-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.readOnly, true);
  assert.equal(fixture.boundaryInventoryOnly, true);
  assert.equal(fixture.preflightOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.publicMcpTools, expectedPublicMcpTools);
});

test('P62 fixture does not execute cutover, runner, gate, runtime, or remote actions', () => {
  const fixture = loadFixture();

  assert.equal(fixture.cutoverExecuted, false);
  assert.equal(fixture.mainlineStrictGateExecuted, false);
  assert.equal(fixture.finalRcRunnerExecuted, false);
  assert.equal(fixture.runtimeEvidenceCollected, false);
  assert.equal(fixture.rcReadyDeclared, false);
  assert.equal(fixture.tagCreated, false);
  assert.equal(fixture.releaseCreated, false);
  assert.equal(fixture.deployed, false);
  assert.equal(fixture.pushed, false);
  assert.equal(fixture.configSwitched, false);
  assert.equal(fixture.watchdogInstalled, false);
  assert.equal(fixture.startupInstalled, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.runtimeStoreScanned, false);
  assert.equal(fixture.durableMemoryWritten, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
});

test('P62 source evidence is exact and non-authoritative', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.sourceEvidence), expectedSourceEvidenceIds);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.cutoverAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P62 required preflight gates are exact and remain unsatisfied', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredPreflightGates, expectedPreflightGates);
  assert.deepEqual(fixture.unsatisfiedPreflightGates, expectedPreflightGates);
  assert.equal(fixture.unsatisfiedPreflightGates.includes('mainline_strict_gate_passed'), true);
  assert.equal(fixture.unsatisfiedPreflightGates.includes('rc_evidence_report_generated'), true);
  assert.equal(fixture.unsatisfiedPreflightGates.includes('a5_authorizations_resolved'), true);
  assert.equal(fixture.unsatisfiedPreflightGates.includes('cutover_release_controls_ready'), true);
});

test('P62 fail-closed states and blocked actions preserve cutover hard stops', () => {
  const fixture = loadFixture();

  for (const state of [
    'missing',
    'unknown',
    'skipped',
    'warning_only',
    'failed',
    'stale',
    'unsupported',
    'duplicate',
    'gate_not_executed',
    'rc_report_missing',
    'a5_authorization_missing',
    'cutover_authorization_missing',
    'readiness_overclaim',
    'release_action_requested'
  ]) {
    assert.equal(fixture.failClosedStates.includes(state), true, state);
  }

  for (const action of [
    'mainline_strict_gate_execute',
    'final_rc_runner_execute',
    'live_http_observe',
    'service_start',
    'watchdog_install',
    'config_switch',
    'provider_call',
    'real_memory_scan',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore_apply',
    'durable_memory_write',
    'durable_audit_write',
    'public_mcp_expansion',
    'push',
    'tag_create',
    'release_create',
    'deploy'
  ]) {
    assert.equal(fixture.blockedActions.includes(action), true, action);
  }
});

test('P62 readiness remains local boundary inventory only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.readiness.localBoundaryInventoryReady, true);
  assert.equal(fixture.readiness.cutoverPreflightReady, false);
  assert.equal(fixture.readiness.mainlineStrictGateReady, false);
  assert.equal(fixture.readiness.rcEvidenceReportReady, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
  assert.equal(fixture.readiness.pushReady, false);
  assert.equal(fixture.readiness.tagReady, false);
  assert.equal(fixture.readiness.releaseReady, false);
  assert.equal(fixture.readiness.deployReady, false);
  assert.equal(fixture.readiness.configSwitchReady, false);
  assert.equal(fixture.readiness.watchdogReady, false);
});

test('P62 fixture safety flags forbid side effects and real data access', () => {
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

test('P62 forbidden claims prevent RC_READY and cutover overclaims', () => {
  const fixture = loadFixture();

  for (const claim of [
    'rc_ready',
    'v1_rc_ready',
    'cutover_ready',
    'mainline_strict_gate_ready',
    'rc_evidence_report_ready',
    'final_rc_matrix_ready',
    'runtime_ready',
    'release_ready',
    'deploy_ready',
    'config_switch_ready',
    'watchdog_ready'
  ]) {
    assert.equal(fixture.forbiddenClaims.includes(claim), true, claim);
  }
});

test('P62 fixture does not expose raw sensitive fragments', () => {
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

test('reading the P62 fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
