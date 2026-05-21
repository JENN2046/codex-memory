const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_MODE,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_WIDENING_REVIEW_DECISION,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  evaluateAuthorizedWritePathWideningAdoptionReview,
  normalizeAuthorizedWritePathWideningAdoptionReviewInput
} = require('../src/core/AuthorizedWritePathWideningAdoptionReview');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'authorized-write-path-widening-adoption-review-v1.json'
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

test('authorized write-path widening-adoption fixture captures current blocked state', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(fixture.mode, EXPECTED_MODE);
  assert.equal(fixture.wideningReviewRecordAvailable, false);
  assert.equal(fixture.sameBaselineEndpointStartupEvidenceAvailable, true);
  assert.equal(fixture.sameBaselineTokenPresentEvidenceAvailable, false);
});

test('widening adoption stays fail-closed when no widening-review proceed record exists yet', () => {
  const result = evaluateAuthorizedWritePathWideningAdoptionReview(buildInput());

  assert.equal(result.status, 'blocked_fail_closed');
  assert.equal(result.decision, 'WIDENING_ADOPTION_NOT_READY');
  assert.equal(result.adoptionPrerequisitesSatisfied, false);
  assert.equal(result.cm0607AdoptionRecordReady, false);
  assert.equal(result.renderedAdoptionTextSurface.previewAvailable, true);
  assert.match(result.renderedAdoptionTextSurface.markdown, /^Status: DRAFT_ADOPTION_NOT_READY/m);
  assert.match(result.renderedAdoptionTextSurface.markdown, /## CM-0606 bridge inputs/);
  assert.match(result.renderedAdoptionTextSurface.markdown, /## Adoption Checklist/);
  assert.ok(result.adoptionChecklistFailures.includes('A4'));
  assert.ok(result.failClosedReasons.includes('widening_review_not_ready_for_adoption'));
  assert.equal(result.canAutoAuthorizeCm0595, false);
  assert.equal(result.cm0595ApprovalLinePreview.previewAvailable, true);
  assert.equal(result.cm0595ApprovalLinePreview.previewUsableNow, false);
  assert.equal(result.cm0595OperatorPacketDraft.packetKind, 'cm0595_operator_packet_blocked');
  assert.equal(result.cm0595IssuanceRecordDraft.draftAvailable, true);
  assert.equal(result.cm0595IssuanceRecordDraft.draftUsableNow, false);
  assert.equal(result.cm0595ExecutionEvidenceDraft.draftAvailable, true);
  assert.equal(result.cm0595ExecutionEvidenceDraft.draftUsableNow, false);
});

test('widening adoption can deny when prerequisites pass but explicit adoption is not granted', () => {
  const result = evaluateAuthorizedWritePathWideningAdoptionReview(buildInput({
    wideningReviewRecordAvailable: true,
    wideningReviewDecision: EXPECTED_WIDENING_REVIEW_DECISION,
    wideningReviewRecordId: 'docs/CM-0616_future_widening_review_record.md',
    cm0604SatisfiedByWideningReview: true,
    cm0606BridgeActivatedByWideningReview: true,
    proceedToCm0607FromWideningReview: true,
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_equivalent.md'
  }));

  assert.equal(result.status, 'denied');
  assert.equal(result.decision, 'WIDENING_ADOPTION_DENIED');
  assert.equal(result.adoptionPrerequisitesSatisfied, true);
  assert.equal(result.cm0607AdoptionRecordReady, true);
  assert.equal(result.canAutoAuthorizeCm0595, false);
  assert.match(result.renderedAdoptionTextSurface.markdown, /Decision: WIDENING_ADOPTION_DENIED/);
  assert.ok(result.failClosedReasons.includes('widening_adoption_not_granted'));
});

test('widening adoption can grant CM-0595 only when all prerequisites and explicit adoption pass', () => {
  const result = evaluateAuthorizedWritePathWideningAdoptionReview(buildInput({
    wideningReviewRecordAvailable: true,
    wideningReviewDecision: EXPECTED_WIDENING_REVIEW_DECISION,
    wideningReviewRecordId: 'docs/CM-0616_future_widening_review_record.md',
    cm0604SatisfiedByWideningReview: true,
    cm0606BridgeActivatedByWideningReview: true,
    proceedToCm0607FromWideningReview: true,
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_equivalent.md',
    futureAutoAuthorizationWideningAdopted: true
  }), {
    wideningReviewRecordInputTrace: {
      sourceWorkspaceRelativePath: '.\\tests\\fixtures\\cm0616-widening-review-outcome-record-v1.md'
    },
    wideningAdoptionRecordInputTrace: {
      sourceWorkspaceRelativePath: '.\\tests\\fixtures\\cm0607-widening-adoption-record-v1.md'
    },
    cm0595IssuanceRecordInputTrace: {
      traceAvailable: true,
      sourceWorkspaceRelativePath: '.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1.md',
      exactLineIssued: true
    },
    cm0595ExecutionEvidenceInputTrace: {
      traceAvailable: true,
      sourceWorkspaceRelativePath: '.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1.md',
      durableMemoryWriteCount: 1,
      writePathAuditSideEffectCount: 1
    }
  });

  assert.equal(result.status, 'granted_cm0595_only');
  assert.equal(result.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
  assert.equal(result.canAutoAuthorizeCm0595, true);
  assert.equal(result.readiness.cm0595AutoAuthorizationReady, true);
  assert.match(result.renderedAdoptionTextSurface.markdown, /future auto-authorization may issue CM-0595 only/);
  assert.equal(result.cm0595ApprovalLinePreview.previewAvailable, true);
  assert.equal(result.cm0595ApprovalLinePreview.previewUsableNow, true);
  assert.match(result.cm0595ApprovalLinePreview.exactApprovalLine, /授权执行 CM-0595/);
  assert.equal(result.cm0595CommandPreviewBundle.previewUsableNow, true);
  assert.equal(result.cm0595CommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_pair');
  assert.equal(result.cm0595CommandPreviewBundle.resolvedWideningReviewRecordPath, '.\\tests\\fixtures\\cm0616-widening-review-outcome-record-v1.md');
  assert.equal(result.cm0595CommandPreviewBundle.resolvedWideningAdoptionRecordPath, '.\\tests\\fixtures\\cm0607-widening-adoption-record-v1.md');
  assert.equal(result.cm0595OperatorPacketDraft.packetKind, 'cm0595_auto_authorization_operator_packet');
  assert.equal(result.cm0595OperatorPacketDraft.packetUsableNow, true);
  assert.equal(result.cm0595IssuanceRecordDraft.draftUsableNow, true);
  assert.equal(
    result.cm0595IssuanceRecordDraft.selectedPayload.cm0595IssuanceRecordInputTrace.sourceWorkspaceRelativePath,
    '.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1.md'
  );
  assert.match(
    result.cm0595IssuanceRecordDraft.issuanceTemplateRef,
    /CM-0649_AUTHORIZED_WRITE_PATH_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE/
  );
  assert.equal(result.cm0595ExecutionEvidenceDraft.draftUsableNow, true);
  assert.equal(
    result.cm0595ExecutionEvidenceDraft.selectedPayload.cm0595ExecutionEvidenceInputTrace.sourceWorkspaceRelativePath,
    '.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1.md'
  );
  assert.match(
    result.cm0595ExecutionEvidenceDraft.executionEvidenceTemplateRef,
    /CM-0650_AUTHORIZED_WRITE_PATH_CM0595_EXECUTION_EVIDENCE_TEMPLATE/
  );
  assert.equal(result.renderedCm0595OperatorPacketTextSurface.previewAvailable, true);
  assert.match(result.renderedCm0595OperatorPacketTextSurface.markdown, /## Exact Approval Line/);
  assert.match(result.renderedCm0595OperatorPacketTextSurface.markdown, /## Next Record Drafts/);
  assert.match(result.renderedCm0595OperatorPacketTextSurface.markdown, /issued CM-0595 record path: `\.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1\.md`/);
  assert.match(result.renderedCm0595OperatorPacketTextSurface.markdown, /CM-0595 execution evidence path: `\.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1\.md`/);
  assert.match(result.renderedCm0595OperatorPacketTextSurface.markdown, /resolved record path mode: `workspace_relative_pair`/);
});

test('widening adoption aborts on drift even if widening review and token-present evidence exist', () => {
  const result = evaluateAuthorizedWritePathWideningAdoptionReview(buildInput({
    wideningReviewRecordAvailable: true,
    wideningReviewDecision: EXPECTED_WIDENING_REVIEW_DECISION,
    wideningReviewRecordId: 'docs/CM-0616_future_widening_review_record.md',
    cm0604SatisfiedByWideningReview: true,
    cm0606BridgeActivatedByWideningReview: true,
    proceedToCm0607FromWideningReview: true,
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_equivalent.md',
    futureAutoAuthorizationWideningAdopted: true,
    packetFamilyDriftDetected: true
  }));

  assert.equal(result.status, 'aborted_drift');
  assert.equal(result.decision, 'WIDENING_ADOPTION_ABORTED_DRIFT');
  assert.ok(result.failClosedReasons.includes('write_path_or_environment_drift'));
});

test('widening adoption fails closed for malformed input or missing forbidden-action boundary', () => {
  for (const [label, input, expectedReason] of [
    ['malformed', null, 'malformed_input'],
    ['bad schema', buildInput({ schemaVersion: 'bad-schema' }), 'schema_version_mismatch'],
    ['bad mode', buildInput({ mode: 'bad-mode' }), 'mode_mismatch'],
    ['missing forbidden action', buildInput({
      stillForbiddenActions: REQUIRED_STILL_FORBIDDEN_ACTIONS.filter(value => value !== 'provider_call')
    }), 'forbidden_action_boundary_not_preserved']
  ]) {
    const result = evaluateAuthorizedWritePathWideningAdoptionReview(input);
    assert.equal(result.failClosedReasons.includes(expectedReason), true, label);
  }
});

test('widening adoption normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeAuthorizedWritePathWideningAdoptionReviewInput({
    ...buildInput(),
    randomField: 'ignore-me',
    wideningReviewDecision: `  ${EXPECTED_WIDENING_REVIEW_DECISION}  `
  });

  assert.equal(normalized.wideningReviewDecision, EXPECTED_WIDENING_REVIEW_DECISION);
  assert.equal(Object.prototype.hasOwnProperty.call(normalized, 'randomField'), false);
});
