const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DENIED_RUNTIME_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_RUNTIME_REVIEW_SURFACES,
  REQUIRED_RUNTIME_REVIEW_FLAGS,
  REQUIRED_RUNTIME_REVIEW_INPUTS,
  REQUIRED_RUNTIME_REVIEW_OUTPUTS,
  summarizeDeferredGovernanceRuntimeReadinessReviewPolicy
} = require('../src/core/DeferredGovernanceRuntimeReadinessReviewPolicy');

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

function familyReview(family, overrides = {}) {
  const surface = REQUIRED_FAMILY_RUNTIME_REVIEW_SURFACES[family] || {};
  return {
    family,
    action: surface.action || '',
    reviewReason: surface.reviewReason || '',
    decisionState: surface.decisionState || '',
    requestSource: surface.requestSource || '',
    contextFlag: surface.contextFlag || '',
    requiredRuntimeReviewInputs: REQUIRED_RUNTIME_REVIEW_INPUTS,
    requiredRuntimeReviewOutputs: REQUIRED_RUNTIME_REVIEW_OUTPUTS,
    runtimeReviewFlags: REQUIRED_RUNTIME_REVIEW_FLAGS,
    deniedRuntimeActions: DENIED_RUNTIME_ACTIONS,
    allPrerequisitePoliciesRequired: true,
    exactFamilySurfaceRequired: true,
    dryRunBeforeApplyRequired: true,
    explicitApprovalRequired: true,
    auditProjectionChangedIdsRevisionRequired: true,
    candidateCacheReadSuppressionRequired: true,
    rollbackOrCleanupRequired: true,
    dirtyBaselineBlocksLiveProof: true,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
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
    serviceStarted: false,
    liveProofExecuted: false,
    readinessClaimed: false,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    safety: baseSafety(),
    familyReviews: [
      familyReview('memory_exclude'),
      familyReview('memory_forget')
    ],
    ...overrides
  };
}

test('accepts runtime-readiness review policy without claiming runtime readiness', () => {
  const report = summarizeDeferredGovernanceRuntimeReadinessReviewPolicy(basePolicy());

  assert.equal(report.runtimeReadinessReviewPolicyAccepted, true);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.serviceStarted, false);
  assert.equal(report.liveProofExecuted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredRuntimeReviewInputs, REQUIRED_RUNTIME_REVIEW_INPUTS);
  assert.deepEqual(report.requiredRuntimeReviewOutputs, REQUIRED_RUNTIME_REVIEW_OUTPUTS);
  assert.deepEqual(report.requiredRuntimeReviewFlags, REQUIRED_RUNTIME_REVIEW_FLAGS);
  assert.deepEqual(report.deniedRuntimeActions, DENIED_RUNTIME_ACTIONS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.dirtyBaselineBlocksLiveProof === true));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing runtime review inputs, outputs, flags, or denied actions', () => {
  const report = summarizeDeferredGovernanceRuntimeReadinessReviewPolicy(basePolicy({
    familyReviews: [
      familyReview('memory_exclude', {
        requiredRuntimeReviewInputs: REQUIRED_RUNTIME_REVIEW_INPUTS
          .filter(input => input !== 'governanceRevisionRef'),
        runtimeReviewFlags: REQUIRED_RUNTIME_REVIEW_FLAGS
          .filter(flag => flag !== 'dirtyBaselineBlocksLiveProof')
      }),
      familyReview('memory_forget', {
        requiredRuntimeReviewOutputs: REQUIRED_RUNTIME_REVIEW_OUTPUTS
          .filter(output => output !== 'readinessClaimAllowed'),
        deniedRuntimeActions: DENIED_RUNTIME_ACTIONS
          .filter(action => action !== 'readinessClaim')
      })
    ]
  }));

  assert.equal(report.runtimeReadinessReviewPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingRuntimeReviewInputs, ['governanceRevisionRef']);
  assert.deepEqual(report.familyReports[0].missingRuntimeReviewFlags, ['dirtyBaselineBlocksLiveProof']);
  assert.deepEqual(report.familyReports[1].missingRuntimeReviewOutputs, ['readinessClaimAllowed']);
  assert.deepEqual(report.familyReports[1].missingDeniedRuntimeActions, ['readinessClaim']);
});

test('rejects family runtime review surface drift', () => {
  const report = summarizeDeferredGovernanceRuntimeReadinessReviewPolicy(basePolicy({
    familyReviews: [
      familyReview('memory_exclude', {
        action: 'governed_forget_runtime_readiness_review',
        reviewReason: 'forgotten_governance_suppression_runtime_review',
        decisionState: 'runtime_ready'
      }),
      familyReview('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.runtimeReadinessReviewPolicyAccepted, false);
  assert.equal(report.familyReports[0].requiredAction, 'scope_suppression_runtime_readiness_review');
  assert.equal(report.familyReports[0].requiredReviewReason, 'excluded_scope_suppression_runtime_review');
  assert.equal(report.familyReports[0].requiredDecisionState, 'not_runtime_ready');
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceRuntimeReadinessReviewPolicy(basePolicy({
    familyReviews: [
      familyReview('memory_exclude'),
      familyReview('memory_validate')
    ]
  }));

  assert.equal(report.runtimeReadinessReviewPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects runtime integration, service start, live proof, provider, public MCP, and readiness claims', () => {
  const report = summarizeDeferredGovernanceRuntimeReadinessReviewPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    serviceStarted: true,
    liveProofExecuted: true,
    safety: baseSafety({ noRuntimeIntegration: false, noLiveMemoryProof: false, rawPrivateMemoryExposed: true }),
    familyReviews: [
      familyReview('memory_exclude', {
        publicMcpTool: true,
        executionApproved: true,
        runtimeIntegrated: true,
        serviceStarted: true
      }),
      familyReview('memory_forget', {
        liveProofExecuted: true,
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.runtimeReadinessReviewPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.serviceStarted, false);
  assert.equal(report.liveProofExecuted, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
