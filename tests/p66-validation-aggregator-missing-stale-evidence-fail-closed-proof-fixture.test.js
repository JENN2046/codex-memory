const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_EVIDENCE_GROUPS = [
  'source_registry_exact_set_proof',
  'evidence_freshness_proof',
  'baseline_binding_proof',
  'runtime_evidence_summary_normalization_proof',
  'missing_or_stale_evidence_fail_closed_proof',
  'unsupported_source_fail_closed_proof',
  'no_touch_boundary_proof',
  'readiness_overclaim_rejection_proof'
];

test('P66.20 fixture parses as missing or stale evidence fail-closed proof and remains blocked', () => {
  assert.equal(
    fixture.schemaVersion,
    'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-v1'
  );
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.20-validation-aggregator-missing-or-stale-evidence-fail-closed-proof');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.20 keeps the selected ValidationAggregator full-implementation gap open', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.20 defines missing or stale evidence fail-closed proof without runtime authority', () => {
  assert.equal(fixture.evidenceGroup.id, 'missing_or_stale_evidence_fail_closed_proof');
  assert.equal(fixture.evidenceGroup.priority, 5);
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenStale, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenDuplicate, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenUnknown, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenOverclaiming, true);
});

test('P66.20 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.20 keeps all full implementation and readiness claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.20 required evidence groups are exact and ordered', () => {
  assert.deepEqual(fixture.requiredEvidenceGroups, REQUIRED_EVIDENCE_GROUPS);
  assert.deepEqual(fixture.completedLocalEvidenceGroups, [
    'source_registry_exact_set_proof',
    'evidence_freshness_proof',
    'baseline_binding_proof',
    'runtime_evidence_summary_normalization_proof'
  ]);
});

test('P66.20 missing required evidence fails closed without inference', () => {
  assert.equal(fixture.missingEvidenceCase.expectedStatus, 'blocked_missing_required_evidence');
  assert.equal(fixture.missingEvidenceCase.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.missingEvidenceCase.failClosed, true);
  assert.equal(fixture.missingEvidenceCase.mayInferMissingEvidence, false);
  assert.equal(fixture.missingEvidenceCase.mayClaimRuntimeReady, false);
  assert.ok(fixture.missingEvidenceCase.missingRequiredEvidenceGroups.includes('evidence_freshness_proof'));
  assert.ok(fixture.missingEvidenceCase.missingRequiredEvidenceGroups.includes('missing_or_stale_evidence_fail_closed_proof'));
});

test('P66.20 stale required evidence fails closed without implicit refresh', () => {
  assert.equal(fixture.staleEvidenceCase.expectedStatus, 'blocked_stale_required_evidence');
  assert.equal(fixture.staleEvidenceCase.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.staleEvidenceCase.failClosed, true);
  assert.equal(fixture.staleEvidenceCase.freshnessWindowSeconds, 86400);
  assert.equal(fixture.staleEvidenceCase.mayRefreshEvidenceImplicitly, false);
  assert.equal(fixture.staleEvidenceCase.mayClaimRuntimeReady, false);
  assert.deepEqual(fixture.staleEvidenceCase.staleRequiredEvidenceGroups, ['evidence_freshness_proof']);
  assert.equal(fixture.staleEvidenceCase.providedEvidence[1].ageSeconds, 172800);
  assert.equal(fixture.staleEvidenceCase.providedEvidence[1].stale, true);
});

test('P66.20 duplicate evidence groups fail closed', () => {
  assert.equal(fixture.duplicateEvidenceCase.expectedStatus, 'blocked_duplicate_required_evidence');
  assert.equal(fixture.duplicateEvidenceCase.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.duplicateEvidenceCase.failClosed, true);
  assert.deepEqual(fixture.duplicateEvidenceCase.duplicateEvidenceGroups, ['source_registry_exact_set_proof']);
});

test('P66.20 unknown evidence groups fail closed', () => {
  assert.equal(fixture.unknownEvidenceCase.expectedStatus, 'blocked_unknown_evidence_group');
  assert.equal(fixture.unknownEvidenceCase.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.unknownEvidenceCase.failClosed, true);
  assert.deepEqual(fixture.unknownEvidenceCase.unknownEvidenceGroups, ['unexpected_runtime_authority_proof']);
});

test('P66.20 expected fail-closed report keeps readiness blocked', () => {
  assert.equal(fixture.expectedFailClosedReport.accepted, false);
  assert.equal(fixture.expectedFailClosedReport.rejected, true);
  assert.equal(fixture.expectedFailClosedReport.failClosed, true);
  assert.equal(fixture.expectedFailClosedReport.missingRequiredEvidenceGroupCount, 5);
  assert.equal(fixture.expectedFailClosedReport.staleRequiredEvidenceGroupCount, 1);
  assert.equal(fixture.expectedFailClosedReport.duplicateEvidenceGroupCount, 1);
  assert.equal(fixture.expectedFailClosedReport.unknownEvidenceGroupCount, 1);
  assert.equal(fixture.expectedFailClosedReport.validationAggregatorFullImplementationReady, false);
  assert.equal(fixture.expectedFailClosedReport.runtimeReady, false);
  assert.equal(fixture.expectedFailClosedReport.finalRcMatrixReady, false);
  assert.equal(fixture.expectedFailClosedReport.v1RcReady, false);
  assert.equal(fixture.expectedFailClosedReport.rcReady, false);
});

test('P66.20 fail-closed cases cover missing stale duplicate unknown unsafe and A5 states', () => {
  for (const failClosedCase of [
    'missing_required_evidence_group',
    'stale_evidence_group',
    'duplicate_evidence_group',
    'unknown_evidence_group',
    'unsupported_source_type',
    'unsupported_source_class',
    'readiness_claim_without_authority',
    'runtime_execution_claim',
    'service_start_claim',
    'provider_call_claim',
    'real_memory_scan_claim',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'a5_action_without_approval'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.20 low-risk summary excludes raw workspace ids secrets paths URLs and payloads', () => {
  assert.equal(fixture.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSecretExposed, false);
  assert.equal(fixture.lowRiskSummary.rawEvidencePayloadExposed, false);
  assert.deepEqual(fixture.lowRiskSummary.allowedFields, [
    'status',
    'decision',
    'fail_closed',
    'missing_required_evidence_group_count',
    'stale_required_evidence_group_count',
    'duplicate_evidence_group_count',
    'unknown_evidence_group_count',
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
    'raw_evidence_payload'
  ]) {
    assert.ok(fixture.lowRiskSummary.disallowedFields.includes(disallowed), disallowed);
  }
});

test('P66.20 disallowed work covers collectors files commands runtime provider data MCP and release actions', () => {
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

test('P66.20 safety flags preserve no-touch and no-side-effect boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.20 forbidden claims keep missing or stale evidence proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.20 implements runtime evidence collection'));
  assert.ok(fixture.forbiddenClaims.includes('P66.20 refreshes missing or stale evidence'));
  assert.ok(fixture.forbiddenClaims.includes('P66.20 reads evidence files'));
  assert.ok(fixture.forbiddenClaims.includes('P66.20 executes gates or runners'));
  assert.ok(fixture.forbiddenClaims.includes('P66.20 makes ValidationAggregator a full implementation'));
  assert.ok(fixture.forbiddenClaims.includes('P66.20 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.20 authorizes RC_READY'));
});

test('P66.20 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.20 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
