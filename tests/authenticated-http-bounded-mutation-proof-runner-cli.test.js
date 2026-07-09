'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join('src', 'cli', 'authenticated-http-bounded-mutation-proof.js');

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

function assertLowDisclosureReport(report, {
  expectedReceiptCount,
  expectedFamilies
} = {}) {
  assert.equal(report.schemaVersion, 'authenticated-http-bounded-mutation-proof-report-v1');
  assert.equal(report.status, 'ok');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REPORT_ACCEPTED_NOT_READY');
  assert.equal(report.accepted, true);
  assert.equal(report.receiptCount, expectedReceiptCount);
  assert.equal(report.acceptedReceiptCount, expectedReceiptCount);
  assert.deepEqual(report.mutationFamilies, expectedFamilies);
  assert.equal(report.safety.tempLocalOnly, true);
  assert.equal(report.safety.syntheticOnly, true);
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, true);
  assert.equal(report.safety.endpointOrLocatorReturned, false);
  assert.equal(report.safety.tokenReturned, false);
  assert.equal(report.safety.pathReturned, false);
  assert.equal(report.safety.memoryIdReturned, false);
  assert.equal(report.safety.rawContentReturned, false);
  assert.equal(report.safety.rawResponseReturned, false);
  assert.equal(report.safety.rawErrorReturned, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.publicMcpExpansion, false);
  assert.equal(report.safety.readinessClaimed, false);
  assert.equal(report.safety.releaseClaimed, false);
  assert.equal(report.safety.rcReadyClaimed, false);
  assert.equal(report.artifact.jsonStdoutOnly, true);
  assert.equal(report.artifact.fileWritten, false);
  assert.equal(report.artifact.durableArtifactWritten, false);

  for (const receipt of report.receipts) {
    assert.equal(receipt.accepted, true);
    assert.equal(receipt.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_ACCEPTED_NOT_READY');
    assert.equal(receipt.disclosure.lowDisclosure, true);
    assert.equal(receipt.disclosure.endpointOrLocatorIncluded, false);
    assert.equal(receipt.disclosure.pathIncluded, false);
    assert.equal(receipt.disclosure.memoryIdIncluded, false);
    assert.equal(receipt.disclosure.tokenIncluded, false);
    assert.equal(receipt.disclosure.rawContentIncluded, false);
    assert.equal(receipt.disclosure.rawResponseIncluded, false);
    assert.equal(receipt.disclosure.rawErrorIncluded, false);
    assert.equal(receipt.publicHttpBoundary.publicPathRejected, true);
    assert.equal(receipt.publicHttpBoundary.publicMutationPerformed, false);
    assert.equal(receipt.publicHttpBoundary.countsChanged, false);
    assert.equal(receipt.internalRuntimeBoundary.internalMutationPerformed, true);
    assert.equal(receipt.internalRuntimeBoundary.targetProjectionResidualsCleared, true);
    assert.equal(receipt.safety.readinessClaimed, false);
    assert.deepEqual(receipt.blockers, []);
  }
}

function assertOutputHasNoRawRuntimeValues(stdout) {
  assert.doesNotMatch(stdout, /http:\/\/127\.0\.0\.1/i);
  assert.doesNotMatch(stdout, /\bBearer\b/i);
  assert.doesNotMatch(stdout, /\bAuthorization\b/i);
  assert.doesNotMatch(stdout, /codex-memory-http-bounded-mutation-proof/i);
  assert.doesNotMatch(stdout, /http-runner-tombstone-memory/i);
  assert.doesNotMatch(stdout, /http-runner-supersede-old-memory/i);
  assert.doesNotMatch(stdout, /http-runner-supersede-new-memory/i);
  assert.doesNotMatch(stdout, /Synthetic temp-local chunk/i);
  assert.doesNotMatch(stdout, /bounded-cleanup-proof-runner/i);
}

