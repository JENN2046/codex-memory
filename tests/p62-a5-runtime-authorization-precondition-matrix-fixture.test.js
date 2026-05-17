const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p62-a5-runtime-authorization-precondition-matrix-v1.json'
);

const expectedEvidenceIds = [
  'runtime_schema_version_enforcement_proof',
  'validation_aggregator_full_evidence_report',
  'final_rc_matrix_execution_report',
  'governance_runtime_loop_evidence',
  'recall_isolation_runtime_proof',
  'migration_import_export_backup_restore_readiness',
  'http_operation_observability_evidence',
  'mainline_strict_gate_rc_evidence'
];

const expectedAuthorizationActions = [
  'push',
  'tag_create',
  'release_create',
  'deploy',
  'config_switch',
  'watchdog_install',
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

function readFixtureText() {
  return fs.readFileSync(fixturePath, 'utf8');
}

function loadFixture() {
  return JSON.parse(readFixtureText());
}

test('P62 authorization precondition matrix locks blocked planning posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p62-a5-runtime-authorization-precondition-matrix-v1');
  assert.equal(fixture.policyVersion, 'p62-authorization-precondition-policy-v1');
  assert.equal(fixture.manifestVersion, 'p62-authorization-precondition-manifest-v1');
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.readOnly, true);
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.authorizationGranted, false);
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P62 authorization precondition matrix requires each missing runtime evidence item exactly once', () => {
  const fixture = loadFixture();
  const evidenceIds = fixture.preAuthorizationEvidence.map((item) => item.id);

  assert.deepEqual(evidenceIds, expectedEvidenceIds);
  assert.equal(new Set(evidenceIds).size, expectedEvidenceIds.length);

  for (const item of fixture.preAuthorizationEvidence) {
    assert.equal(item.required, true, item.id);
    assert.equal(item.currentStatus === 'satisfied', false, item.id);
    assert.equal(item.acceptedEvidenceTypes.length > 0, true, item.id);
    assert.equal(item.blockedBy.length > 0, true, item.id);
  }
});

test('P62 authorization precondition matrix requires separate explicit approval for each A5 action', () => {
  const fixture = loadFixture();
  const actionIds = fixture.authorizationActions.map((action) => action.id);

  assert.deepEqual(actionIds, expectedAuthorizationActions);
  assert.equal(new Set(actionIds).size, expectedAuthorizationActions.length);

  for (const action of fixture.authorizationActions) {
    assert.equal(action.risk, 'A5-hard-stop', action.id);
    assert.equal(action.requiresSeparateExplicitApproval, true, action.id);
    assert.equal(action.granted, false, action.id);
    assert.equal(action.doesNotAuthorize.length > 0, true, action.id);
  }
});

test('P62 authorization precondition matrix forbids bundled approvals', () => {
  const fixture = loadFixture();

  for (const bundledApproval of [
    'push_implies_release',
    'release_implies_deploy',
    'deploy_implies_config_switch',
    'config_switch_implies_watchdog_install',
    'provider_call_implies_runtime_ready',
    'real_memory_scan_implies_export_or_migration',
    'dry_run_implies_apply',
    'local_evidence_implies_rc_ready',
    'rc_ready_claim_implies_tag_or_release'
  ]) {
    assert.equal(fixture.forbiddenBundledApprovals.includes(bundledApproval), true, bundledApproval);
  }
});

test('P62 authorization precondition matrix fails closed for unsafe evidence and authorization states', () => {
  const fixture = loadFixture();

  for (const state of [
    'unknown_authorization',
    'missing_authorization',
    'ambiguous_authorization',
    'bundled_authorization',
    'stale_evidence',
    'warning_only_evidence',
    'skipped_critical_gate',
    'unsupported_evidence_type',
    'unparsable_evidence',
    'duplicate_authorization_action',
    'runtime_claim_without_runtime_report'
  ]) {
    assert.equal(fixture.failClosedStates.includes(state), true, state);
  }
});

test('P62 authorization precondition matrix preserves public MCP freeze and forbidden claims', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.publicMcpTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);

  for (const claim of [
    'authorization_granted',
    'runtime_ready',
    'final_rc_matrix_ready',
    'rc_ready',
    'v1_rc_ready',
    'cutover_ready',
    'release_ready',
    'deploy_ready',
    'config_switch_ready',
    'watchdog_ready'
  ]) {
    assert.equal(fixture.forbiddenClaims.includes(claim), true, claim);
  }
});

test('P62 authorization precondition matrix readiness remains planning-only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.readiness.authorizationMatrixReady, true);
  assert.equal(fixture.readiness.authorizationGranted, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
  assert.equal(fixture.readiness.cutoverReady, false);
  assert.equal(fixture.readiness.pushReady, false);
  assert.equal(fixture.readiness.tagReady, false);
  assert.equal(fixture.readiness.releaseReady, false);
  assert.equal(fixture.readiness.deployReady, false);
  assert.equal(fixture.readiness.configSwitchReady, false);
  assert.equal(fixture.readiness.watchdogReady, false);
});

test('P62 authorization precondition matrix safety flags forbid side effects and real data access', () => {
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

test('P62 authorization precondition matrix fixture does not expose raw sensitive fragments', () => {
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

test('reading the P62 authorization precondition matrix fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
