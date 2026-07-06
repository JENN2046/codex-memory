'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const {
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS
} = require('../src/core/AuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake');
const {
  buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport
} = require('../src/core/AuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join('src', 'cli', 'authenticated-http-bounded-mutation-runtime-evidence.js');
const fixtureCommit = 'abc1234def5678';

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      NODE_NO_WARNINGS: '1',
      CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
    }
  });
}

function parseJson(result) {
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

function assertNoForbiddenMaterial(payload) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /http:\/\/127\.0\.0\.1/i);
  assert.doesNotMatch(serialized, /\bBearer\b/i);
  assert.doesNotMatch(serialized, /\bAuthorization\b/i);
  assert.doesNotMatch(serialized, /codex-memory-http-bounded-mutation-proof/i);
  assert.doesNotMatch(serialized, /bounded-cleanup-proof-runner/i);
  assert.doesNotMatch(serialized, /http-runner-tombstone-memory/i);
  assert.doesNotMatch(serialized, /http-runner-supersede-old-memory/i);
  assert.doesNotMatch(serialized, /http-runner-supersede-new-memory/i);
  assert.doesNotMatch(serialized, /Synthetic temp-local chunk/i);
  assert.doesNotMatch(serialized, new RegExp(fixtureCommit, 'i'));
}

function exactMetadata() {
  return {
    currentHeadCommit: fixtureCommit,
    expectedCurrentHeadCommit: fixtureCommit,
    evidenceGeneratedAt: '2026-07-07T00:30:00.000Z',
    generatedAt: '2026-07-07T01:00:00.000Z',
    evidenceUnitIds: [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS],
    localRuntimeEvidenceMatrixExecuted: true,
    allowlistedFinalRcEvidenceRunnerExecuted: true
  };
}

function assertCommonLowDisclosureReport(report) {
  assert.equal(
    report.schemaVersion,
    'authenticated-http-bounded-mutation-proof-runtime-evidence-report-v1'
  );
  assert.equal(
    report.reportType,
    'authenticated_http_bounded_cleanup_suppression_runtime_evidence_aggregation_report'
  );
  assert.equal(report.sourceRouteSummary.accepted, true);
  assert.equal(report.sourceRouteSummary.routeFamily, 'bounded_cleanup_suppression');
  assert.equal(report.sourceRouteSummary.receiptCount, 2);
  assert.equal(report.sourceRouteSummary.acceptedReceiptCount, 2);
  assert.equal(report.sourceRouteSummary.mutationFamiliesComplete, true);
  assert.equal(report.runtimeEvidenceArtifact.aggregatorInputFed, true);
  assert.equal(
    report.runtimeEvidenceArtifact.aggregationPath,
    'ValidationAggregatorService.buildV1RcValidationAggregatorReport'
  );
  assert.equal(report.artifact.jsonStdoutOnly, true);
  assert.equal(report.artifact.fileWritten, false);
  assert.equal(report.artifact.durableArtifactWritten, false);
  assert.equal(report.disclosure.lowDisclosure, true);
  assert.equal(report.disclosure.currentHeadCommitIncluded, false);
  assert.equal(report.disclosure.expectedCurrentHeadCommitIncluded, false);
  assert.equal(report.disclosure.endpointOrLocatorIncluded, false);
  assert.equal(report.disclosure.rawResponseIncluded, false);
  assert.equal(report.safety.tempLocalOnly, true);
  assert.equal(report.safety.syntheticOnly, true);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.publicMcpExpansion, false);
  assert.equal(report.safety.durablePrivateMemoryWrite, false);
  assert.equal(report.safety.realPrivateMemoryAccess, false);
  assert.equal(report.safety.endpointOrLocatorReturned, false);
  assert.equal(report.safety.rawResponseReturned, false);
  assert.equal(report.safety.readinessClaimed, false);
  assertNoForbiddenMaterial(report);
}

test('runtime evidence report runner emits low-disclosure blocked aggregation by default', async () => {
  const report = await buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport({
    generatedAt: '2026-07-07T01:00:00.000Z'
  });

  assertCommonLowDisclosureReport(report);
  assert.equal(report.status, 'blocked');
  assert.equal(
    report.decision,
    'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_AGGREGATION_BLOCKED'
  );
  assert.equal(report.accepted, false);
  assert.equal(report.intake.accepted, false);
  assert.equal(report.intake.validationAggregatorBridgeAccepted, false);
  assert.equal(report.intake.validationAggregatorBridgeRejected, true);
  assert.equal(
    report.intake.validationAggregatorBridgeRejectReason,
    'source_runtime_matrix_execution_required'
  );
  assert.equal(report.runtimeEvidenceArtifact.status, 'blocked_by_validation_aggregator');
  assert.equal(
    report.runtimeEvidenceArtifact.runtimeEvidenceSummary.localRuntimeEvidenceMatrixExecuted,
    false
  );
  assert.equal(
    report.runtimeEvidenceArtifact.runtimeEvidenceSummary.allowlistedFinalRcEvidenceRunnerExecuted,
    false
  );
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorBridge.accepted, false);
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorReport.canClaimV1RcReady, false);
  assert.ok(report.blockers.includes('runtime_evidence_intake_not_accepted'));
});

