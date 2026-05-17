const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p37-policy-decision-envelope-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('P37-T1 policy decision fixture parses and locks blocked fixture-only state', () => {
  assert.equal(fixture.schemaVersion, 'p37-policy-decision-envelope-v1');
  assert.equal(fixture.policy_version, 'p37-policy-v1');
  assert.equal(fixture.phase, 'P37-T1-policy-decision-envelope-fixture-matrix');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P37-T1 envelope requires version, decision id, reason codes, status, evidence, and failure path', () => {
  for (const field of [
    'decision_id',
    'policy_version',
    'decision',
    'machine_status',
    'reason_codes',
    'risk_label',
    'scope_metadata',
    'evidence_source',
    'failure_path'
  ]) {
    assert.ok(fixture.envelopeContract.requiredFields.includes(field), field);
  }

  assert.deepEqual(fixture.envelopeContract.acceptedDecisions, [
    'allow',
    'deny',
    'require_review'
  ]);
});

test('P37-T1 fixture covers allow, deny, require_review, malformed, version mismatch, and redaction uncertainty', () => {
  const casesById = new Map(fixture.decisionCases.map(entry => [entry.id, entry]));

  assert.equal(casesById.get('allow_local_fixture_only').decision, 'allow');
  assert.equal(casesById.get('deny_a5_action').decision, 'deny');
  assert.equal(casesById.get('require_review_redaction_uncertainty').decision, 'require_review');
  assert.equal(casesById.get('deny_version_mismatch').machine_status, 'DENY_POLICY_VERSION_MISMATCH');
  assert.equal(casesById.get('deny_malformed_missing_decision_id').machine_status, 'DENY_MALFORMED_ENVELOPE');
  assert.equal(casesById.get('require_review_redaction_uncertainty').machine_status, 'REQUIRE_REVIEW_REDACTION_UNCERTAINTY');
});

test('P37-T1 failing or review cases have nonzero failure paths and P37 reason codes', () => {
  for (const entry of fixture.decisionCases.filter(item => item.decision !== 'allow')) {
    assert.equal(entry.acceptedForPlanning, false, entry.id);
    assert.equal(entry.failure_path.nonzeroOnFailure, true, entry.id);
    assert.equal(entry.failure_path.exitCodeOnFailure, 1, entry.id);
    assert.ok(Array.isArray(entry.reason_codes), entry.id);
    assert.ok(entry.reason_codes.length > 0 || entry.id === 'deny_missing_reason_codes', entry.id);
    for (const reasonCode of entry.reason_codes) {
      assert.match(reasonCode, /^P37_/, `${entry.id}:${reasonCode}`);
    }
  }
});

test('P37-T1 version mismatch, malformed envelope, warning-only gate, and missing reason codes fail closed', () => {
  const casesById = new Map(fixture.decisionCases.map(entry => [entry.id, entry]));

  assert.equal(fixture.envelopeContract.versionMismatchDisposition, 'deny');
  assert.equal(fixture.envelopeContract.malformedDisposition, 'deny');
  assert.equal(fixture.envelopeContract.defaultAllow, false);
  assert.equal(casesById.get('deny_version_mismatch').acceptedForPlanning, false);
  assert.equal(casesById.get('deny_malformed_missing_decision_id').acceptedForPlanning, false);
  assert.equal(casesById.get('deny_missing_reason_codes').acceptedForPlanning, false);
  assert.equal(casesById.get('deny_warning_only_gate').acceptedForPlanning, false);
});

test('P37-T1 redaction uncertainty requires review without echoing sensitive fragments', () => {
  const reviewCase = fixture.decisionCases.find(entry => entry.id === 'require_review_redaction_uncertainty');

  assert.equal(fixture.envelopeContract.redactionUncertaintyDisposition, 'require_review');
  assert.equal(reviewCase.decision, 'require_review');
  assert.equal(reviewCase.acceptedForPlanning, false);
  assert.ok(reviewCase.summary_tokens.includes('<REDACTED_SENSITIVE_FRAGMENT>'));
  assert.doesNotMatch(JSON.stringify(reviewCase.summary_tokens), /authorization\s*:/i);
  assert.doesNotMatch(JSON.stringify(reviewCase.summary_tokens), /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(JSON.stringify(reviewCase.summary_tokens), /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(JSON.stringify(reviewCase.summary_tokens), /password\s*[:=]/i);
  assert.doesNotMatch(JSON.stringify(reviewCase.summary_tokens), /(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}/);
});

test('P37-T1 policy decision fixture does not enter recall, vector, candidate, diary, projection, or audit summary paths', () => {
  assert.equal(fixture.recallIntegrated, false);
  assert.equal(fixture.vectorPathTouched, false);
  assert.equal(fixture.candidatePathTouched, false);
  assert.equal(fixture.diaryPathTouched, false);
  assert.equal(fixture.projectionPathTouched, false);
  assert.equal(fixture.auditSummaryTouched, false);
  assert.equal(fixture.isolation.doesNotEnterVectorPath, true);
  assert.equal(fixture.isolation.doesNotEnterCandidatePath, true);
  assert.equal(fixture.isolation.doesNotEnterDiaryPath, true);
  assert.equal(fixture.isolation.doesNotEnterRecallNamespace, true);
  assert.equal(fixture.isolation.doesNotEnterProjection, true);
  assert.equal(fixture.isolation.doesNotEnterAuditSummary, true);
});

test('P37-T1 safety flags preserve no runtime, no real data, no provider, no dependency, and no remote action', () => {
  for (const flag of [
    'noRuntimePolicyKernel',
    'noCommandExecution',
    'noDurableMemoryWrite',
    'noDurableAuditWrite',
    'noPublicMcpExpansion',
    'noRealMemoryContentRead',
    'noRealMemoryPreview',
    'noRealMemoryExport',
    'noRealMemoryImport',
    'noRealMemoryScan',
    'noMigrationApply',
    'noBackupRestore',
    'noProviderCall',
    'noServiceStart',
    'noConfigMutation',
    'noDependencyChange',
    'noRemoteWrite'
  ]) {
    assert.equal(fixture.safety[flag], true, flag);
  }
});

test('P37-T1 required wording prevents runtime-ready and recall pollution overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic policy decision envelope fixture matrix only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('do not enter vector')));
  assert.ok(fixture.requiredWording.some(line => line.includes('fail closed')));
  assert.ok(fixture.requiredWording.some(line => line.includes('requires review')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not mean runtime policy kernel')));
  assert.ok(fixture.forbiddenClaims.includes('policy kernel is runtime-ready'));
  assert.ok(fixture.forbiddenClaims.includes('policy decisions enter normal recall'));
  assert.ok(fixture.forbiddenClaims.includes('P37 makes v1.0 RC ready'));
});

test('P37-T1 fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
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

test('P37-T1 reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
