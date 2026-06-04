const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const SOURCE_EVIDENCE = [
  'p38_recall_isolation_fixture',
  'p43_recall_migration_isolation_helper',
  'p55_evidence_runtime_trace_contract',
  'p57_recall_isolation_runtime_proof_boundary_inventory'
];

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

const REQUIRED_RUNTIME_PROOF_EVIDENCE = [
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

test('P66.42 recall isolation runtime proof gap plan parses as planning-only and blocked', () => {
  assert.equal(
    fixture.schemaVersion,
    'p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-v1'
  );
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.42-validation-aggregator-recall-isolation-runtime-proof-gap-planning');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.42 selects only the recall isolation runtime proof gap', () => {
  assert.equal(fixture.selectedGap.id, 'recall_isolation_runtime_proof_not_executed');
  assert.equal(fixture.selectedGap.priority, 3);
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.42 keeps governance loop local proof complete while runtime gap remains open', () => {
  assert.equal(fixture.priorGapLocalProofReview.id, 'governance_review_approval_audit_runtime_loop_not_executed');
  assert.equal(fixture.priorGapLocalProofReview.localProofSlicesComplete, true);
  assert.equal(fixture.priorGapLocalProofReview.runtimeGapStillOpen, true);
  assert.equal(fixture.priorGapLocalProofReview.readinessAuthority, false);
});

test('P66.42 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.42 keeps recall proof, runtime, final RC, and cutover readiness false', () => {
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

test('P66.42 source evidence is exact and non-authoritative', () => {
  assert.deepEqual(fixture.sourceEvidence.map(source => source.id), SOURCE_EVIDENCE);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P66.42 isolated record families are exact and planning-only', () => {
  assert.deepEqual(fixture.isolatedRecordFamilies, ISOLATED_RECORD_FAMILIES);
});

test('P66.42 proof surfaces are exact and forbid runtime store reads in this phase', () => {
  assert.deepEqual(fixture.proofSurfaces.map(surface => surface.id), PROOF_SURFACES);

  for (const surface of fixture.proofSurfaces) {
    assert.equal(surface.runtimeStoreReadAllowed, false, surface.id);
    assert.equal(surface.contaminationAllowed, false, surface.id);
    assert.equal(surface.futureEvidenceRequired, true, surface.id);
  }
});

test('P66.42 controls distinguish positive user memory from isolated record families', () => {
  const positive = fixture.controls.find(control => control.id === 'active_in_scope_user_memory_positive_control');
  const negative = fixture.controls.find(control => control.id === 'isolated_record_negative_controls');

  assert.equal(positive.recordFamily, 'active_in_scope_user_memory');
  assert.equal(positive.mayEnterNormalRecall, true);
  assert.equal(positive.mayEnterVectorIndex, true);
  assert.equal(positive.mayEnterCandidateCache, true);
  assert.equal(positive.mayEnterRanking, true);
  assert.equal(positive.mayEnterProjection, true);
  assert.equal(positive.mayEnterUserVisibleAuditSummary, true);
  assert.equal(positive.mayEnterRecallAuditSummary, true);

  assert.deepEqual(negative.recordFamilies, ISOLATED_RECORD_FAMILIES);
  assert.equal(negative.mayEnterNormalRecall, false);
  assert.equal(negative.mayEnterVectorIndex, false);
  assert.equal(negative.mayEnterCandidateCache, false);
  assert.equal(negative.mayEnterRanking, false);
  assert.equal(negative.mayEnterProjection, false);
  assert.equal(negative.mayEnterUserVisibleAuditSummary, false);
  assert.equal(negative.mayEnterRecallAuditSummary, false);
});

test('P66.42 required runtime proof evidence is exact and fully unsatisfied', () => {
  assert.deepEqual(fixture.requiredRuntimeProofEvidence, REQUIRED_RUNTIME_PROOF_EVIDENCE);
  assert.deepEqual(fixture.unsatisfiedRuntimeProofEvidence, REQUIRED_RUNTIME_PROOF_EVIDENCE);
});

test('P66.42 accepted future local work excludes runtime scans and side-effect actions', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test',
    'pure_explicit_input_helper',
    'static_report_shape_bridge'
  ]);

  for (const disallowed of ['real_memory_scan', 'runtime_store_scan', 'runtime_recall_execution', 'provider_call']) {
    assert.ok(!fixture.acceptedFutureLocalWork.includes(disallowed), disallowed);
  }
});

test('P66.42 disallowed work covers real memory, runtime stores, durable writes, MCP, and release actions', () => {
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

test('P66.42 fail-closed cases cover missing evidence, contamination, unsafe scans, and readiness failures', () => {
  for (const failClosedCase of [
    'missing_namespace_assertions',
    'missing_vector_exclusion_assertions',
    'missing_candidate_cache_exclusion_assertions',
    'missing_ranking_exclusion_assertions',
    'missing_projection_exclusion_assertions',
    'missing_user_visible_audit_summary_assertions',
    'missing_recall_audit_summary_assertions',
    'missing_negative_controls',
    'missing_positive_control',
    'contaminated_recall_namespace',
    'contaminated_vector_index',
    'contaminated_candidate_cache',
    'contaminated_recall_audit_summary',
    'real_memory_scan_claim',
    'runtime_store_scan_claim',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.42 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.42 safety flags forbid runtime, provider, data, config, MCP, package, secret, remote, and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.42 forbidden claims keep recall isolation runtime proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.42 proves recall isolation runtime'));
  assert.ok(fixture.forbiddenClaims.includes('P66.42 executes recall isolation runtime proof'));
  assert.ok(fixture.forbiddenClaims.includes('P66.42 scans real memory'));
  assert.ok(fixture.forbiddenClaims.includes('P66.42 closes recall_isolation_runtime_proof_not_executed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.42 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.42 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.42 authorizes push tag release deploy'));
});

test('P66.42 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.42 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
