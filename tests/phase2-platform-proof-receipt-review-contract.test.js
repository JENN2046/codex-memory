'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_EVIDENCE_MARKER
} = require('../src/core/Phase2NativeReadProofReceiptAuditIntakeContract');
const {
  CONTRACT_MODE,
  collectForbiddenFields,
  evaluatePhase2PlatformProofReceiptReviewContract
} = require('../src/core/Phase2PlatformProofReceiptReviewContract');

function zeroCounters() {
  return {
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    receiptReviews: 0,
    receiptApplications: 0,
    completionAuditPatchApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeTargetBindings: 0,
    nativeReadAttempts: 0,
    fallbackReads: 0,
    fallbackComparisons: 0,
    commandExecutions: 0,
    processInspections: 0,
    serviceStartStopActions: 0,
    responseBodyReads: 0,
    rawOutputReads: 0,
    rawAuditReads: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    providerApiCalls: 0,
    nativeWriteAttempts: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function contractInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    mode: CONTRACT_MODE,
    prerequisites: {
      cm2025ReceiptAuditIntakeAccepted: true,
      cm2037ReceiptSchemaCompatibilityAccepted: true,
      cm2038TargetBindingReceiptReviewAccepted: true,
      cm2039NativeReadProofReceiptReviewAccepted: true,
      cm2040FallbackDistinctionReceiptReviewAccepted: true,
      cm2041LowDisclosureProofReceiptReviewAccepted: true,
      cm2042AuditScopeReceiptReviewAccepted: true,
      traceMatrixStillRequiresExactReceiptEvidence: true,
      completionAuditStillRequiresWslLinuxProofPassed: true,
      completionAuditStillRequiresWindowsWslSmokePassed: true,
      localReviewDoesNotSatisfyPlatformProof: true
    },
    platformReview: {
      reviewPrepared: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      safeReferenceNameCategory: 'safe_reference_name_only',
      wslLinuxReceiptField: 'wslLinuxProofPassed',
      wslLinuxReceiptCategory: 'wslLinuxProofReceipt',
      wslLinuxObservedCategory: REQUIRED_EVIDENCE_MARKER,
      windowsWslSmokeReceiptField: 'windowsWslSmokePassed',
      windowsWslSmokeReceiptCategory: 'windowsWslSmokeReceipt',
      windowsWslSmokeObservedCategory: REQUIRED_EVIDENCE_MARKER,
      platformClassCategory: 'platform_class_category_only',
      wslLinuxProofCategory: 'wsl_linux_proof_category_only',
      windowsWslSmokeCategory: 'windows_wsl_smoke_category_only',
      smokeCommandCategory: 'smoke_command_category_only',
      categoryOnly: true,
      lowDisclosureOnly: true,
      endpointLocatorIncluded: false,
      targetValueIncluded: false,
      queryTextIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      commandTextIncluded: false,
      commandOutputIncluded: false,
      environmentVariablesIncluded: false,
      filePathsIncluded: false,
      logLinesIncluded: false,
      processDetailsIncluded: false,
      memoryContentIncluded: false,
      rawOutputIncluded: false,
      rawAuditIncluded: false,
      approvalLineIncluded: false,
      acceptedAsCompletionEvidenceNow: false
    },
    proposedCompletionEvidence: {
      phase2PlatformProofReceiptReviewPassed: true,
      wslLinuxProofPassed: REQUIRED_EVIDENCE_MARKER,
      windowsWslSmokePassed: REQUIRED_EVIDENCE_MARKER
    },
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    platformReview: {
      ...base.platformReview,
      ...(overrides.platformReview || {})
    },
    proposedCompletionEvidence: {
      ...base.proposedCompletionEvidence,
      ...(overrides.proposedCompletionEvidence || {})
    },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.phase2Completed, false);
  assert.equal(result.wslLinuxProofPassed, false);
  assert.equal(result.windowsWslSmokePassed, false);
  assert.equal(result.actualReceiptAccepted, false);
  assert.equal(result.receiptAppliedByThisContract, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.nativeTargetBindingPerformed, false);
  assert.equal(result.fallbackReadExecuted, false);
  assert.equal(result.fallbackComparisonExecuted, false);
  assert.equal(result.commandExecuted, false);
  assert.equal(result.processInspected, false);
  assert.equal(result.serviceStartedOrStopped, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawOutputRead, false);
  assert.equal(result.rawAuditRead, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2043 accepts category-only platform proof review without satisfying exact evidence', () => {
  const result = evaluatePhase2PlatformProofReceiptReviewContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase2_platform_proof_receipt_review_accepted');
  assert.equal(result.phase2PlatformProofReceiptReviewPassed, true);
  assert.equal(result.wslLinuxProofPassed, false);
  assert.equal(result.windowsWslSmokePassed, false);
  assert.deepEqual(result.proposedCompletionEvidence, {
    phase2PlatformProofReceiptReviewPassed: true,
    wslLinuxProofPassed: REQUIRED_EVIDENCE_MARKER,
    windowsWslSmokePassed: REQUIRED_EVIDENCE_MARKER,
    platformProofAcceptedAsCompletionEvidenceNow: false
  });
  assert.equal(result.receiptReviewBoundary.safeReferenceNameOnly, true);
  assert.equal(result.receiptReviewBoundary.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receiptReviewBoundary.exactAuthorizedWslLinuxProofStillRequired, true);
  assert.equal(result.receiptReviewBoundary.exactAuthorizedWindowsWslSmokeStillRequired, true);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesWslLinuxProofPassed, false);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesWindowsWslSmokePassed, false);
  assert.equal(result.receiptReviewBoundary.commandTextDisclosed, false);
  assert.equal(result.receiptReviewBoundary.commandOutputConsumed, false);
  assert.equal(result.receiptReviewBoundary.filePathsDisclosed, false);
  assert.equal(result.receiptReviewBoundary.logLinesDisclosed, false);
  assertNoSideEffects(result);
});

