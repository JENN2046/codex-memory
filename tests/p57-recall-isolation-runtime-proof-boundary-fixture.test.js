const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'p57-recall-isolation-runtime-proof-boundary-v1.json');

const expectedPublicMcpTools = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

const expectedSourceEvidenceIds = [
  'p38_recall_isolation_fixture',
  'p43_recall_migration_isolation_helper',
  'p55_evidence_runtime_trace_contract',
  'p56_governance_loop_boundary_contract'
];

const expectedRecordFamilies = [
  'governance_records',
  'validation_transcripts',
  'redaction_samples',
  'policy_decisions',
  'readiness_reports',
  'migration_metadata',
  'blocked_memory',
  'tombstoned_memory',
  'out_of_scope_memory'
];

const expectedProofSurfaces = [
  'normal_recall_namespace',
  'vector_index',
  'candidate_cache',
  'ranking',
  'projection',
  'user_visible_audit_summary',
  'recall_audit_summary'
];

const expectedRuntimeProofEvidence = [
  'synthetic_runtime_harness_plan',
  'instrumented_namespace_assertions',
  'vector_exclusion_assertions',
  'candidate_cache_exclusion_assertions',
  'ranking_exclusion_assertions',
  'projection_exclusion_assertions',
  'user_visible_audit_summary_exclusion_assertions',
  'recall_audit_summary_exclusion_assertions',
  'negative_controls_for_isolated_record_families',
  'positive_control_for_active_in_scope_user_memory',
  'no_durable_write_evidence',
  'no_public_mcp_expansion_evidence',
  'machine_readable_contamination_report'
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

test('P57 runtime proof boundary fixture locks top-level blocked posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p57-recall-isolation-runtime-proof-boundary-v1');
  assert.equal(fixture.policyVersion, 'p57-recall-isolation-runtime-proof-policy-v1');
  assert.equal(fixture.manifestVersion, 'p57-recall-isolation-runtime-proof-manifest-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.boundaryInventoryOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.publicMcpTools, expectedPublicMcpTools);
});

test('P57 fixture does not implement or execute runtime proof', () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.runtimeProofImplemented, false);
  assert.equal(fixture.runtimeProofExecuted, false);
  assert.equal(fixture.recallIsolationRuntimeReady, false);
  assert.equal(fixture.contaminationReportProduced, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.runtimeStoreScanned, false);
  assert.equal(fixture.durableMemoryWritten, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.providerCalls, 0);
});

test('P57 source evidence is exact and non-authoritative', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.sourceEvidence), expectedSourceEvidenceIds);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P57 isolated record families are exact and target runtime proof only', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.isolatedRecordFamilies, expectedRecordFamilies);

  for (const family of expectedRecordFamilies) {
    assert.equal(fixture.isolatedRecordFamilies.includes(family), true, family);
  }
});

test('P57 proof surfaces are exact and forbid runtime store reads in this phase', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.proofSurfaces), expectedProofSurfaces);

  for (const surface of fixture.proofSurfaces) {
    assert.equal(surface.runtimeStoreReadAllowed, false, surface.id);
    assert.equal(surface.contaminationAllowed, false, surface.id);
    assert.equal(surface.futureEvidenceRequired, true, surface.id);
  }
});

test('P57 controls distinguish positive user memory from governance pollution', () => {
  const fixture = loadFixture();
  const positive = fixture.controls.find(control => control.id === 'active_in_scope_user_memory_positive_control');
  const negative = fixture.controls.find(control => control.id === 'governance_record_negative_control');

  assert.equal(positive.recordFamily, 'active_in_scope_user_memory');
  assert.equal(positive.mayEnterNormalRecall, true);
  assert.equal(positive.mayEnterVectorIndex, true);
  assert.equal(positive.mayEnterCandidateCache, true);
  assert.equal(positive.mayEnterRanking, true);
  assert.equal(positive.mayEnterProjection, true);
  assert.equal(positive.mayEnterUserVisibleAuditSummary, true);

  assert.equal(negative.recordFamily, 'governance_records');
  assert.equal(negative.mayEnterNormalRecall, false);
  assert.equal(negative.mayEnterVectorIndex, false);
  assert.equal(negative.mayEnterCandidateCache, false);
  assert.equal(negative.mayEnterRanking, false);
  assert.equal(negative.mayEnterProjection, false);
  assert.equal(negative.mayEnterUserVisibleAuditSummary, false);
});

test('P57 required runtime proof evidence is exact and fully unsatisfied', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredRuntimeProofEvidence, expectedRuntimeProofEvidence);
  assert.deepEqual(fixture.unsatisfiedRuntimeProofEvidence, expectedRuntimeProofEvidence);
});

test('P57 fail-closed states and blockers preserve A5 hard stops', () => {
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
    'contaminated',
    'runtime_store_scan_requested',
    'real_memory_scan_requested'
  ]) {
    assert.equal(fixture.failClosedStates.includes(state), true, state);
  }

  for (const action of [
    'real_memory_read',
    'real_memory_scan',
    'diary_scan',
    'sqlite_scan',
    'vector_index_scan',
    'candidate_cache_scan',
    'recall_audit_scan',
    'runtime_recall_execution',
    'runtime_store_scan',
    'durable_memory_write',
    'durable_audit_write',
    'public_mcp_expansion',
    'provider_call',
    'service_start',
    'config_switch',
    'watchdog_install',
    'push_tag_release_deploy'
  ]) {
    assert.equal(fixture.blockedActions.includes(action), true, action);
  }
});

test('P57 readiness remains local boundary inventory only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.readiness.localBoundaryInventoryReady, true);
  assert.equal(fixture.readiness.runtimeProofReady, false);
  assert.equal(fixture.readiness.recallIsolationRuntimeReady, false);
  assert.equal(fixture.readiness.contaminationReportReady, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
  assert.equal(fixture.readiness.pushReady, false);
  assert.equal(fixture.readiness.releaseReady, false);
  assert.equal(fixture.readiness.deployReady, false);
});

test('P57 safety flags forbid side effects and real data access', () => {
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

test('P57 forbidden claims prevent runtime-ready and RC-ready overclaims', () => {
  const fixture = loadFixture();

  for (const claim of [
    'recall_isolation_runtime_proven',
    'runtime_proof_executed',
    'real_memory_scan_authorized',
    'candidate_cache_checked_with_real_data',
    'recall_audit_checked_with_real_data',
    'runtime_ready',
    'final_rc_matrix_ready',
    'v1_rc_ready'
  ]) {
    assert.equal(fixture.forbiddenClaims.includes(claim), true, claim);
  }
});

test('P57 fixture does not expose raw sensitive fragments', () => {
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

test('reading the P57 fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
