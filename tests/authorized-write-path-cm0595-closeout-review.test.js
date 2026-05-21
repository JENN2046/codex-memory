const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_MODE,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_WIDENING_ADOPTION_DECISION,
  EXPECTED_CM0595_ISSUANCE_DECISION,
  EXPECTED_CM0595_EXECUTION_DECISION,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  evaluateAuthorizedWritePathCm0595CloseoutReview,
  normalizeAuthorizedWritePathCm0595CloseoutReviewInput
} = require('../src/core/AuthorizedWritePathCm0595CloseoutReview');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'authorized-write-path-cm0595-closeout-review-v1.json'
);

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildInput(overrides = {}) {
  return {
    ...loadFixture(),
    ...overrides
  };
}

test('authorized write-path CM-0595 closeout fixture captures current blocked state', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(fixture.mode, EXPECTED_MODE);
  assert.equal(fixture.sameBaselineEndpointStartupEvidenceAvailable, true);
  assert.equal(fixture.sameBaselineTokenPresentEvidenceAvailable, false);
  assert.equal(fixture.cm0595IssuanceRecordAvailable, false);
  assert.equal(fixture.cm0595ExecutionEvidenceAvailable, false);
});

test('CM-0595 closeout stays fail-closed while later issuance/execution artifacts are absent', () => {
  const result = evaluateAuthorizedWritePathCm0595CloseoutReview(buildInput());

  assert.equal(result.status, 'blocked_fail_closed');
  assert.equal(result.decision, 'CM0595_CLOSEOUT_NOT_READY');
  assert.equal(result.cm0595CloseoutReady, false);
  assert.equal(result.canPrepareBoundedRecallNext, false);
  assert.equal(result.canExecuteBoundedRecallNow, false);
  assert.equal(result.canExecuteRuntimeNow, false);
  assert.match(result.renderedCloseoutTextSurface.markdown, /^Status: DRAFT_CM0595_CLOSEOUT_NOT_READY/m);
  assert.match(result.renderedCloseoutTextSurface.markdown, /## Closeout Checklist/);
  assert.ok(result.closeoutChecklistFailures.includes('C5'));
  assert.ok(result.closeoutChecklistFailures.includes('C6'));
  assert.ok(result.closeoutChecklistFailures.includes('C7'));
  assert.ok(result.failClosedReasons.includes('widening_adoption_not_granted_cm0595_only'));
  assert.ok(result.failClosedReasons.includes('cm0595_issuance_record_not_proven'));
  assert.ok(result.failClosedReasons.includes('cm0595_execution_evidence_not_proven'));
});

test('CM-0595 closeout can record exactly one write while still blocking bounded recall runtime execution', () => {
  const result = evaluateAuthorizedWritePathCm0595CloseoutReview(buildInput({
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_same_baseline_record.md',
    wideningAdoptionGrantedCm0595Only: true,
    wideningAdoptionDecision: EXPECTED_WIDENING_ADOPTION_DECISION,
    wideningAdoptionRecordId: 'docs/CM-0607_future_widening_adoption_record.md',
    cm0595IssuanceRecordAvailable: true,
    cm0595IssuanceDecision: EXPECTED_CM0595_ISSUANCE_DECISION,
    cm0595IssuedExactLineMatches: true,
    cm0595RuntimeExecutionStartedBeforeEvidence: false,
    cm0595IssuanceRecordId: 'docs/CM-0649_future_cm0595_issuance_record.md',
    cm0595ExecutionEvidenceAvailable: true,
    cm0595ExecutionEvidenceDecision: EXPECTED_CM0595_EXECUTION_DECISION,
    cm0595DurableMemoryWriteCount: 1,
    cm0595WritePathAuditSideEffectCount: 1,
    cm0595ExecutedExactlyOneWrite: true,
    cm0595FailedClosedWithZeroWrites: false,
    cm0595ExecutionEvidenceRecordId: 'docs/CM-0650_future_cm0595_execution_evidence_record.md',
    noAdditionalDurableWriteBeyondCm0595: true,
    boundedRecallNotYetEntered: true,
    noSearchProviderConfigStartupPersistenceDriftSinceWrite: true
  }), {
    wideningAdoptionRecordInputTrace: {
      traceAvailable: true,
      sourceWorkspaceRelativePath: '.\\tests\\fixtures\\cm0607-widening-adoption-record-v1.md'
    },
    cm0595IssuanceRecordInputTrace: {
      traceAvailable: true,
      sourceWorkspaceRelativePath: '.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1.md'
    },
    cm0595ExecutionEvidenceInputTrace: {
      traceAvailable: true,
      sourceWorkspaceRelativePath: '.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1.md'
    }
  });

  assert.equal(result.status, 'recorded_exactly_one_write_only');
  assert.equal(result.decision, 'CM0595_CLOSEOUT_RECORDED_EXACTLY_ONE_WRITE_ONLY');
  assert.equal(result.cm0595CloseoutReady, true);
  assert.equal(result.canPrepareBoundedRecallNext, true);
  assert.equal(result.canExecuteBoundedRecallNow, false);
  assert.equal(result.canExecuteRuntimeNow, false);
  assert.equal(result.readiness.boundedRecallMayBePreparedNext, true);
  assert.equal(result.readiness.boundedRecallMayExecuteNow, false);
  assert.equal(result.traces.cm0595ExecutionEvidenceInputTrace.sourceWorkspaceRelativePath, '.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1.md');
  assert.match(result.renderedCloseoutTextSurface.markdown, /durable memory writes: `1`/);
  assert.match(result.renderedCloseoutTextSurface.markdown, /bounded recall may be prepared next: `yes`/);
  assert.equal(result.closeoutRecordDraft.draftUsableNow, true);
});

test('CM-0595 closeout aborts on post-write drift even if later issuance/execution artifacts exist', () => {
  const result = evaluateAuthorizedWritePathCm0595CloseoutReview(buildInput({
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_same_baseline_record.md',
    wideningAdoptionGrantedCm0595Only: true,
    wideningAdoptionDecision: EXPECTED_WIDENING_ADOPTION_DECISION,
    wideningAdoptionRecordId: 'docs/CM-0607_future_widening_adoption_record.md',
    cm0595IssuanceRecordAvailable: true,
    cm0595IssuanceDecision: EXPECTED_CM0595_ISSUANCE_DECISION,
    cm0595IssuedExactLineMatches: true,
    cm0595IssuanceRecordId: 'docs/CM-0649_future_cm0595_issuance_record.md',
    cm0595ExecutionEvidenceAvailable: true,
    cm0595ExecutionEvidenceDecision: EXPECTED_CM0595_EXECUTION_DECISION,
    cm0595DurableMemoryWriteCount: 1,
    cm0595WritePathAuditSideEffectCount: 1,
    cm0595ExecutedExactlyOneWrite: true,
    cm0595ExecutionEvidenceRecordId: 'docs/CM-0650_future_cm0595_execution_evidence_record.md',
    noAdditionalDurableWriteBeyondCm0595: false,
    boundedRecallNotYetEntered: false
  }));

  assert.equal(result.status, 'aborted_drift');
  assert.equal(result.decision, 'CM0595_CLOSEOUT_ABORTED_DRIFT');
  assert.ok(result.failClosedReasons.includes('post_cm0595_scope_or_environment_drift'));
});

test('CM-0595 closeout fails closed for malformed input, drift, or forbidden-action boundary mismatch', () => {
  for (const [label, input, expectedReason] of [
    ['malformed', null, 'malformed_input'],
    ['bad schema', buildInput({ schemaVersion: 'bad-schema' }), 'schema_version_mismatch'],
    ['bad mode', buildInput({ mode: 'bad-mode' }), 'mode_mismatch'],
    ['missing forbidden action', buildInput({
      stillForbiddenActions: REQUIRED_STILL_FORBIDDEN_ACTIONS.filter(value => value !== 'provider_call')
    }), 'post_cm0595_forbidden_action_boundary_not_preserved']
  ]) {
    const result = evaluateAuthorizedWritePathCm0595CloseoutReview(input);
    assert.equal(result.failClosedReasons.includes(expectedReason), true, label);
  }
});

test('CM-0595 closeout normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeAuthorizedWritePathCm0595CloseoutReviewInput({
    ...buildInput(),
    randomField: 'ignore-me',
    wideningAdoptionDecision: `  ${EXPECTED_WIDENING_ADOPTION_DECISION}  `
  });

  assert.equal(normalized.wideningAdoptionDecision, EXPECTED_WIDENING_ADOPTION_DECISION);
  assert.equal(Object.prototype.hasOwnProperty.call(normalized, 'randomField'), false);
});