test('CM2043 rejects unsafe target reference names without echoing target values', () => {
  const result = evaluatePhase2PlatformProofReceiptReviewContract(contractInput({
    platformReview: {
      targetReferenceName: 'http://example.invalid/private-target'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('platformReview.targetReferenceName'));
  assert.equal(serialized.includes('example.invalid'), false);
  assertNoSideEffects(result);
});

test('CM2043 rejects attempts to mark platform proof receipts complete now', () => {
  const result = evaluatePhase2PlatformProofReceiptReviewContract(contractInput({
    platformReview: {
      wslLinuxObservedCategory: true,
      windowsWslSmokeObservedCategory: true,
      acceptedAsCompletionEvidenceNow: true
    },
    proposedCompletionEvidence: {
      wslLinuxProofPassed: 'accepted_now',
      windowsWslSmokePassed: 'accepted_now'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('platformReview.wslLinuxObservedCategory'));
  assert.ok(result.blockers.includes('platformReview.windowsWslSmokeObservedCategory'));
  assert.ok(result.blockers.includes('platformReview.acceptedAsCompletionEvidenceNow'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.wslLinuxProofPassed'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.windowsWslSmokePassed'));
  assert.equal(result.phase2PlatformProofReceiptReviewPassed, false);
  assertNoSideEffects(result);
});

test('CM2043 rejects missing prerequisite chain before platform proof receipt review', () => {
  const result = evaluatePhase2PlatformProofReceiptReviewContract(contractInput({
    prerequisites: {
      cm2042AuditScopeReceiptReviewAccepted: false,
      completionAuditStillRequiresWslLinuxProofPassed: false,
      completionAuditStillRequiresWindowsWslSmokePassed: false,
      localReviewDoesNotSatisfyPlatformProof: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2042AuditScopeReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresWslLinuxProofPassed'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresWindowsWslSmokePassed'));
  assert.ok(result.blockers.includes('prerequisites.localReviewDoesNotSatisfyPlatformProof'));
  assertNoSideEffects(result);
});

test('CM2043 rejects command path env log memory approval or endpoint fields by path without echoing values', () => {
  const result = evaluatePhase2PlatformProofReceiptReviewContract(contractInput({
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      commandText: 'ECHO_COMMAND',
      commandOutput: 'ECHO_OUTPUT',
      environmentVariables: { SECRET_NAME: 'ECHO_ENV' },
      filePaths: ['ECHO_PATH'],
      logLines: ['ECHO_LOG'],
      processDetails: 'ECHO_PROCESS',
      rawOutput: 'ECHO_RAW_OUTPUT',
      rawAudit: 'ECHO_RAW_AUDIT',
      memoryContent: 'ECHO_MEMORY',
      approvalLine: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.approvalLine',
    'unsafe.bearerToken',
    'unsafe.commandOutput',
    'unsafe.commandText',
    'unsafe.endpoint',
    'unsafe.environmentVariables',
    'unsafe.filePaths',
    'unsafe.logLines',
    'unsafe.memoryContent',
    'unsafe.processDetails',
    'unsafe.rawAudit',
    'unsafe.rawOutput'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_COMMAND'), false);
  assert.equal(serialized.includes('ECHO_OUTPUT'), false);
  assert.equal(serialized.includes('ECHO_ENV'), false);
  assert.equal(serialized.includes('ECHO_PATH'), false);
  assert.equal(serialized.includes('ECHO_LOG'), false);
  assert.equal(serialized.includes('ECHO_PROCESS'), false);
  assert.equal(serialized.includes('ECHO_RAW_OUTPUT'), false);
  assert.equal(serialized.includes('ECHO_RAW_AUDIT'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2043 stops L4 on platform proof execution raw reads or readiness counters', () => {
  const result = evaluatePhase2PlatformProofReceiptReviewContract(contractInput({
    request: {
      actualReceiptApplied: true,
      wslLinuxProofPassed: true,
      windowsWslSmokePassed: true,
      commandExecuted: true,
      processInspected: true,
      serviceStartedOrStopped: true,
      rawOutputRead: true,
      phase2Completed: true,
      readinessClaimed: true
    },
    counters: {
      ...zeroCounters(),
      receiptReviews: 1,
      receiptApplications: 1,
      completionAuditPatchApplications: 1,
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      nativeReadAttempts: 1,
      commandExecutions: 1,
      processInspections: 1,
      serviceStartStopActions: 1,
      responseBodyReads: 1,
      rawOutputReads: 1,
      rawAuditReads: 1,
      realMemoryReads: 1,
      rawPrivateReads: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1,
      releaseDeployCutoverActions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.ok(result.stopReasons.includes('request.actualReceiptApplied'));
  assert.ok(result.stopReasons.includes('request.wslLinuxProofPassed'));
  assert.ok(result.stopReasons.includes('request.windowsWslSmokePassed'));
  assert.ok(result.stopReasons.includes('request.commandExecuted'));
  assert.ok(result.stopReasons.includes('request.processInspected'));
  assert.ok(result.stopReasons.includes('request.serviceStartedOrStopped'));
  assert.ok(result.stopReasons.includes('request.rawOutputRead'));
  assert.ok(result.stopReasons.includes('request.phase2Completed'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.receiptReviews'));
  assert.ok(result.stopReasons.includes('counters.receiptApplications'));
  assert.ok(result.stopReasons.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.nativeReadAttempts'));
  assert.ok(result.stopReasons.includes('counters.commandExecutions'));
  assert.ok(result.stopReasons.includes('counters.processInspections'));
  assert.ok(result.stopReasons.includes('counters.serviceStartStopActions'));
  assert.ok(result.stopReasons.includes('counters.responseBodyReads'));
  assert.ok(result.stopReasons.includes('counters.rawOutputReads'));
  assert.ok(result.stopReasons.includes('counters.rawAuditReads'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2043 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    commandOutput: 'DO_NOT_ECHO_A',
    nested: {
      filePaths: 'DO_NOT_ECHO_B',
      logLines: 'DO_NOT_ECHO_C'
    }
  }), [
    'commandOutput',
    'nested.filePaths',
    'nested.logLines'
  ]);
});
