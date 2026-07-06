'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  runAuthenticatedHttpBoundedMutationProofReport
} = require('../src/core/AuthenticatedHttpBoundedMutationProofRunner');
const {
  buildAuthenticatedHttpBoundedMutationProofRouteSummary
} = require('../src/core/AuthenticatedHttpBoundedMutationProofRouteSummary');
const {
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS,
  buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake
} = require('../src/core/AuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake');

function assertNoForbiddenIntakeMaterial(payload) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /http:\/\/127\.0\.0\.1/i);
  assert.doesNotMatch(serialized, /\bBearer\b/i);
  assert.doesNotMatch(serialized, /\bAuthorization\b/i);
  assert.doesNotMatch(serialized, /codex-memory-http-bounded-mutation-proof/i);
  assert.doesNotMatch(serialized, /http-runner-tombstone-memory/i);
  assert.doesNotMatch(serialized, /http-runner-supersede-old-memory/i);
  assert.doesNotMatch(serialized, /http-runner-supersede-new-memory/i);
  assert.doesNotMatch(serialized, /Synthetic temp-local chunk/i);
  assert.doesNotMatch(serialized, /abc1234def5678/i);
}

async function buildAcceptedRouteSummary() {
  const report = await runAuthenticatedHttpBoundedMutationProofReport({ family: 'both' });
  const routeSummary = buildAuthenticatedHttpBoundedMutationProofRouteSummary(report);

  assert.equal(routeSummary.accepted, true);
  assert.equal(routeSummary.status, 'ok');
  return routeSummary;
}

test('bounded cleanup suppression route-only intake is wired but blocked by aggregator authority requirements', async () => {
  const routeSummary = await buildAcceptedRouteSummary();
  const intake = buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake(routeSummary);

  assert.equal(intake.schemaVersion, 'authenticated-http-bounded-mutation-proof-runtime-evidence-intake-v1');
  assert.equal(intake.status, 'blocked');
  assert.equal(intake.accepted, false);
  assert.equal(intake.routeSummaryAccepted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.runnerExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.commandsExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.localRuntimeEvidenceMatrixExecuted, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.allowlistedFinalRcEvidenceRunnerExecuted, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.currentHeadCommitProvided, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.expectedCurrentHeadCommitProvided, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.evidenceGeneratedAtProvided, false);
  assert.equal(intake.validationAggregatorBridge.accepted, false);
  assert.equal(intake.validationAggregatorBridge.rejected, true);
  assert.equal(
    intake.validationAggregatorBridge.rejectReason,
    'source_runtime_matrix_execution_required'
  );
  assert.equal(intake.validationAggregatorReport.runtimeEvidenceSummaryAccepted, false);
  assert.equal(intake.validationAggregatorReport.runtimeEvidenceSummaryRejected, true);
  assert.equal(intake.disclosure.currentHeadCommitIncluded, false);
  assert.equal(intake.disclosure.expectedCurrentHeadCommitIncluded, false);
  assert.equal(intake.safety.providerCalls, 0);
  assert.equal(intake.safety.readinessClaimed, false);
  assert.ok(
    intake.blockers.includes(
      'validation_aggregator_runtime_evidence_summary_source_runtime_matrix_execution_required'
    )
  );
  assertNoForbiddenIntakeMaterial(intake);
});

test('bounded cleanup suppression route intake is accepted only with exact supplied runtime summary metadata', async () => {
  const routeSummary = await buildAcceptedRouteSummary();
  const intake = buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake(routeSummary, {
    currentHeadCommit: 'abc1234def5678',
    expectedCurrentHeadCommit: 'abc1234def5678',
    evidenceGeneratedAt: '2026-07-07T00:30:00.000Z',
    generatedAt: '2026-07-07T01:00:00.000Z',
    evidenceUnitIds: [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS],
    localRuntimeEvidenceMatrixExecuted: true,
    allowlistedFinalRcEvidenceRunnerExecuted: true
  });

  assert.equal(intake.status, 'ok');
  assert.equal(
    intake.decision,
    'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_INTAKE_ACCEPTED_NOT_READY'
  );
  assert.equal(intake.accepted, true);
  assert.equal(intake.routeSummaryAccepted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.runnerExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.commandsExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.localRuntimeEvidenceMatrixExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.allowlistedFinalRcEvidenceRunnerExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.finalRcMatrixExecuted, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.fullFinalRcMatrixExecuted, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.runtimeReady, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.finalRcMatrixReady, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.v1RcReady, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.rcReady, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.currentHeadCommitProvided, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.expectedCurrentHeadCommitProvided, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.evidenceGeneratedAtProvided, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.evidenceUnitCount, 5);
  assert.equal(intake.validationAggregatorBridge.status, 'explicit_runtime_evidence_summary_available');
  assert.equal(intake.validationAggregatorBridge.accepted, true);
  assert.equal(intake.validationAggregatorBridge.rejected, false);
  assert.equal(intake.validationAggregatorBridge.rejectReason, '');
  assert.equal(intake.validationAggregatorBridge.currentHeadBindingStatus, 'matched');
  assert.equal(intake.validationAggregatorBridge.currentHeadBindingMatched, true);
  assert.equal(intake.validationAggregatorBridge.evidenceFreshnessStatus, 'fresh');
  assert.equal(intake.validationAggregatorBridge.evidenceUnitCount, 5);
  assert.equal(intake.validationAggregatorBridge.requiredEvidenceUnitCount, 5);
  assert.equal(intake.validationAggregatorBridge.missingEvidenceUnitCount, 0);
  assert.equal(intake.validationAggregatorBridge.unknownEvidenceUnitCount, 0);
  assert.equal(intake.validationAggregatorBridge.duplicateEvidenceUnitCount, 0);
  assert.equal(intake.validationAggregatorBridge.evidenceUnitsComplete, true);
  assert.equal(intake.validationAggregatorBridge.canClaimV1RcReady, false);
  assert.equal(intake.validationAggregatorReport.decision, 'NOT_READY_BLOCKED');
  assert.equal(
    intake.validationAggregatorReport.runtimeEvidenceSummaryStatus,
    'explicit_runtime_evidence_summary_available'
  );
  assert.equal(intake.validationAggregatorReport.runtimeEvidenceSummaryAccepted, true);
  assert.equal(intake.validationAggregatorReport.runtimeEvidenceSummaryRejected, false);
  assert.equal(intake.validationAggregatorReport.canClaimRuntimeReady, false);
  assert.equal(intake.validationAggregatorReport.canClaimFinalRcReady, false);
  assert.equal(intake.validationAggregatorReport.canClaimV1RcReady, false);
  assert.equal(intake.validationAggregatorReport.canClaimRcReady, false);
  assert.equal(intake.disclosure.currentHeadCommitIncluded, false);
  assert.equal(intake.disclosure.expectedCurrentHeadCommitIncluded, false);
  assert.equal(intake.safety.providerCalls, 0);
  assert.equal(intake.safety.durablePrivateMemoryWrite, false);
  assert.equal(intake.safety.realPrivateMemoryAccess, false);
  assert.equal(intake.safety.readinessClaimed, false);
  assert.deepEqual(intake.blockers, []);
  assertNoForbiddenIntakeMaterial(intake);
});
