const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-readiness-overclaim-rejection-proof-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('P66.32 fixture parses as readiness overclaim rejection proof and remains blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-readiness-overclaim-rejection-proof-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-readiness-overclaim-rejection-proof-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-readiness-overclaim-rejection-proof-manifest-v1');
  assert.equal(fixture.phase, 'P66.32-validation-aggregator-readiness-overclaim-rejection-proof');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.32 keeps the selected ValidationAggregator full-implementation gap open', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.32 defines readiness overclaim rejection without runtime authority', () => {
  assert.equal(fixture.evidenceGroup.id, 'readiness_overclaim_rejection_proof');
  assert.equal(fixture.evidenceGroup.priority, 8);
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenPartialEvidenceClaimsReady, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenStaticEvidenceClaimsRuntimeReady, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenA5BlockerClaimsCleared, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenRcReadyClaimDetected, true);
});

test('P66.32 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.32 keeps all implementation readiness and cutover claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
  assert.equal(fixture.cutoverReady, false);
});

test('P66.32 rejects every readiness claim with fail-closed status', () => {
  assert.equal(fixture.readinessClaims.length, 6);
  for (const readinessClaim of fixture.readinessClaims) {
    assert.equal(readinessClaim.allowed, false, readinessClaim.id);
    assert.match(readinessClaim.expectedStatus, /^blocked_/);
    assert.equal(readinessClaim.expectedDecision, 'NOT_READY_BLOCKED');
    assert.equal(readinessClaim.failClosed, true);
    assert.ok(readinessClaim.requiredMissingEvidence.length > 0, readinessClaim.id);
  }
});

test('P66.32 explicitly rejects RC_READY and cutover overclaims', () => {
  const rcReady = fixture.readinessClaims.find((claim) => claim.id === 'rc-ready');
  const cutoverReady = fixture.readinessClaims.find((claim) => claim.id === 'cutover-ready');

  assert.equal(rcReady.claim, 'RC_READY');
  assert.equal(rcReady.expectedStatus, 'blocked_rc_ready_overclaim');
  assert.ok(rcReady.requiredMissingEvidence.includes('explicit_rc_ready_authority'));
  assert.equal(cutoverReady.claim, 'cutoverReady=true');
  assert.equal(cutoverReady.expectedStatus, 'blocked_cutover_overclaim');
  assert.ok(cutoverReady.requiredMissingEvidence.includes('config_switch_approval'));
});

test('P66.32 runtime gap and A5 hard-stop counts keep readiness blocked', () => {
  assert.equal(fixture.runtimeGapStatus.remainingRuntimeGapCount, 7);
  assert.equal(fixture.runtimeGapStatus.allRuntimeGapsClosed, false);
  assert.equal(fixture.runtimeGapStatus.closedByThisPhase, 0);
  assert.equal(fixture.runtimeGapStatus.mustRemainBlockedWhenGapCountNonZero, true);
  assert.equal(fixture.a5HardStopStatus.remainingA5HardStopCount, 16);
  assert.equal(fixture.a5HardStopStatus.allA5HardStopsCleared, false);
  assert.equal(fixture.a5HardStopStatus.clearedByThisPhase, 0);
  assert.equal(fixture.a5HardStopStatus.mustRemainBlockedWhenHardStopCountNonZero, true);
});

test('P66.32 expected fail-closed report keeps all readiness fields false', () => {
  assert.equal(fixture.expectedFailClosedReport.accepted, false);
  assert.equal(fixture.expectedFailClosedReport.rejected, true);
  assert.equal(fixture.expectedFailClosedReport.failClosed, true);
  assert.equal(fixture.expectedFailClosedReport.readinessOverclaimCount, 6);
  assert.equal(fixture.expectedFailClosedReport.runtimeGapCount, 7);
  assert.equal(fixture.expectedFailClosedReport.a5HardStopCount, 16);
  assert.equal(fixture.expectedFailClosedReport.validationAggregatorFullImplementationReady, false);
  assert.equal(fixture.expectedFailClosedReport.runtimeReady, false);
  assert.equal(fixture.expectedFailClosedReport.finalRcMatrixReady, false);
  assert.equal(fixture.expectedFailClosedReport.v1RcReady, false);
  assert.equal(fixture.expectedFailClosedReport.rcReady, false);
  assert.equal(fixture.expectedFailClosedReport.cutoverReady, false);
  assert.equal(fixture.expectedFailClosedReport.canClaimRcReady, false);
  assert.equal(fixture.expectedFailClosedReport.canClaimCutoverReady, false);
});

