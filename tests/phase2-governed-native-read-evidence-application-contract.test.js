'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluatePhase2GovernedNativeReadEvidenceApplicationContract
} = require('../src/core/Phase2GovernedNativeReadEvidenceApplicationContract');
const {
  PHASE_REQUIREMENTS, OBJECTIVE_INVARIANTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2074',
    mode: 'phase2-governed-native-read-evidence-application',
    authority: {
      freshCurrentUserPermissionReceiptBound: true,
      readOnlyPhase2ScopeBound: true,
      trustedExecutionContextBound: true,
      writeAuthorityGranted: false,
      rawApprovalMaterialAbsent: true
    },
    nativeObservation: {
      sourceTaskId: 'CM-2073', sourceContractAccepted: true,
      sourceObservationPassed: true, observedToolCount: 3,
      nativeTargetBound: true, nativeReadSucceeded: true,
      fallbackRouteExplicitlyDistinguished: true, lowDisclosurePassed: true,
      auditReceiptPassed: true, scopeVisibilityIsolationPassed: true,
      wslLinuxPassed: true, primaryMemoryStoreWritten: false,
      nativeWriteExecuted: false, rawPrivateStateReturned: false
    },
    windowsWslSmoke: {
      wslDetected: true, cmdBridgePresent: true, cmdBridgeSmokePassed: true,
      powershellBridgePresent: true, powershellBridgeSmokePassed: true,
      rawOutputCaptured: false
    },
    application: {
      categoryOnly: true, lowDisclosureOnly: true,
      applyExactObservedReceipts: true,
      completionAuditEvidencePatchPrepared: true,
      receiptBundleAppliedToCompletionAudit: true,
      phase2CompletionClaimedByContract: false,
      fullPlanPackCompletionClaimed: false
    },
    expectedDecision: 'phase2_governed_native_read_evidence_applied',
    counters: {
      sourceMcpCalls: 3, sourceNativeReadAttempts: 3, sourceMemoryReads: 3,
      sourceProviderApiCalls: 3, sourceDerivedIndexWrites: 3,
      sourceLocalAuditAppends: 3, windowsHostSmokeCommands: 2,
      completionAuditEvidenceApplications: 1, memoryWrites: 0,
      primaryMemoryStoreWrites: 0, nativeWriteAttempts: 0, rawPrivateReads: 0,
      publicMcpExpansions: 0, defaultRuntimeExpansions: 0,
      tagReleaseDeployCutoverActions: 0, readinessClaims: 0
    }
  };
  return {
    ...base, ...overrides,
    authority: { ...base.authority, ...(overrides.authority || {}) },
    nativeObservation: { ...base.nativeObservation, ...(overrides.nativeObservation || {}) },
    windowsWslSmoke: { ...base.windowsWslSmoke, ...(overrides.windowsWslSmoke || {}) },
    application: { ...base.application, ...(overrides.application || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function allEvidence() {
  const evidence = {};
  for (const group of [...PHASE_REQUIREMENTS, ...OBJECTIVE_INVARIANTS]) {
    for (const field of group.requiredEvidence) evidence[field] = true;
  }
  return evidence;
}

test('CM2074 applies exact observed Phase 2 receipts as a low-disclosure evidence patch', () => {
  const result = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(validInput());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase2GovernedNativeReadEvidenceApplicationPassed, true);
  assert.equal(result.receiptBundleAppliedToCompletionAudit, true);
  assert.deepEqual(Object.values(result.evidencePatch), Array(10).fill(true));
  assert.equal(result.memoryWritten, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM2074 evidence patch completes Phase 2 but not the full plan pack', () => {
  const application = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(validInput());
  const evidence = { ...allEvidence(), ...application.evidencePatch };
  evidence.nativeSideEffectReceiptPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  assert.ok(audit.completedPhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.equal(audit.fullPlanPackCompleted, false);
  assert.ok(audit.incompletePhaseIds.includes('phase8_native_write_production_proof'));
  assert.ok(audit.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(audit.incompletePhaseIds.includes('phase10_tag_release_readiness'));
});

test('CM2074 rejects missing current permission receipt', () => {
  const result = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(validInput({
    authority: { freshCurrentUserPermissionReceiptBound: false },
    expectedDecision: 'phase2_governed_native_read_evidence_application_blocked'
  }));
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authority.freshCurrentUserPermissionReceiptBound'));
});

test('CM2074 rejects native receipt count drift', () => {
  const result = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(validInput({
    counters: { sourceProviderApiCalls: 2 },
    expectedDecision: 'phase2_governed_native_read_evidence_application_blocked'
  }));
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('counters.sourceProviderApiCalls'));
});

test('CM2074 requires explicit native/fallback route distinction', () => {
  const result = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(validInput({
    nativeObservation: { fallbackRouteExplicitlyDistinguished: false },
    expectedDecision: 'phase2_governed_native_read_evidence_application_blocked'
  }));
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('nativeObservation.fallbackRouteExplicitlyDistinguished'));
});

test('CM2074 requires both Windows host bridge smoke paths', () => {
  const result = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(validInput({
    windowsWslSmoke: { powershellBridgeSmokePassed: false },
    expectedDecision: 'phase2_governed_native_read_evidence_application_blocked'
  }));
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('windowsWslSmoke.powershellBridgeSmokePassed'));
});

test('CM2074 rejects raw receipt material by path without echo', () => {
  const input = validInput();
  input.nativeObservation.responseBody = 'DO_NOT_ECHO';
  const result = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(input);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, ['nativeObservation.responseBody']);
  assert.equal(JSON.stringify(result).includes('DO_NOT_ECHO'), false);
});

test('CM2074 stops L4 on write authority or completion overclaim', () => {
  const result = evaluatePhase2GovernedNativeReadEvidenceApplicationContract(validInput({
    authority: { writeAuthorityGranted: true },
    application: { fullPlanPackCompletionClaimed: true },
    expectedDecision: 'stop_l4'
  }));
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.memoryWritten, false);
  assert.equal(result.readinessClaimed, false);
});