function assertLowDisclosureRouteSummary(summary) {
  assert.equal(summary.schemaVersion, 'authenticated-http-bounded-mutation-proof-route-summary-v1');
  assert.equal(summary.summaryType, 'authenticated_http_bounded_cleanup_suppression_route_summary');
  assert.equal(summary.status, 'ok');
  assert.equal(
    summary.decision,
    'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_ROUTE_SUMMARY_ACCEPTED_NOT_READY'
  );
  assert.equal(summary.accepted, true);
  assert.equal(summary.routeFamily, 'bounded_cleanup_suppression');
  assert.equal(summary.sourceReport.schemaVersion, 'authenticated-http-bounded-mutation-proof-report-v1');
  assert.equal(summary.sourceReport.status, 'ok');
  assert.equal(summary.sourceReport.accepted, true);
  assert.equal(summary.receiptCount, 2);
  assert.equal(summary.acceptedReceiptCount, 2);
  assert.deepEqual(summary.mutationFamilies.required, ['tombstone_memory', 'supersede_memory']);
  assert.deepEqual(summary.mutationFamilies.observed, ['supersede_memory', 'tombstone_memory']);
  assert.deepEqual(summary.mutationFamilies.missing, []);
  assert.equal(summary.mutationFamilies.complete, true);
  assert.equal(summary.proofCoverage.authenticatedHttpRuntimeObserved, true);
  assert.equal(summary.proofCoverage.publicConfirmedMutationSuppressionProven, true);
  assert.equal(summary.proofCoverage.internalCleanupSuppressionProven, true);
  assert.equal(summary.proofCoverage.targetProjectionResidualSuppressionProven, true);
  assert.equal(summary.proofCoverage.replacementProjectionRetentionProven, true);
  assert.equal(summary.proofCoverage.receiptCoverageComplete, true);
  assert.equal(summary.disclosure.lowDisclosure, true);
  assert.equal(summary.disclosure.endpointOrLocatorIncluded, false);
  assert.equal(summary.disclosure.tokenIncluded, false);
  assert.equal(summary.disclosure.memoryIdIncluded, false);
  assert.equal(summary.disclosure.rawContentIncluded, false);
  assert.equal(summary.disclosure.rawResponseIncluded, false);
  assert.equal(summary.artifact.jsonStdoutOnly, true);
  assert.equal(summary.artifact.fileWritten, false);
  assert.equal(summary.artifact.durableArtifactWritten, false);
  assert.equal(summary.safety.tempLocalOnly, true);
  assert.equal(summary.safety.syntheticOnly, true);
  assert.equal(summary.safety.providerCalls, 0);
  assert.equal(summary.safety.publicMcpExpansion, false);
  assert.equal(summary.safety.durablePrivateMemoryWrite, false);
  assert.equal(summary.safety.realPrivateMemoryAccess, false);
  assert.equal(summary.safety.endpointOrLocatorReturned, false);
  assert.equal(summary.safety.tokenReturned, false);
  assert.equal(summary.safety.memoryIdReturned, false);
  assert.equal(summary.safety.rawContentReturned, false);
  assert.equal(summary.safety.readinessClaimed, false);
  assert.equal(summary.safety.releaseClaimed, false);
  assert.equal(summary.safety.rcReadyClaimed, false);
  assert.equal(summary.safety.tempLocalSyntheticStoreMutationObserved, true);
  assert.equal(
    summary.runtimeEvidenceSummaryCandidate.status,
    'local_bounded_cleanup_suppression_evidence_passed_rc_still_blocked'
  );
  assert.equal(summary.runtimeEvidenceSummaryCandidate.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.runtimeEvidenceSummaryCandidate.runnerExecuted, true);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.commandsExecuted, true);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.localRuntimeEvidenceMatrixExecuted, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.allowlistedFinalRcEvidenceRunnerExecuted, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.runtimeReady, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.finalRcMatrixReady, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.v1RcReady, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.rcReady, false);
  assert.deepEqual(summary.runtimeEvidenceSummaryCandidate.criticalGates, {
    total: 2,
    passed: 2,
    failed: 0,
    allCriticalCommandsPassed: true
  });
  assert.deepEqual(summary.runtimeEvidenceSummaryCandidate.locallyEvidencedRuntimeGaps, [
    'authenticated_http_bounded_cleanup_suppression_route_summary'
  ]);
  assert.ok(
    summary.runtimeEvidenceSummaryCandidate.remainingRuntimeGaps.includes(
      'real_private_memory_cleanup_suppression_not_executed'
    )
  );
  assert.equal(summary.runtimeEvidenceSummaryCandidate.safety.mutated, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.safety.providerCalls, 0);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.safety.writesDurableMemory, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.safety.readsRealMemory, false);
  assert.deepEqual(summary.blockers, []);
}

