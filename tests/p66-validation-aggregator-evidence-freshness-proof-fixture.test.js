const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-evidence-freshness-proof-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_FRESHNESS_FIELDS = [
  'evidence_id',
  'source_id',
  'source_kind',
  'source_registry_version',
  'baseline_commit',
  'evidence_generated_at',
  'evidence_validated_at',
  'evidence_observed_hash',
  'validation_status',
  'validation_ref'
];

test('P66.8 fixture parses as freshness acceptance-contract-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-evidence-freshness-proof-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-evidence-freshness-proof-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-evidence-freshness-proof-manifest-v1');
  assert.equal(fixture.phase, 'P66.8-validation-aggregator-evidence-freshness-proof-fixture');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.8 keeps the selected ValidationAggregator full-implementation gap open', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.8 defines the evidence freshness group without runtime authority', () => {
  assert.equal(fixture.evidenceGroup.id, 'evidence_freshness_proof');
  assert.equal(fixture.evidenceGroup.priority, 2);
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenStale, true);
});

test('P66.8 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.8 keeps all full implementation and readiness claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.8 required freshness fields are exact and explicit', () => {
  assert.deepEqual(fixture.requiredFreshnessFields, REQUIRED_FRESHNESS_FIELDS);
});

test('P66.8 timestamp policy rejects inference and local time ambiguity', () => {
  assert.equal(fixture.timestampPolicy.format, 'iso8601_utc_z');
  assert.equal(fixture.timestampPolicy.timezoneRequired, 'UTC');
  assert.equal(fixture.timestampPolicy.allowLocalTimezone, false);
  assert.equal(fixture.timestampPolicy.allowImplicitNow, false);
  assert.equal(fixture.timestampPolicy.allowClockInference, false);
  assert.equal(fixture.timestampPolicy.allowMissingTimestampInference, false);
  assert.equal(fixture.timestampPolicy.generatedAtMustBeBeforeOrEqualValidatedAt, true);
});

test('P66.8 baseline policy fails closed for ambiguous or mismatched targets', () => {
  assert.equal(fixture.baselinePolicy.baselineCommitRequired, true);
  assert.equal(fixture.baselinePolicy.approvalRequestCommitIsNotBaseline, true);
  assert.equal(fixture.baselinePolicy.ambiguousBaselineFailsClosed, true);
  assert.equal(fixture.baselinePolicy.mismatchFailsClosed, true);
});

test('P66.8 freshness windows must be evidence-class declared, not globally inferred', () => {
  assert.equal(fixture.freshnessWindowPolicy.sourceClassSpecific, true);
  assert.equal(fixture.freshnessWindowPolicy.mustBeDeclaredByEvidenceClass, true);
  assert.equal(fixture.freshnessWindowPolicy.noGlobalDefaultWindow, true);
  assert.equal(fixture.freshnessWindowPolicy.missingWindowFailsClosed, true);
  assert.equal(fixture.freshnessWindowPolicy.expiredWindowFailsClosed, true);
});

test('P66.8 fail-closed cases cover missing, stale, baseline, source, and readiness failures', () => {
  for (const failClosedCase of [
    'missing_evidence_generated_at',
    'missing_evidence_validated_at',
    'non_utc_timestamp',
    'non_iso8601_timestamp',
    'generated_after_validated',
    'future_timestamp',
    'missing_baseline_commit',
    'baseline_commit_mismatch',
    'approval_request_commit_used_as_baseline',
    'missing_freshness_window',
    'expired_freshness_window',
    'unknown_source_kind',
    'unknown_source_registry_version',
    'missing_validation_ref',
    'unsafe_summary_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.8 low-risk summary excludes raw workspace ids, secrets, paths, and service URLs', () => {
  assert.equal(fixture.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSecretExposed, false);
  assert.deepEqual(fixture.lowRiskSummary.allowedFields, [
    'evidence_id',
    'source_kind',
    'baseline_commit_short',
    'validation_status',
    'freshness_status',
    'age_bucket',
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
    'live_service_url'
  ]) {
    assert.ok(fixture.lowRiskSummary.disallowedFields.includes(disallowed), disallowed);
  }
});

test('P66.8 disallowed work covers runtime, command, service, provider, data, MCP, and release actions', () => {
  for (const disallowed of [
    'runtime_collector',
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

test('P66.8 safety flags preserve no-touch and no-side-effect boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.8 forbidden claims keep runtime freshness proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.8 implements evidence freshness runtime collection'));
  assert.ok(fixture.forbiddenClaims.includes('P66.8 reads real evidence files'));
  assert.ok(fixture.forbiddenClaims.includes('P66.8 executes validation commands'));
  assert.ok(fixture.forbiddenClaims.includes('P66.8 closes validation_aggregator_full_implementation_incomplete'));
  assert.ok(fixture.forbiddenClaims.includes('P66.8 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.8 authorizes RC_READY'));
});

test('P66.8 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.8 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
