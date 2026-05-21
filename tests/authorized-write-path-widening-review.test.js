const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_MODE,
  EXPECTED_ROUTED_OUTCOME_DECISION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS,
  evaluateAuthorizedWritePathWideningReview,
  normalizeAuthorizedWritePathWideningReviewInput
} = require('../src/core/AuthorizedWritePathWideningReview');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'authorized-write-path-widening-review-v1.json'
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

test('authorized write-path widening-review fixture captures current blocked state', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(fixture.mode, EXPECTED_MODE);
  assert.equal(fixture.routingOutcomeRecordAvailable, false);
  assert.equal(fixture.sameBaselineEndpointStartupEvidenceAvailable, true);
  assert.equal(fixture.sameBaselineTokenPresentEvidenceAvailable, false);
});

test('widening review stays fail-closed when no escalated routed outcome exists yet', () => {
  const result = evaluateAuthorizedWritePathWideningReview(buildInput());

  assert.equal(result.status, 'blocked_fail_closed');
  assert.equal(result.decision, 'WIDENING_REVIEW_NOT_READY');
  assert.equal(result.cm0604Satisfied, false);
  assert.equal(result.cm0606BridgeActivated, false);
  assert.equal(result.proceedToCm0607AdoptionRecord, false);
  assert.equal(result.renderedReviewTextSurface.previewAvailable, true);
  assert.match(result.renderedReviewTextSurface.markdown, /^Status: DRAFT_REVIEW_NOT_READY/m);
  assert.match(result.renderedReviewTextSurface.markdown, /## CM-0604 gate review/);
  assert.match(result.renderedReviewTextSurface.markdown, /## Review Checklist/);
  assert.ok(result.reviewChecklistFailures.includes('W4'));
  assert.ok(result.failClosedReasons.includes('routing_outcome_not_escalated'));
  assert.equal(result.canAutoAuthorizeCm0595, false);
  assert.equal(result.canExecuteRuntimeNow, false);
  assert.equal(result.readiness.cm0595AutoAuthorizationReady, false);
});

test('widening review can pass but still not grant adoption when bounded durable-write crossing is not granted', () => {
  const result = evaluateAuthorizedWritePathWideningReview(buildInput({
    routingOutcomeRecordAvailable: true,
    routingOutcomeDecision: EXPECTED_ROUTED_OUTCOME_DECISION,
    routingOutcomeRecordId: 'docs/CM-0615_cm0605_routing_outcome_record.md',
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_equivalent.md'
  }));

  assert.equal(result.status, 'passed_adoption_not_granted');
  assert.equal(result.decision, 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED');
  assert.equal(result.cm0604Satisfied, true);
  assert.equal(result.cm0606BridgeActivated, false);
  assert.equal(result.proceedToCm0607AdoptionRecord, false);
  assert.equal(result.reviewRecordDraft.cm0604Satisfied, 'yes');
  assert.equal(result.reviewRecordDraft.cm0606BridgeActivated, 'no');
  assert.match(result.renderedReviewTextSurface.markdown, /Decision: WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED/);
  assert.ok(result.failClosedReasons.includes('bounded_durable_write_crossing_not_granted'));
});

test('widening review can pass and proceed only to CM-0607 when all gate conditions pass', () => {
  const result = evaluateAuthorizedWritePathWideningReview(buildInput({
    routingOutcomeRecordAvailable: true,
    routingOutcomeDecision: EXPECTED_ROUTED_OUTCOME_DECISION,
    routingOutcomeRecordId: 'docs/CM-0615_cm0605_routing_outcome_record.md',
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_equivalent.md',
    governanceMayCrossIntoOneBoundedDurableWriteProof: true
  }));

  assert.equal(result.status, 'passed_proceed_to_cm0607');
  assert.equal(result.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
  assert.equal(result.cm0604Satisfied, true);
  assert.equal(result.cm0606BridgeActivated, true);
  assert.equal(result.proceedToCm0607AdoptionRecord, true);
  assert.equal(result.reviewRecordDraft.nextBoundary.includes('CM-0607'), true);
  assert.match(result.renderedReviewTextSurface.markdown, /Proceed to CM-0607 adoption record: yes/);
  assert.equal(result.canAutoAuthorizeCm0595, false);
  assert.equal(result.readiness.cm0607AdoptionRecordReady, true);
});

test('widening review aborts on drift even if token-present and routed outcome evidence exists', () => {
  const result = evaluateAuthorizedWritePathWideningReview(buildInput({
    routingOutcomeRecordAvailable: true,
    routingOutcomeDecision: EXPECTED_ROUTED_OUTCOME_DECISION,
    routingOutcomeRecordId: 'docs/CM-0615_cm0605_routing_outcome_record.md',
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_equivalent.md',
    governanceMayCrossIntoOneBoundedDurableWriteProof: true,
    packetFamilyDriftDetected: true
  }));

  assert.equal(result.status, 'aborted_drift');
  assert.equal(result.decision, 'WIDENING_REVIEW_ABORTED_DRIFT');
  assert.equal(result.cm0604Satisfied, false);
  assert.ok(result.failClosedReasons.includes('write_path_or_environment_drift'));
  assert.match(result.renderedReviewTextSurface.markdown, /packet family drift detected: `true`/);
});

test('widening review fails closed for malformed input or missing out-of-scope boundary', () => {
  for (const [label, input, expectedReason] of [
    ['malformed', null, 'malformed_input'],
    ['bad schema', buildInput({ schemaVersion: 'bad-schema' }), 'schema_version_mismatch'],
    ['bad mode', buildInput({ mode: 'bad-mode' }), 'mode_mismatch'],
    ['missing out-of-scope', buildInput({
      stillOutOfScopeActions: REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS.filter(value => value !== 'record_memory')
    }), 'out_of_scope_boundary_not_preserved']
  ]) {
    const result = evaluateAuthorizedWritePathWideningReview(input);

    assert.equal(result.canAutoAuthorizeCm0595, false, label);
    assert.equal(result.failClosedReasons.includes(expectedReason), true, label);
  }
});

test('widening review normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeAuthorizedWritePathWideningReviewInput({
    ...buildInput(),
    randomField: 'ignore-me',
    routingOutcomeDecision: `  ${EXPECTED_ROUTED_OUTCOME_DECISION}  `
  });

  assert.equal(normalized.routingOutcomeDecision, EXPECTED_ROUTED_OUTCOME_DECISION);
  assert.equal(Object.prototype.hasOwnProperty.call(normalized, 'randomField'), false);
});
