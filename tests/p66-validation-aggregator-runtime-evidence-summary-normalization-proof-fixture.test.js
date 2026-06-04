const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_SUMMARY_FIELDS = [
  'status',
  'decision',
  'runnerExecuted',
  'commandsExecuted',
  'localRuntimeEvidenceMatrixExecuted',
  'allowlistedFinalRcEvidenceRunnerExecuted',
  'criticalGates',
  'locallyEvidencedRuntimeGaps',
  'remainingRuntimeGaps',
  'safety'
];

test('P66.16 fixture parses as runtime evidence summary normalization proof and remains blocked', () => {
  assert.equal(
    fixture.schemaVersion,
    'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-v1'
  );
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.16-validation-aggregator-runtime-evidence-summary-normalization-proof');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.16 keeps the selected ValidationAggregator full-implementation gap open', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.16 defines runtime evidence summary normalization without runtime authority', () => {
  assert.equal(fixture.evidenceGroup.id, 'runtime_evidence_summary_normalization_proof');
  assert.equal(fixture.evidenceGroup.priority, 4);
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenUnsafe, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenOverclaiming, true);
});

test('P66.16 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.16 keeps all full implementation and readiness claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.16 required summary fields are exact and explicit', () => {
  assert.deepEqual(fixture.requiredSummaryFields, REQUIRED_SUMMARY_FIELDS);
});

test('P66.16 normalization contract is explicit sanitized summary only', () => {
  assert.equal(fixture.normalizationContract.sourceMode, 'explicit_sanitized_summary_only');
  assert.equal(fixture.normalizationContract.readsFiles, false);
  assert.equal(fixture.normalizationContract.executesCommands, false);
  assert.equal(fixture.normalizationContract.startsServices, false);
  assert.equal(fixture.normalizationContract.callsProviders, false);
  assert.equal(fixture.normalizationContract.mutatesDurableState, false);
  assert.equal(fixture.normalizationContract.acceptsRealMemoryPreview, false);
  assert.equal(fixture.normalizationContract.acceptsRuntimeReadyClaim, false);
  assert.equal(fixture.normalizationContract.acceptsFinalRcReadyClaim, false);
  assert.equal(fixture.normalizationContract.acceptsV1RcReadyClaim, false);
  assert.equal(fixture.normalizationContract.commandsExecutedByAggregator, false);
});

test('P66.16 accepted synthetic summary stays local and non-authoritative', () => {
  assert.equal(fixture.acceptedInputSummary.status, 'passed');
  assert.equal(fixture.acceptedInputSummary.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedInputSummary.runnerExecuted, true);
  assert.equal(fixture.acceptedInputSummary.commandsExecuted, true);
  assert.equal(fixture.acceptedInputSummary.localRuntimeEvidenceMatrixExecuted, true);
  assert.equal(fixture.acceptedInputSummary.allowlistedFinalRcEvidenceRunnerExecuted, true);
  assert.equal(fixture.acceptedInputSummary.runtimeReady, false);
  assert.equal(fixture.acceptedInputSummary.finalRcMatrixReady, false);
  assert.equal(fixture.acceptedInputSummary.fullFinalRcMatrixExecuted, false);
  assert.equal(fixture.acceptedInputSummary.v1RcReady, false);
  assert.equal(fixture.acceptedInputSummary.rcReady, false);
});

test('P66.16 expected normalized summary counts local evidence and remaining gaps', () => {
  assert.equal(fixture.expectedNormalizedSummary.status, 'explicit_runtime_evidence_summary_available');
  assert.equal(fixture.expectedNormalizedSummary.accepted, true);
  assert.equal(fixture.expectedNormalizedSummary.rejected, false);
  assert.equal(fixture.expectedNormalizedSummary.sourceStatus, 'passed');
  assert.equal(fixture.expectedNormalizedSummary.sourceDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.expectedNormalizedSummary.criticalGateCount, 12);
  assert.equal(fixture.expectedNormalizedSummary.criticalGatePassedCount, 12);
  assert.equal(fixture.expectedNormalizedSummary.criticalGateFailedCount, 0);
  assert.equal(fixture.expectedNormalizedSummary.locallyEvidencedRuntimeGapCount, 2);
  assert.equal(fixture.expectedNormalizedSummary.remainingRuntimeGapCount, 7);
});

test('P66.16 normalized summary forbids aggregator command execution and readiness claims', () => {
  assert.equal(fixture.expectedNormalizedSummary.commandsExecutedByAggregator, false);
  assert.equal(fixture.expectedNormalizedSummary.finalRcMatrixExecutedBySource, false);
  assert.equal(fixture.expectedNormalizedSummary.fullFinalRcMatrixExecutedBySource, false);
  assert.equal(fixture.expectedNormalizedSummary.finalRcMatrixReady, false);
  assert.equal(fixture.expectedNormalizedSummary.runtimeReady, false);
  assert.equal(fixture.expectedNormalizedSummary.v1RcReady, false);
  assert.equal(fixture.expectedNormalizedSummary.rcReady, false);
  assert.equal(fixture.expectedNormalizedSummary.canClaimRuntimeReady, false);
  assert.equal(fixture.expectedNormalizedSummary.canClaimFinalRcReady, false);
  assert.equal(fixture.expectedNormalizedSummary.canClaimV1RcReady, false);
});

test('P66.16 fail-closed cases cover invalid unsafe sensitive and overclaim states', () => {
  for (const failClosedCase of [
    'missing_summary',
    'invalid_summary_shape',
    'sensitive_fragment_rejected',
    'unsafe_summary_rejected',
    'readiness_claim_rejected',
    'provider_calls_nonzero',
    'mutated_true',
    'service_started_true',
    'durable_memory_write_true',
    'real_memory_preview_true',
    'remote_write_true',
    'runtime_ready_true',
    'final_rc_matrix_ready_true',
    'full_final_rc_matrix_executed_true',
    'v1_rc_ready_true',
    'rc_ready_true',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.16 low-risk summary excludes raw workspace ids, secrets, paths, service URLs, and real content', () => {
  assert.equal(fixture.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSecretExposed, false);
  assert.deepEqual(fixture.lowRiskSummary.allowedFields, [
    'status',
    'decision',
    'runner_executed',
    'commands_executed_by_source',
    'critical_gate_count',
    'critical_gate_passed_count',
    'critical_gate_failed_count',
    'locally_evidenced_runtime_gap_count',
    'remaining_runtime_gap_count',
    'mutated'
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
    'durable_store_path'
  ]) {
    assert.ok(fixture.lowRiskSummary.disallowedFields.includes(disallowed), disallowed);
  }
});

test('P66.16 disallowed work covers collectors files commands runtime provider data MCP and release actions', () => {
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
    'migration_apply',
    'import_export_apply',
    'public_mcp_expansion',
    'push',
    'tag',
    'release',
    'deploy',
    'rc_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.16 safety flags preserve no-touch and no-side-effect boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.16 forbidden claims keep normalization runtime proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.16 implements runtime evidence collection'));
  assert.ok(fixture.forbiddenClaims.includes('P66.16 executes gates or runners'));
  assert.ok(fixture.forbiddenClaims.includes('P66.16 reads evidence files'));
  assert.ok(fixture.forbiddenClaims.includes('P66.16 scans real memory or runtime stores'));
  assert.ok(fixture.forbiddenClaims.includes('P66.16 makes ValidationAggregator a full implementation'));
  assert.ok(fixture.forbiddenClaims.includes('P66.16 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.16 authorizes RC_READY'));
});

test('P66.16 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.16 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