test('authenticated HTTP bounded mutation proof CLI emits low-disclosure JSON report for both families', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = parseJson(result);

  assertLowDisclosureReport(report, {
    expectedReceiptCount: 2,
    expectedFamilies: ['tombstone_memory', 'supersede_memory']
  });
  assert.deepEqual(report.receipts.map(receipt => receipt.mutationFamily), [
    'tombstone_memory',
    'supersede_memory'
  ]);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI emits route summary for aggregator intake', () => {
  const result = runCli(['--json', '--summary']);
  assert.equal(result.status, 0, result.stderr);
  const summary = parseJson(result);

  assertLowDisclosureRouteSummary(summary);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI route summary blocks incomplete family coverage', () => {
  const result = runCli(['--json', '--summary', '--family', 'tombstone_memory']);
  assert.equal(result.status, 1);
  const summary = parseJson(result);

  assert.equal(summary.schemaVersion, 'authenticated-http-bounded-mutation-proof-route-summary-v1');
  assert.equal(summary.status, 'blocked');
  assert.equal(summary.accepted, false);
  assert.equal(summary.routeFamily, 'bounded_cleanup_suppression');
  assert.deepEqual(summary.mutationFamilies.missing, ['supersede_memory']);
  assert.equal(summary.proofCoverage.receiptCoverageComplete, false);
  assert.ok(summary.blockers.includes('required_mutation_family_missing'));
  assert.ok(summary.blockers.includes('required_receipt_coverage_incomplete'));
  assert.equal(summary.runtimeEvidenceSummaryCandidate.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.runtimeEvidenceSummaryCandidate.runtimeReady, false);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.criticalGates.passed, 1);
  assert.equal(summary.runtimeEvidenceSummaryCandidate.criticalGates.failed, 1);
  assert.equal(summary.safety.readinessClaimed, false);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI route summary text mode renders low-disclosure summary', () => {
  const result = runCli(['--summary']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /status: ok/);
  assert.match(
    result.stdout,
    /AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_ROUTE_SUMMARY_ACCEPTED_NOT_READY/
  );
  assert.match(result.stdout, /accepted: true/);
  assert.match(result.stdout, /receiptCount: 2/);
  assert.match(result.stdout, /mutationFamilies: supersede_memory, tombstone_memory/);
  assert.match(result.stdout, /endpointOrLocatorReturned: false/);
  assert.match(result.stdout, /tokenReturned: false/);
  assert.match(result.stdout, /rawContentReturned: false/);
  assert.match(result.stdout, /providerCalls: 0/);
  assert.match(result.stdout, /fileWritten: false/);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI route-only intake reaches aggregator and remains blocked', () => {
  const result = runCli(['--json', '--intake']);
  assert.equal(result.status, 1);
  const intake = parseJson(result);

  assert.equal(
    intake.schemaVersion,
    'authenticated-http-bounded-mutation-proof-runtime-evidence-intake-v1'
  );
  assert.equal(intake.status, 'blocked');
  assert.equal(
    intake.decision,
    'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_INTAKE_BLOCKED'
  );
  assert.equal(intake.accepted, false);
  assert.equal(intake.routeSummaryAccepted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.runnerExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.commandsExecuted, true);
  assert.equal(intake.runtimeEvidenceSummaryIntake.localRuntimeEvidenceMatrixExecuted, false);
  assert.equal(intake.runtimeEvidenceSummaryIntake.allowlistedFinalRcEvidenceRunnerExecuted, false);
  assert.equal(intake.validationAggregatorBridge.accepted, false);
  assert.equal(intake.validationAggregatorBridge.rejected, true);
  assert.equal(
    intake.validationAggregatorBridge.rejectReason,
    'source_runtime_matrix_execution_required'
  );
  assert.equal(intake.validationAggregatorReport.runtimeEvidenceSummaryAccepted, false);
  assert.equal(intake.validationAggregatorReport.runtimeEvidenceSummaryRejected, true);
  assert.equal(intake.validationAggregatorReport.canClaimV1RcReady, false);
  assert.equal(intake.disclosure.currentHeadCommitIncluded, false);
  assert.equal(intake.disclosure.endpointOrLocatorIncluded, false);
  assert.equal(intake.safety.providerCalls, 0);
  assert.equal(intake.safety.readinessClaimed, false);
  assert.ok(
    intake.blockers.includes(
      'validation_aggregator_runtime_evidence_summary_source_runtime_matrix_execution_required'
    )
  );
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI can narrow to tombstone family', () => {
  const result = runCli(['--json', '--family', 'tombstone_memory']);
  assert.equal(result.status, 0, result.stderr);
  const report = parseJson(result);

  assertLowDisclosureReport(report, {
    expectedReceiptCount: 1,
    expectedFamilies: ['tombstone_memory']
  });
  assert.equal(report.receipts[0].mutationFamily, 'tombstone_memory');
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI text mode preserves low-disclosure summary', () => {
  const result = runCli([]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /status: ok/);
  assert.match(result.stdout, /accepted: true/);
  assert.match(result.stdout, /receiptCount: 2/);
  assert.match(result.stdout, /endpointOrLocatorReturned: false/);
  assert.match(result.stdout, /tokenReturned: false/);
  assert.match(result.stdout, /memoryIdReturned: false/);
  assert.match(result.stdout, /rawContentReturned: false/);
  assert.match(result.stdout, /providerCalls: 0/);
  assert.match(result.stdout, /fileWritten: false/);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI rejects unsafe flags without running proof', () => {
  const result = runCli(['--json', '--provider']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSAFE_FLAG');
  assert.equal(report.accepted, false);
  assert.equal(report.rejectedFlag, '--provider');
  assert.equal(report.receiptCount, 0);
  assert.equal(report.acceptedReceiptCount, 0);
  assert.deepEqual(report.mutationFamilies, []);
  assert.deepEqual(report.receipts, []);
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.artifact.fileWritten, false);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI rejects unsafe family value before runtime load', () => {
  const result = runCli(['--json', '--family', '--provider']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSAFE_FLAG');
  assert.equal(report.rejectedFlag, '--provider');
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, false);
  assert.deepEqual(report.receipts, []);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI unsupported family returns non-runtime error report', () => {
  const result = runCli(['--json', '--family', 'unsupported_family']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSUPPORTED_FAMILY');
  assert.equal(report.accepted, false);
  assert.equal(report.receiptCount, 0);
  assert.equal(report.acceptedReceiptCount, 0);
  assert.deepEqual(report.mutationFamilies, []);
  assert.deepEqual(report.blockers, ['unsupported_mutation_family']);
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, false);
  assert.equal(report.artifact.fileWritten, false);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI help documents local-only evidence mode', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Usage: node src\/cli\/authenticated-http-bounded-mutation-proof\.js/);
  assert.match(result.stdout, /temp-local synthetic authenticated HTTP bounded mutation proof/);
  assert.match(result.stdout, /--summary/);
  assert.match(result.stdout, /--intake/);
  assert.match(result.stdout, /writes no report file/);
  assert.match(result.stdout, /makes no provider calls/);
});
