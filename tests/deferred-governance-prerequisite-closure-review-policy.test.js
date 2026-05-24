const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DENIED_RUNTIME_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_CLOSURE_FLAGS,
  REQUIRED_CLOSURE_INPUTS,
  REQUIRED_CLOSURE_OUTPUTS,
  REQUIRED_FAMILY_CLOSURE_SURFACES,
  REQUIRED_PREREQUISITE_EVIDENCE,
  summarizeDeferredGovernancePrerequisiteClosureReviewPolicy
} = require('../src/core/DeferredGovernancePrerequisiteClosureReviewPolicy');

function baseSafety(overrides = {}) {
  const safety = {};
  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    safety[flag] = true;
  }
  return {
    ...safety,
    rawSecretExposed: false,
    rawWorkspaceIdExposed: false,
    rawPrivateMemoryExposed: false,
    ...overrides
  };
}

function familyClosure(family, overrides = {}) {
  const surface = REQUIRED_FAMILY_CLOSURE_SURFACES[family] || {};
  return {
    family,
    action: surface.action || '',
    closureState: surface.closureState || '',
    requestSource: surface.requestSource || '',
    contextFlag: surface.contextFlag || '',
    requiredClosureInputs: REQUIRED_CLOSURE_INPUTS,
    requiredClosureOutputs: REQUIRED_CLOSURE_OUTPUTS,
    closureFlags: REQUIRED_CLOSURE_FLAGS,
    evidenceRefs: REQUIRED_PREREQUISITE_EVIDENCE,
    validationRefs: REQUIRED_PREREQUISITE_EVIDENCE,
    deniedRuntimeActions: DENIED_RUNTIME_ACTIONS,
    allPrerequisitesAccountedFor: true,
    exactFamilySetRequired: true,
    exactValidationRefsRequired: true,
    publicMcpFrozen: true,
    runtimeApplyBlocked: true,
    dirtyBaselineBlocksLiveProof: true,
    readinessClaimBlocked: true,
    noProviderRequired: true,
    noConfigMutation: true,
    noRemoteWrite: true,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
    runtimeApplied: false,
    serviceStarted: false,
    liveProofExecuted: false,
    mutatesDurableState: false,
    providerCalls: 0,
    readinessClaimed: false,
    ...overrides
  };
}

function basePolicy(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    internalOnly: true,
    publicMcpExpanded: false,
    executionApproved: false,
    runtimeIntegrated: false,
    runtimeApplied: false,
    serviceStarted: false,
    liveProofExecuted: false,
    readinessClaimed: false,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    safety: baseSafety(),
    familyClosures: [
      familyClosure('memory_exclude'),
      familyClosure('memory_forget')
    ],
    ...overrides
  };
}

test('accepts prerequisite closure review while keeping runtime readiness false', () => {
  const report = summarizeDeferredGovernancePrerequisiteClosureReviewPolicy(basePolicy());

  assert.equal(report.prerequisiteClosureReviewAccepted, true);
  assert.equal(report.prerequisitesAccountedFor, true);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeApplied, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.serviceStarted, false);
  assert.equal(report.liveProofExecuted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredPrerequisiteEvidence, REQUIRED_PREREQUISITE_EVIDENCE);
  assert.deepEqual(report.deniedRuntimeActions, DENIED_RUNTIME_ACTIONS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.runtimeApplyBlocked === true));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing prerequisite evidence, validation refs, closure flags, and denied actions', () => {
  const report = summarizeDeferredGovernancePrerequisiteClosureReviewPolicy(basePolicy({
    familyClosures: [
      familyClosure('memory_exclude', {
        evidenceRefs: REQUIRED_PREREQUISITE_EVIDENCE
          .filter(ref => ref !== 'runtime_readiness_review_policy'),
        closureFlags: REQUIRED_CLOSURE_FLAGS
          .filter(flag => flag !== 'readinessClaimBlocked')
      }),
      familyClosure('memory_forget', {
        validationRefs: REQUIRED_PREREQUISITE_EVIDENCE
          .filter(ref => ref !== 'governance_revision_policy'),
        deniedRuntimeActions: DENIED_RUNTIME_ACTIONS
          .filter(action => action !== 'readinessClaim')
      })
    ]
  }));

  assert.equal(report.prerequisiteClosureReviewAccepted, false);
  assert.deepEqual(report.familyReports[0].missingEvidenceRefs, ['runtime_readiness_review_policy']);
  assert.deepEqual(report.familyReports[0].missingClosureFlags, ['readinessClaimBlocked']);
  assert.deepEqual(report.familyReports[1].missingValidationRefs, ['governance_revision_policy']);
  assert.deepEqual(report.familyReports[1].missingDeniedRuntimeActions, ['readinessClaim']);
});

test('rejects closure surface drift', () => {
  const report = summarizeDeferredGovernancePrerequisiteClosureReviewPolicy(basePolicy({
    familyClosures: [
      familyClosure('memory_exclude', {
        action: 'governed_forget_prerequisite_closure_review',
        closureState: 'runtime_ready'
      }),
      familyClosure('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.prerequisiteClosureReviewAccepted, false);
  assert.equal(report.familyReports[0].requiredAction, 'scope_suppression_prerequisite_closure_review');
  assert.equal(report.familyReports[0].requiredClosureState, 'prerequisites_closed_for_review_not_runtime_ready');
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernancePrerequisiteClosureReviewPolicy(basePolicy({
    familyClosures: [
      familyClosure('memory_exclude'),
      familyClosure('memory_validate')
    ]
  }));

  assert.equal(report.prerequisiteClosureReviewAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects runtime apply, service start, live proof, provider, public MCP, and readiness claims', () => {
  const report = summarizeDeferredGovernancePrerequisiteClosureReviewPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeApplied: true,
    runtimeIntegrated: true,
    serviceStarted: true,
    liveProofExecuted: true,
    safety: baseSafety({ noRuntimeApply: false, noLiveMemoryProof: false, rawPrivateMemoryExposed: true }),
    familyClosures: [
      familyClosure('memory_exclude', {
        publicMcpTool: true,
        executionApproved: true,
        runtimeApplied: true,
        runtimeIntegrated: true,
        serviceStarted: true
      }),
      familyClosure('memory_forget', {
        liveProofExecuted: true,
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.prerequisiteClosureReviewAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeApplied, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.serviceStarted, false);
  assert.equal(report.liveProofExecuted, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
