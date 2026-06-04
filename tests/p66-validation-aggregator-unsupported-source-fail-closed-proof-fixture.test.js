const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-unsupported-source-fail-closed-proof-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('P66.24 fixture parses as unsupported source fail-closed proof and remains blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-unsupported-source-fail-closed-proof-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-unsupported-source-fail-closed-proof-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-unsupported-source-fail-closed-proof-manifest-v1');
  assert.equal(fixture.phase, 'P66.24-validation-aggregator-unsupported-source-fail-closed-proof');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.24 keeps the selected ValidationAggregator full-implementation gap open', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.24 defines unsupported source fail-closed proof without runtime authority', () => {
  assert.equal(fixture.evidenceGroup.id, 'unsupported_source_fail_closed_proof');
  assert.equal(fixture.evidenceGroup.priority, 6);
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenUnsupportedSourceType, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenUnsupportedSourceClass, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenUnknownSourceKind, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenOverclaiming, true);
});

test('P66.24 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.24 keeps all full implementation and readiness claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.24 supported source types and classes are exact local safe sets', () => {
  assert.deepEqual(fixture.supportedSourceTypes, [
    'committed_fixture',
    'committed_doc',
    'local_validation_summary',
    'static_report_shape'
  ]);
  assert.deepEqual(fixture.supportedSourceClasses, [
    'committed_evidence',
    'local_validation'
  ]);
});

test('P66.24 unsupported source type fails closed without downgrade', () => {
  assert.equal(fixture.unsupportedSourceTypeCase.sourceType, 'live_http_mcp_runtime');
  assert.equal(fixture.unsupportedSourceTypeCase.expectedStatus, 'blocked_unsupported_source_type');
  assert.equal(fixture.unsupportedSourceTypeCase.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.unsupportedSourceTypeCase.failClosed, true);
  assert.equal(fixture.unsupportedSourceTypeCase.mayDowngradeToStatic, false);
  assert.equal(fixture.unsupportedSourceTypeCase.mayClaimRuntimeReady, false);
});

test('P66.24 unsupported source class fails closed without reclassification', () => {
  assert.equal(fixture.unsupportedSourceClassCase.sourceClass, 'runtime_evidence');
  assert.equal(fixture.unsupportedSourceClassCase.expectedStatus, 'blocked_unsupported_source_class');
  assert.equal(fixture.unsupportedSourceClassCase.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.unsupportedSourceClassCase.failClosed, true);
  assert.equal(fixture.unsupportedSourceClassCase.mayTreatAsCommittedEvidence, false);
  assert.equal(fixture.unsupportedSourceClassCase.mayClaimRuntimeReady, false);
});

test('P66.24 unknown source kind fails closed without inference', () => {
  assert.equal(fixture.unknownSourceKindCase.sourceType, 'unexpected_evidence_feed');
  assert.equal(fixture.unknownSourceKindCase.sourceClass, 'unexpected_runtime_authority');
  assert.equal(fixture.unknownSourceKindCase.expectedStatus, 'blocked_unknown_source_kind');
  assert.equal(fixture.unknownSourceKindCase.failClosed, true);
  assert.equal(fixture.unknownSourceKindCase.mayInferSourceKind, false);
  assert.equal(fixture.unknownSourceKindCase.mayClaimRuntimeReady, false);
});

test('P66.24 blocks runtime source cases that require A5 approval', () => {
  assert.equal(fixture.blockedRuntimeSourceCases.length, 6);
  for (const blockedCase of fixture.blockedRuntimeSourceCases) {
    assert.match(blockedCase.blockedReason, /requires_a5$/);
    assert.equal(blockedCase.sourceClass, 'runtime_evidence');
  }
});

test('P66.24 expected fail-closed report keeps readiness blocked', () => {
  assert.equal(fixture.expectedFailClosedReport.accepted, false);
  assert.equal(fixture.expectedFailClosedReport.rejected, true);
  assert.equal(fixture.expectedFailClosedReport.failClosed, true);
  assert.equal(fixture.expectedFailClosedReport.unsupportedSourceTypeCount, 1);
  assert.equal(fixture.expectedFailClosedReport.unsupportedSourceClassCount, 1);
  assert.equal(fixture.expectedFailClosedReport.unknownSourceKindCount, 1);
  assert.equal(fixture.expectedFailClosedReport.blockedRuntimeSourceCount, 6);
  assert.equal(fixture.expectedFailClosedReport.validationAggregatorFullImplementationReady, false);
  assert.equal(fixture.expectedFailClosedReport.runtimeReady, false);
  assert.equal(fixture.expectedFailClosedReport.finalRcMatrixReady, false);
  assert.equal(fixture.expectedFailClosedReport.v1RcReady, false);
  assert.equal(fixture.expectedFailClosedReport.rcReady, false);
});

test('P66.24 fail-closed cases cover unsupported runtime provider memory durable MCP and A5 states', () => {
  for (const failClosedCase of [
    'unsupported_source_type',
    'unsupported_source_class',
    'unknown_source_kind',
    'runtime_source_without_a5_approval',
    'provider_source_without_a5_approval',
    'real_memory_source_without_a5_approval',
    'durable_write_source_without_a5_approval',
    'migration_apply_source_without_a5_approval',
    'public_mcp_expansion_source_without_a5_approval',
    'readiness_claim_without_authority',
    'a5_action_without_approval'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.24 low-risk summary excludes raw workspace ids secrets paths URLs and payloads', () => {
  assert.equal(fixture.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSecretExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSourcePayloadExposed, false);
  assert.deepEqual(fixture.lowRiskSummary.allowedFields, [
    'status',
    'decision',
    'fail_closed',
    'unsupported_source_type_count',
    'unsupported_source_class_count',
    'unknown_source_kind_count',
    'blocked_runtime_source_count',
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

test('P66.24 disallowed work covers collectors files commands runtime provider data MCP and release actions', () => {
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

test('P66.24 safety flags preserve no-touch and no-side-effect boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.24 forbidden claims keep unsupported source proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.24 implements runtime evidence collection'));
  assert.ok(fixture.forbiddenClaims.includes('P66.24 accepts live runtime sources'));
  assert.ok(fixture.forbiddenClaims.includes('P66.24 downgrades unsupported sources to static sources'));
  assert.ok(fixture.forbiddenClaims.includes('P66.24 reads evidence files'));
  assert.ok(fixture.forbiddenClaims.includes('P66.24 executes gates or runners'));
  assert.ok(fixture.forbiddenClaims.includes('P66.24 makes ValidationAggregator a full implementation'));
  assert.ok(fixture.forbiddenClaims.includes('P66.24 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.24 authorizes RC_READY'));
});

test('P66.24 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.24 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