test('runtime evidence report runner feeds exact metadata to aggregator without disclosing raw values', async () => {
  const report = await buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport(exactMetadata());

  assertCommonLowDisclosureReport(report);
  assert.equal(report.status, 'ok');
  assert.equal(
    report.decision,
    'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_AGGREGATION_ACCEPTED_NOT_READY'
  );
  assert.equal(report.accepted, true);
  assert.equal(report.intake.accepted, true);
  assert.equal(report.intake.validationAggregatorBridgeAccepted, true);
  assert.equal(report.intake.validationAggregatorBridgeRejected, false);
  assert.equal(report.intake.validationAggregatorBridgeRejectReason, '');
  assert.equal(report.intake.validationAggregatorReportDecision, 'NOT_READY_BLOCKED');
  assert.equal(report.intake.canClaimRuntimeReady, false);
  assert.equal(report.intake.canClaimFinalRcReady, false);
  assert.equal(report.intake.canClaimV1RcReady, false);
  assert.equal(report.runtimeEvidenceArtifact.status, 'accepted_by_validation_aggregator');
  assert.equal(
    report.runtimeEvidenceArtifact.runtimeEvidenceSummary.localRuntimeEvidenceMatrixExecuted,
    true
  );
  assert.equal(
    report.runtimeEvidenceArtifact.runtimeEvidenceSummary.allowlistedFinalRcEvidenceRunnerExecuted,
    true
  );
  assert.equal(report.runtimeEvidenceArtifact.runtimeEvidenceSummary.evidenceUnitCount, 5);
  assert.equal(report.runtimeEvidenceArtifact.runtimeEvidenceSummary.currentHeadCommitProvided, true);
  assert.equal(report.runtimeEvidenceArtifact.runtimeEvidenceSummary.expectedCurrentHeadCommitProvided, true);
  assert.equal(report.runtimeEvidenceArtifact.runtimeEvidenceSummary.evidenceGeneratedAtProvided, true);
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorBridge.status, 'explicit_runtime_evidence_summary_available');
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorBridge.currentHeadBindingStatus, 'matched');
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorBridge.currentHeadBindingMatched, true);
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorBridge.evidenceFreshnessStatus, 'fresh');
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorBridge.evidenceUnitsComplete, true);
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorReport.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(report.blockers, []);
});

test('runtime evidence CLI default report is blocked but aggregator-fed and low-disclosure', () => {
  const result = runCli(['--json', '--generated-at', '2026-07-07T01:00:00.000Z']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assertCommonLowDisclosureReport(report);
  assert.equal(report.status, 'blocked');
  assert.equal(report.accepted, false);
  assert.equal(report.runtimeEvidenceArtifact.aggregatorInputFed, true);
  assert.equal(report.intake.validationAggregatorBridgeRejectReason, 'source_runtime_matrix_execution_required');
});

test('runtime evidence CLI accepts explicit metadata while keeping readiness false', () => {
  const result = runCli([
    '--json',
    '--current-head',
    fixtureCommit,
    '--expected-current-head',
    fixtureCommit,
    '--evidence-generated-at',
    '2026-07-07T00:30:00.000Z',
    '--generated-at',
    '2026-07-07T01:00:00.000Z',
    '--evidence-units',
    REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS.join(','),
    '--local-runtime-matrix-executed',
    '--allowlisted-final-rc-evidence-runner-executed'
  ]);
  assert.equal(result.status, 0, result.stderr);
  const report = parseJson(result);

  assertCommonLowDisclosureReport(report);
  assert.equal(report.status, 'ok');
  assert.equal(report.accepted, true);
  assert.equal(report.intake.validationAggregatorBridgeAccepted, true);
  assert.equal(report.runtimeEvidenceArtifact.validationAggregatorReport.canClaimV1RcReady, false);
  assert.equal(report.safety.readinessClaimed, false);
});

test('runtime evidence CLI rejects unsafe flags without running the proof path', () => {
  const result = runCli(['--json', '--provider']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_AGGREGATION_REJECTED_UNSAFE_FLAG'
  );
  assert.equal(report.accepted, false);
  assert.equal(report.rejectedFlag, '--provider');
  assert.equal(report.runtimeEvidenceArtifact, null);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.artifact.fileWritten, false);
  assertNoForbiddenMaterial(report);
});

test('runtime evidence CLI help documents aggregation metadata and local-only posture', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /authenticated-http-bounded-mutation-runtime-evidence\.js/);
  assert.match(result.stdout, /feeds it into the validation aggregator intake path/);
  assert.match(result.stdout, /--evidence-units/);
  assert.match(result.stdout, /writes no report file/);
  assert.match(result.stdout, /makes no provider calls/);
});