test('P66.32 fail-closed cases cover runtime gaps A5 blockers public MCP and release actions', () => {
  for (const failClosedCase of [
    'missing_readiness_overclaim_rejection_proof',
    'partial_evidence_claims_validation_aggregator_full_implementation',
    'static_evidence_claims_runtime_ready',
    'fixture_evidence_claims_final_rc_matrix_ready',
    'stale_gate_evidence_claims_v1_rc_ready',
    'local_runner_evidence_claims_rc_ready',
    'runtime_gap_count_nonzero_claims_ready',
    'a5_hard_stop_count_nonzero_claims_ready',
    'public_mcp_expansion_claims_ready',
    'validate_memory_public_claims_ready',
    'config_switch_claims_cutover_ready',
    'startup_watchdog_claims_cutover_ready',
    'provider_call_claims_ready',
    'real_memory_preview_claims_ready',
    'durable_write_claims_ready',
    'migration_apply_claims_ready',
    'import_export_apply_claims_ready',
    'tag_release_deploy_claims_ready'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.32 allowed evidence posture does not become readiness posture', () => {
  assert.deepEqual(fixture.allowedEvidencePosture, [
    'fixture_acceptance_defined',
    'pure_helper_available',
    'static_report_shape_evidence',
    'sanitized_local_command_evidence_recorded'
  ]);
  for (const disallowed of [
    'runtime_collector_complete',
    'runtime_gap_zero_count',
    'a5_hard_stop_zero_count',
    'final_rc_matrix_ready',
    'v1_rc_ready',
    'rc_ready',
    'cutover_ready'
  ]) {
    assert.ok(fixture.disallowedReadinessPosture.includes(disallowed), disallowed);
  }
});

test('P66.32 low-risk summary excludes raw workspace ids secrets paths URLs and payloads', () => {
  assert.equal(fixture.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSecretExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSourcePayloadExposed, false);
  assert.deepEqual(fixture.lowRiskSummary.allowedFields, [
    'status',
    'decision',
    'fail_closed',
    'readiness_overclaim_count',
    'runtime_gap_count',
    'a5_hard_stop_count',
    'readiness_blocked'
  ]);
  for (const disallowed of [
    'raw_workspace_id',
    'raw_workspace_path',
    'raw_secret',
    'raw_token',
    'authorization_header',
    'provider_key',
    'absolute_path',
    'live_service_url',
    'real_memory_content',
    'durable_store_path',
    'raw_source_payload'
  ]) {
    assert.ok(fixture.lowRiskSummary.disallowedFields.includes(disallowed), disallowed);
  }
});

test('P66.32 disallowed work covers runtime provider data MCP release and cutover actions', () => {
  for (const disallowed of [
    'runtime_collector',
    'implicit_fixture_read',
    'evidence_file_read',
    'command_execution',
    'gate_execution',
    'runner_execution',
    'service_start',
    'provider_call',
    'real_memory_scan',
    'runtime_store_scan',
    'durable_memory_write',
    'durable_audit_write',
    'config_mutation',
    'startup_watchdog_operation',
    'migration_apply',
    'import_export_apply',
    'public_mcp_expansion',
    'validate_memory_public_exposure',
    'push',
    'tag',
    'release',
    'deploy',
    'rc_ready_claim',
    'cutover_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.32 safety flags preserve no-touch no-side-effect and no-release boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.32 forbidden claims keep readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.32 implements runtime evidence collection'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 reads evidence files'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 executes commands'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 starts services'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 calls providers'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 writes durable memory'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 changes public MCP tools'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 exposes validate_memory publicly'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 makes ValidationAggregator a full implementation'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 makes runtimeReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 makes finalRcMatrixReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 makes v1RcReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 authorizes cutover'));
  assert.ok(fixture.forbiddenClaims.includes('P66.32 authorizes push tag release deploy'));
});

test('P66.32 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.32 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
