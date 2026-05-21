const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/authorized-write-path-bounded-recall-closeout-review-v1.json');
const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_MODE,
  evaluateAuthorizedWritePathBoundedRecallCloseoutReview
} = require('../src/core/AuthorizedWritePathBoundedRecallCloseoutReview');

function buildReadyInput() {
  return {
    ...fixture,
    boundedRecallIssuanceRecordAvailable: true,
    boundedRecallIssuanceDecision: 'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED',
    boundedRecallIssuedExactLineMatches: true,
    boundedRecallExecutionStartedBeforeEvidence: false,
    boundedRecallIssuanceRecordId: 'docs/CM-0658_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md',
    boundedRecallExecutionEvidenceAvailable: true,
    boundedRecallExecutionEvidenceDecision: 'BOUNDED_RECALL_PREPARATION_EXECUTED_APPROVAL_LINE_ONLY',
    preparedLaterApprovalLineCount: 1,
    boundedRecallExecutionCount: 0,
    boundedRecallPreparedExactlyOneLaterApproval: true,
    boundedRecallRuntimeStayedZero: true,
    boundedRecallExecutionEvidenceRecordId: 'docs/CM-0659_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE.md',
    noSearchRecordProviderConfigStartupPersistenceDriftSincePreparation: true,
    scopeStillLimitedToBoundedRecallPreparation: true,
    forbiddenActionsStillForbidden: true,
    stillForbiddenActions: [
      'bounded_recall_runtime_execution',
      'search_memory',
      'record_memory',
      'marker_search',
      'provider_call',
      'config_edit',
      'env_edit',
      'watchdog_startup_persistence',
      'public_mcp_expansion',
      'additional_durable_write',
      'readiness_claim'
    ]
  };
}

test('bounded-recall closeout fixture captures current blocked state', () => {
  assert.equal(fixture.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(fixture.mode, EXPECTED_MODE);
});

test('bounded-recall closeout stays fail-closed while later issuance/execution artifacts are absent', () => {
  const result = evaluateAuthorizedWritePathBoundedRecallCloseoutReview(fixture);
  assert.equal(result.status, 'blocked_fail_closed');
  assert.equal(result.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
  assert.equal(result.controllingState, 'RC_NOT_READY_BLOCKED');
  assert.equal(result.boundedRecallCloseoutReady, false);
  assert.equal(result.canExecuteBoundedRecallNow, false);
  assert.equal(result.canExecuteRuntimeNow, false);
  assert.ok(result.closeoutChecklistFailures.includes('R3'));
  assert.ok(result.closeoutChecklistFailures.includes('R4'));
  assert.equal(
    result.boundedRecallPreparationCommandPreviewBundle.bundleKind,
    'bounded_recall_preparation_command_bundle_blocked'
  );
  assert.equal(result.boundedRecallPreparationOperatorPacketDraft.draftUsableNow, false);
  assert.equal(
    result.renderedBoundedRecallPreparationPacketTextSurface.previewAvailable,
    true
  );
});

test('bounded-recall closeout can record prepared-later-approval-only while keeping runtime blocked', () => {
  const result = evaluateAuthorizedWritePathBoundedRecallCloseoutReview(buildReadyInput());
  assert.equal(result.status, 'recorded_prepared_later_approval_only');
  assert.equal(
    result.decision,
    'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY'
  );
  assert.equal(result.boundedRecallCloseoutReady, true);
  assert.equal(result.canPrepareFutureBoundedRecallRuntimeApprovalNext, true);
  assert.equal(result.canExecuteBoundedRecallNow, false);
  assert.equal(result.canExecuteRuntimeNow, false);
  assert.equal(result.closeoutChecklistFailures.length, 0);
  assert.equal(result.closeoutRecordDraft.draftUsableNow, true);
  assert.match(result.renderedCloseoutTextSurface.markdown, /## Recorded counts/);
  assert.equal(
    result.boundedRecallPreparationCommandPreviewBundle.bundleKind,
    'bounded_recall_preparation_command_bundle'
  );
  assert.equal(result.boundedRecallPreparationOperatorPacketDraft.draftUsableNow, true);
  assert.match(
    result.renderedBoundedRecallPreparationPacketTextSurface.markdown,
    /## Command Preview/
  );
});

test('bounded-recall closeout aborts on drift after later artifacts appear', () => {
  const result = evaluateAuthorizedWritePathBoundedRecallCloseoutReview({
    ...buildReadyInput(),
    scopeStillLimitedToBoundedRecallPreparation: false
  });
  assert.equal(result.status, 'aborted_drift');
  assert.equal(result.decision, 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT');
  assert.ok(
    result.failClosedReasons.includes('bounded_recall_preparation_scope_not_preserved')
  );
});

test('bounded-recall closeout normalizes allowlisted fields only', () => {
  const result = evaluateAuthorizedWritePathBoundedRecallCloseoutReview({
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    mode: EXPECTED_MODE,
    unknownField: 'secret'
  });
  assert.equal(result.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'unknownField'), false);
});
