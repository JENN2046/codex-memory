const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'p55-evidence-to-runtime-enforcement-trace-v1.json');

const expectedSourceEvidenceIds = [
  'p52_schema_version_boundary_contract',
  'p52_runtime_schema_version_helper_contract',
  'p53_validation_aggregator_inventory_contract',
  'p53_validation_aggregator_static_posture',
  'p54_final_rc_safe_command_inventory',
  'p54_final_rc_command_result_contract',
  'p54_final_rc_execution_preflight_contract',
  'p54_final_rc_injected_executor_adapter_contract'
];

const expectedRuntimeGapIds = [
  'runtime_schema_version_boundary_enforcement',
  'validation_aggregator_live_evidence_collection',
  'final_rc_matrix_real_runner_execution',
  'governance_review_approval_audit_runtime_loop',
  'recall_isolation_runtime_proof',
  'migration_import_export_backup_restore_approval_execution',
  'http_observability_runtime_health_evidence'
];

const expectedFailClosedStates = [
  'missing',
  'unknown',
  'skipped',
  'warning',
  'warning_only',
  'failed',
  'stale',
  'ambiguous',
  'unparsable',
  'unsupported',
  'duplicate',
  'fixture_only'
];

const expectedPublicMcpTools = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

function readFixtureText() {
  return fs.readFileSync(fixturePath, 'utf8');
}

function loadFixture() {
  return JSON.parse(readFixtureText());
}

function ids(rows) {
  return rows.map(row => row.id);
}

test('P55 trace fixture locks top-level blocked posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p55-evidence-to-runtime-enforcement-trace-v1');
  assert.equal(fixture.policyVersion, 'p55-evidence-to-runtime-enforcement-policy-v1');
  assert.equal(fixture.manifestVersion, 'p55-evidence-to-runtime-enforcement-manifest-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.explicitInputOnly, true);
  assert.equal(fixture.traceOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.runtimeEnforcementImplemented, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.finalRcMatrixExecuted, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.rcReady, false);
  assert.deepEqual(fixture.publicMcpTools, expectedPublicMcpTools);
});

test('P55 trace fixture keeps source evidence exact and non-authoritative', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.sourceEvidence), expectedSourceEvidenceIds);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(Array.isArray(source.artifactRefs), true, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
    assert.equal(['P52', 'P53', 'P54'].includes(source.phase), true, source.id);
  }
});

test('P55 trace fixture keeps runtime gaps exact and blocked', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.runtimeGaps), expectedRuntimeGapIds);

  for (const gap of fixture.runtimeGaps) {
    assert.equal(gap.blocksRc, true, gap.id);
    assert.notEqual(gap.currentDisposition, 'enforced', gap.id);
    assert.notEqual(gap.currentDisposition, 'ready', gap.id);
    assert.equal(typeof gap.requiredRuntimeGate, 'string', gap.id);
    assert.equal(gap.requiredRuntimeGate.length > 0, true, gap.id);
  }
});

test('P55 trace links only known sources to known runtime gaps', () => {
  const fixture = loadFixture();
  const sourceIds = new Set(expectedSourceEvidenceIds);
  const gapIds = new Set(expectedRuntimeGapIds);

  assert.equal(fixture.traceLinks.length, 8);

  for (const link of fixture.traceLinks) {
    assert.equal(sourceIds.has(link.sourceEvidenceId), true, link.sourceEvidenceId);
    assert.equal(gapIds.has(link.runtimeGapId), true, link.runtimeGapId);
    assert.match(link.traceStatus, /not_|gap_known/);
  }
});

test('P55 trace fixture fails closed for insufficient or fixture-only evidence', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.failClosedStates, expectedFailClosedStates);
  assert.equal(fixture.failClosedStates.includes('warning_only'), true);
  assert.equal(fixture.failClosedStates.includes('fixture_only'), true);
  assert.equal(fixture.forbiddenClaims.includes('runtime_ready'), true);
  assert.equal(fixture.forbiddenClaims.includes('final_rc_matrix_ready'), true);
  assert.equal(fixture.forbiddenClaims.includes('v1_rc_ready'), true);
});

test('P55 trace fixture preserves A5 and no-touch boundaries', () => {
  const fixture = loadFixture();

  for (const action of [
    'real_memory_read',
    'real_memory_scan',
    'sqlite_scan',
    'execute_real_final_rc_runner',
    'start_service',
    'provider_call',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore_apply',
    'public_mcp_expansion',
    'durable_memory_write',
    'durable_audit_write',
    'push_tag_release_deploy'
  ]) {
    assert.equal(fixture.blockedActions.includes(action), true, action);
  }

  assert.equal(fixture.safety.readsFilesImplicitly, false);
  assert.equal(fixture.safety.scansDirectories, false);
  assert.equal(fixture.safety.executesCommands, false);
  assert.equal(fixture.safety.startsServices, false);
  assert.equal(fixture.safety.callsProviders, false);
  assert.equal(fixture.safety.readsRealMemory, false);
  assert.equal(fixture.safety.scansRuntimeStores, false);
  assert.equal(fixture.safety.writesDurableState, false);
  assert.equal(fixture.safety.expandsPublicMcp, false);
  assert.equal(fixture.safety.remoteWrites, false);
});

test('P55 trace fixture readiness stays local only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.readiness.localTraceContractReady, true);
  assert.equal(fixture.readiness.runtimeEnforcementReady, false);
  assert.equal(fixture.readiness.validationAggregatorFullImplementationReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
  assert.equal(fixture.readiness.pushReady, false);
  assert.equal(fixture.readiness.releaseReady, false);
  assert.equal(fixture.readiness.deployReady, false);
  assert.equal(fixture.readiness.configSwitchReady, false);
  assert.equal(fixture.readiness.watchdogReady, false);
});

test('P55 trace fixture does not expose raw secrets or raw workspace identifiers', () => {
  const text = readFixtureText().toLowerCase();

  for (const forbidden of [
    'authorization:',
    'bearer ',
    'api_key',
    'raw_workspace_id',
    'set-cookie',
    'password=',
    'token=',
    'providerapikey',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test('reading the P55 trace fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
