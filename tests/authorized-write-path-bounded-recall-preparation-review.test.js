const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/authorized-write-path-bounded-recall-preparation-review-v1.json');
const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_MODE,
  evaluateAuthorizedWritePathBoundedRecallPreparationReview
} = require('../src/core/AuthorizedWritePathBoundedRecallPreparationReview');

function buildReadyInput() {
  return {
    ...fixture,
    sameBaselineEndpointStartupEvidenceAvailable: true,
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: 'docs/CM-0603_future_token_present_same_baseline_record.md',
    wideningAdoptionGrantedCm0595Only: true,
    wideningAdoptionDecision: 'WIDENING_ADOPTION_GRANTED',
    wideningAdoptionRecordId: 'docs/CM-0607_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_ADOPTION_RECORD_TEMPLATE.md',
    cm0595IssuanceRecordAvailable: true,
    cm0595IssuanceDecision: 'CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED',
    cm0595IssuedExactLineMatches: true,
    cm0595RuntimeExecutionStartedBeforeEvidence: false,
    cm0595IssuanceRecordId: 'docs/CM-0649_AUTHORIZED_WRITE_PATH_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md',
    cm0595ExecutionEvidenceAvailable: true,
    cm0595ExecutionEvidenceDecision: 'CM0595_EXECUTED_EXACTLY_ONE_WRITE_ONLY',
    cm0595DurableMemoryWriteCount: 1,
    cm0595WritePathAuditSideEffectCount: 1,
    cm0595ExecutedExactlyOneWrite: true,
    cm0595FailedClosedWithZeroWrites: false,
    cm0595ExecutionEvidenceRecordId: 'docs/CM-0650_AUTHORIZED_WRITE_PATH_CM0595_EXECUTION_EVIDENCE_TEMPLATE.md',
    noAdditionalDurableWriteBeyondCm0595: true,
    boundedRecallNotYetEntered: true,
    noSearchProviderConfigStartupPersistenceDriftSinceWrite: true,
    scopeStillLimitedToCm0595: true,
    forbiddenActionsStillForbidden: true,
    boundedRecallApprovalAlreadyIssued: false,
    boundedRecallExecutionAlreadyStarted: false,
    boundedRecallPrepareOnlyScopeStillBounded: true
  };
}

test('bounded recall preparation fixture parses with expected schema', () => {
  assert.equal(fixture.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(fixture.mode, EXPECTED_MODE);
});

test('bounded recall preparation reports current blocked fail-closed state by default', () => {
  const report = evaluateAuthorizedWritePathBoundedRecallPreparationReview(fixture);
  assert.equal(report.status, 'blocked_fail_closed');
  assert.equal(report.decision, 'BOUNDED_RECALL_APPROVAL_NOT_READY');
  assert.equal(report.controllingState, 'RC_NOT_READY_BLOCKED');
  assert.equal(report.boundedRecallApprovalPrepared, false);
  assert.equal(report.canExecuteBoundedRecallNow, false);
  assert.equal(report.canExecuteRuntimeNow, false);
  assert.ok(report.boundedRecallChecklistFailures.includes('B3'));
  assert.equal(
    report.boundedRecallCommandPreviewBundle.bundleKind,
    'bounded_recall_review_command_bundle_blocked'
  );
  assert.equal(
    report.boundedRecallCommandPreviewBundle.resolvedRecordPathMode,
    'placeholder_only'
  );
  assert.equal(
    report.boundedRecallApprovalIssuanceRecordDraft.draftKind,
    'bounded_recall_approval_issuance_record_draft_blocked'
  );
  assert.equal(
    report.boundedRecallExecutionEvidenceDraft.draftKind,
    'bounded_recall_execution_evidence_draft_blocked'
  );
});

test('bounded recall preparation can prepare exact approval only after future CM-0595 closeout is recorded', () => {
  const report = evaluateAuthorizedWritePathBoundedRecallPreparationReview(buildReadyInput());
  assert.equal(report.status, 'prepared_exact_only');
  assert.equal(report.decision, 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY');
  assert.equal(report.boundedRecallApprovalPrepared, true);
  assert.equal(report.canPrepareBoundedRecallExactApproval, true);
  assert.equal(report.canExecuteBoundedRecallNow, false);
  assert.equal(report.canExecuteRuntimeNow, false);
  assert.equal(report.boundedRecallChecklistFailures.length, 0);
  assert.equal(report.boundedRecallApprovalLinePreview.previewUsableNow, true);
  assert.equal(
    report.boundedRecallCommandPreviewBundle.bundleKind,
    'bounded_recall_exact_approval_review_command_bundle'
  );
  assert.equal(
    report.boundedRecallOperatorPacketDraft.boundedRecallMayExecuteNow,
    false
  );
  assert.equal(
    report.boundedRecallOperatorPacketDraft.commandPreviewBundle.bundleKind,
    'bounded_recall_exact_approval_review_command_bundle'
  );
  assert.equal(
    report.boundedRecallApprovalIssuanceRecordDraft.draftUsableNow,
    true
  );
  assert.equal(
    report.boundedRecallApprovalIssuanceRecordDraft.issuanceTemplateRef,
    'docs/CM-0658_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md'
  );
  assert.equal(
    report.boundedRecallExecutionEvidenceDraft.draftUsableNow,
    true
  );
  assert.equal(
    report.boundedRecallExecutionEvidenceDraft.executionEvidenceTemplateRef,
    'docs/CM-0659_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE.md'
  );
  assert.match(
    report.renderedBoundedRecallTextSurface.markdown,
    /## Next Record Drafts/
  );
});

test('bounded recall preparation aborts on drift after closeout-ready state', () => {
  const driftInput = {
    ...buildReadyInput(),
    boundedRecallExecutionAlreadyStarted: true
  };
  const report = evaluateAuthorizedWritePathBoundedRecallPreparationReview(driftInput);
  assert.equal(report.status, 'aborted_drift');
  assert.equal(report.decision, 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT');
  assert.ok(report.failClosedReasons.includes('bounded_recall_already_issued_or_started'));
});

test('bounded recall preparation fails closed for malformed input and does not pass through unknown fields', () => {
  const malformed = evaluateAuthorizedWritePathBoundedRecallPreparationReview({
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    mode: EXPECTED_MODE,
    unknownField: 'secret-value'
  });
  assert.equal(malformed.decision, 'BOUNDED_RECALL_APPROVAL_NOT_READY');
  assert.ok(malformed.failClosedReasons.includes('controlling_map_or_operator_state_drift'));
  assert.equal(
    Object.prototype.hasOwnProperty.call(malformed, 'unknownField'),
    false
  );
});
