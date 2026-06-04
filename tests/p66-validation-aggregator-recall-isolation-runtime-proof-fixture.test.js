const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const ISOLATED_RECORD_FAMILIES = [
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

const PROOF_SURFACES = [
  'normal_recall_namespace',
  'vector_index',
  'candidate_cache',
  'ranking',
  'projection',
  'user_visible_audit_summary',
  'recall_audit_summary'
];

const REQUIRED_RUNTIME_EVIDENCE = [
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

test('P66.43 recall isolation fixture locks top-level blocked posture', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-policy-v1');
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.43-validation-aggregator-recall-isolation-runtime-proof-fixture-tests');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.43 selects only the recall isolation runtime proof gap', () => {
  assert.equal(fixture.selectedGap.id, 'recall_isolation_runtime_proof_not_executed');
  assert.equal(fixture.selectedGap.priority, 3);
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.43 binds back to P66.42 without granting authority', () => {
  assert.equal(fixture.sourcePlan.phase, 'P66.42-validation-aggregator-recall-isolation-runtime-proof-gap-planning');
  assert.equal(
    fixture.sourcePlan.fixture,
    'tests/fixtures/p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-v1.json'
  );
  assert.equal(fixture.sourcePlan.runtimeAuthority, false);
  assert.equal(fixture.sourcePlan.readinessAuthority, false);
});

test('P66.43 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.43 keeps recall proof, runtime, final RC, and cutover readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'recallIsolationRuntimeProofReady',
    'recallIsolationRuntimeProofExecuted',
    'contaminationReportReady',
    'contaminationReportProduced',
    'realMemoryScanned',
    'runtimeStoreScanned',
    'runtimeReady',
    'finalRcMatrixReady',
    'v1RcReady',
    'rcReady',
    'cutoverReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('P66.43 isolated record-family acceptance cases are exact and fail-closed', () => {
  assert.deepEqual(
    fixture.isolatedRecordFamilyAcceptanceCases.map(row => row.id),
    ISOLATED_RECORD_FAMILIES
  );

  for (const row of fixture.isolatedRecordFamilyAcceptanceCases) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.currentStatus, 'acceptance_defined_not_runtime_executed', row.id);
    assert.equal(row.mustBeExcludedFromAllProofSurfaces, true, row.id);
    assert.equal(row.mustFailClosedWhenObserved, true, row.id);
  }
});

test('P66.43 proof-surface acceptance cases are exact and forbid real data evidence', () => {
  assert.deepEqual(fixture.proofSurfaceAcceptanceCases.map(row => row.id), PROOF_SURFACES);

  for (const row of fixture.proofSurfaceAcceptanceCases) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.runtimeStoreReadAllowed, false, row.id);
    assert.equal(row.contaminationAllowed, false, row.id);
    assert.equal(row.syntheticEvidenceAllowed, true, row.id);
    assert.equal(row.realDataEvidenceAllowed, false, row.id);
    assert.equal(row.futureEvidenceRequired, true, row.id);
  }
});

test('P66.43 control cases distinguish positive and negative recall behavior', () => {
  const positive = fixture.controlCases.find(row => row.id === 'active_in_scope_user_memory_positive_control');
  const negative = fixture.controlCases.find(row => row.id === 'isolated_record_negative_controls');

  assert.equal(positive.recordFamily, 'active_in_scope_user_memory');
  for (const field of [
    'mayEnterNormalRecall',
    'mayEnterVectorIndex',
    'mayEnterCandidateCache',
    'mayEnterRanking',
    'mayEnterProjection',
    'mayEnterUserVisibleAuditSummary',
    'mayEnterRecallAuditSummary'
  ]) {
    assert.equal(positive[field], true, field);
  }

  assert.deepEqual(negative.recordFamilies, ISOLATED_RECORD_FAMILIES);
  for (const field of [
    'mayEnterNormalRecall',
    'mayEnterVectorIndex',
    'mayEnterCandidateCache',
    'mayEnterRanking',
    'mayEnterProjection',
    'mayEnterUserVisibleAuditSummary',
    'mayEnterRecallAuditSummary'
  ]) {
    assert.equal(negative[field], false, field);
  }
});

test('P66.43 required runtime evidence groups are exact and missing by default', () => {
  assert.deepEqual(fixture.requiredRuntimeEvidenceGroups.map(row => row.id), REQUIRED_RUNTIME_EVIDENCE);

  for (const row of fixture.requiredRuntimeEvidenceGroups) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.currentStatus, 'missing', row.id);
    assert.equal(row.mustFailClosedWhenMissing, true, row.id);
  }
});

test('P66.43 fail-closed cases cover set drift, contamination, unsafe scans, durable writes, and readiness failures', () => {
  for (const failClosedCase of [
    'missing_isolated_record_family',
    'duplicate_isolated_record_family',
    'unknown_isolated_record_family',
    'missing_proof_surface',
    'duplicate_proof_surface',
    'unknown_proof_surface',
    'missing_required_runtime_evidence',
    'duplicate_runtime_evidence',
    'unknown_runtime_evidence',
    'missing_positive_control',
    'missing_negative_control',
    'isolated_record_contaminates_normal_recall',
    'isolated_record_contaminates_vector_index',
    'isolated_record_contaminates_candidate_cache',
    'isolated_record_contaminates_recall_audit_summary',
    'positive_control_missing_from_normal_recall',
    'real_memory_scan_claim',
    'runtime_store_scan_claim',
    'contamination_report_from_real_data_claim',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.43 disallowed work covers real memory, runtime stores, durable writes, MCP, and release actions', () => {
  for (const disallowed of [
    'real_memory_read',
    'real_memory_scan',
    'diary_scan',
    'sqlite_scan',
    'vector_index_scan',
    'candidate_cache_scan',
    'recall_audit_scan',
    'runtime_recall_execution',
    'runtime_store_scan',
    'contamination_report_from_real_data',
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

test('P66.43 safety flags forbid runtime, provider, data, config, MCP, package, secret, remote, and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.43 forbidden claims keep recall isolation runtime proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.43 proves recall isolation runtime'));
  assert.ok(fixture.forbiddenClaims.includes('P66.43 executes recall isolation runtime proof'));
  assert.ok(fixture.forbiddenClaims.includes('P66.43 scans real memory'));
  assert.ok(fixture.forbiddenClaims.includes('P66.43 closes recall_isolation_runtime_proof_not_executed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.43 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.43 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.43 authorizes push tag release deploy'));
});

test('P66.43 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.43 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
