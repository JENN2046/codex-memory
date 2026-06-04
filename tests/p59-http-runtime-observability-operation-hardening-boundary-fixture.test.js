const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p59-http-runtime-observability-operation-hardening-boundary-v1.json'
);

const expectedPublicMcpTools = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

const expectedSourceEvidenceIds = [
  'p46_http_no_token_mutation_redaction_tests',
  'p50_no_touch_boundary_regression',
  'p54_runner_allowlisted_execution_adapter',
  'p58_approval_framework_helper'
];

const expectedSurfaceIds = [
  'http_health_endpoint',
  'mcp_initialize',
  'tools_list_public_mcp_freeze',
  'http_observe_cli',
  'no_token_mutation_guard',
  'bearer_mutation_guard',
  'failure_reporting',
  'safe_start_preflight',
  'safe_shutdown_preflight'
];

const expectedRuntimeEvidence = [
  'http_health_evidence',
  'mcp_initialize_evidence',
  'tools_list_public_mcp_freeze_evidence',
  'no_token_mutation_rejection_evidence',
  'bearer_token_mutation_guard_evidence',
  'failure_reporting_evidence',
  'redaction_evidence',
  'no_service_install_evidence',
  'no_config_switch_evidence',
  'no_provider_call_evidence',
  'safe_start_preflight_evidence',
  'safe_shutdown_preflight_evidence',
  'machine_readable_operation_report'
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

test('P59 HTTP boundary fixture locks top-level blocked posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p59-http-runtime-observability-operation-hardening-boundary-v1');
  assert.equal(fixture.policyVersion, 'p59-http-observability-policy-v1');
  assert.equal(fixture.manifestVersion, 'p59-http-observability-manifest-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.readOnly, true);
  assert.equal(fixture.boundaryInventoryOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.publicMcpTools, expectedPublicMcpTools);
});

test('P59 fixture does not observe runtime or perform operations', () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeObserved, false);
  assert.equal(fixture.httpServiceStarted, false);
  assert.equal(fixture.httpServiceStopped, false);
  assert.equal(fixture.watchdogInstalled, false);
  assert.equal(fixture.startupInstalled, false);
  assert.equal(fixture.configSwitched, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.runtimeStoreScanned, false);
  assert.equal(fixture.durableMemoryWritten, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
});

test('P59 source evidence is exact and non-authoritative', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.sourceEvidence), expectedSourceEvidenceIds);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.operationAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P59 observability surfaces are exact, read-only, and not executed', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.observabilitySurfaces), expectedSurfaceIds);

  for (const surface of fixture.observabilitySurfaces) {
    assert.equal(surface.readOnly, true, surface.id);
    assert.equal(surface.executedInThisPhase, false, surface.id);
    assert.equal(surface.canClaimRuntimeReady, false, surface.id);
  }
});

test('P59 required runtime evidence is exact and unsatisfied', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredRuntimeEvidence, expectedRuntimeEvidence);
  assert.deepEqual(fixture.unsatisfiedRuntimeEvidence, expectedRuntimeEvidence);
});

test('P59 fail-closed states and blockers preserve operation hard stops', () => {
  const fixture = loadFixture();

  for (const state of [
    'missing',
    'unknown',
    'warning_only',
    'failed',
    'stale',
    'unsupported',
    'duplicate',
    'health_unavailable',
    'auth_boundary_unknown',
    'redaction_uncertain',
    'service_start_requested',
    'watchdog_install_requested',
    'config_switch_requested',
    'provider_call_requested'
  ]) {
    assert.equal(fixture.failClosedStates.includes(state), true, state);
  }

  for (const action of [
    'service_start',
    'service_stop',
    'watchdog_install',
    'startup_install',
    'config_switch',
    'env_secret_edit',
    'provider_call',
    'real_memory_scan',
    'durable_memory_write',
    'durable_audit_write',
    'public_mcp_expansion',
    'push_tag_release_deploy'
  ]) {
    assert.equal(fixture.blockedActions.includes(action), true, action);
  }
});

test('P59 readiness remains local boundary inventory only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.readiness.localBoundaryInventoryReady, true);
  assert.equal(fixture.readiness.httpRuntimeObserved, false);
  assert.equal(fixture.readiness.operationHardeningReady, false);
  assert.equal(fixture.readiness.safeStartPreflightReady, false);
  assert.equal(fixture.readiness.safeShutdownPreflightReady, false);
  assert.equal(fixture.readiness.watchdogReady, false);
  assert.equal(fixture.readiness.configSwitchReady, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
});

test('P59 safety flags forbid side effects and real data access', () => {
  const fixture = loadFixture();

  assert.equal(fixture.safety.readsFilesImplicitly, false);
  assert.equal(fixture.safety.scansDirectories, false);
  assert.equal(fixture.safety.executesCommands, false);
  assert.equal(fixture.safety.startsServices, false);
  assert.equal(fixture.safety.stopsServices, false);
  assert.equal(fixture.safety.installsWatchdog, false);
  assert.equal(fixture.safety.installsStartup, false);
  assert.equal(fixture.safety.callsProviders, false);
  assert.equal(fixture.safety.readsRealMemory, false);
  assert.equal(fixture.safety.scansRuntimeStores, false);
  assert.equal(fixture.safety.writesDurableMemory, false);
  assert.equal(fixture.safety.writesDurableAudit, false);
  assert.equal(fixture.safety.expandsPublicMcp, false);
  assert.equal(fixture.safety.remoteWrites, false);
  assert.equal(fixture.safety.rawSensitiveOutputExposed, false);
});

test('P59 forbidden claims prevent operation and RC overclaims', () => {
  const fixture = loadFixture();

  for (const claim of [
    'http_operation_ready',
    'safe_start_ready',
    'safe_shutdown_ready',
    'watchdog_ready',
    'config_switch_ready',
    'runtime_ready',
    'final_rc_matrix_ready',
    'v1_rc_ready'
  ]) {
    assert.equal(fixture.forbiddenClaims.includes(claim), true, claim);
  }
});

test('P59 fixture does not expose raw sensitive fragments', () => {
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

test('reading the P59 fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
