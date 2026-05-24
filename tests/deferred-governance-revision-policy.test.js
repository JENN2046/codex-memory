const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_REVISION_SURFACES,
  REQUIRED_REVISION_FLAGS,
  REQUIRED_REVISION_INPUTS,
  REQUIRED_REVISION_OUTPUTS,
  summarizeDeferredGovernanceRevisionPolicy
} = require('../src/core/DeferredGovernanceRevisionPolicy');

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

function familyPlan(family, overrides = {}) {
  const surface = REQUIRED_FAMILY_REVISION_SURFACES[family] || {};
  return {
    family,
    action: surface.action || '',
    revisionReason: surface.revisionReason || '',
    revisionStates: surface.revisionStates || [],
    requestSource: surface.requestSource || '',
    contextFlag: surface.contextFlag || '',
    requiredRevisionInputs: REQUIRED_REVISION_INPUTS,
    requiredRevisionOutputs: REQUIRED_REVISION_OUTPUTS,
    revisionFlags: REQUIRED_REVISION_FLAGS,
    governanceRevisionRequired: true,
    deterministicRevisionRequired: true,
    auditProjectionChangedIdsParityRequired: true,
    candidateCacheRevisionRequired: true,
    readSuppressionRevisionRequired: true,
    rollbackOrCleanupRevisionRequired: true,
    staleRevisionRejected: true,
    noProviderRequired: true,
    noBroadScanRequired: true,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
    revisionEmitterImplemented: false,
    broadMemoryScanAllowed: false,
    candidateCacheCleared: false,
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
    readinessClaimed: false,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    safety: baseSafety(),
    familyPlans: [
      familyPlan('memory_exclude'),
      familyPlan('memory_forget')
    ],
    ...overrides
  };
}

test('accepts governance revision policy for exclude and forget without implementing emitter', () => {
  const report = summarizeDeferredGovernanceRevisionPolicy(basePolicy());

  assert.equal(report.governanceRevisionPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredRevisionInputs, REQUIRED_REVISION_INPUTS);
  assert.deepEqual(report.requiredRevisionOutputs, REQUIRED_REVISION_OUTPUTS);
  assert.deepEqual(report.requiredRevisionFlags, REQUIRED_REVISION_FLAGS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.governanceRevisionRequired === true));
  assert.ok(report.familyReports.every(item => item.revisionEmitterImplemented === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing revision inputs, outputs, or flags', () => {
  const report = summarizeDeferredGovernanceRevisionPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        requiredRevisionInputs: REQUIRED_REVISION_INPUTS
          .filter(input => input !== 'projectionRevisionToken'),
        revisionFlags: REQUIRED_REVISION_FLAGS
          .filter(flag => flag !== 'auditProjectionChangedIdsParityRequired')
      }),
      familyPlan('memory_forget', {
        requiredRevisionOutputs: REQUIRED_REVISION_OUTPUTS
          .filter(output => output !== 'readSuppressionRevisionRef')
      })
    ]
  }));

  assert.equal(report.governanceRevisionPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingRevisionInputs, ['projectionRevisionToken']);
  assert.deepEqual(report.familyReports[0].missingRevisionFlags, ['auditProjectionChangedIdsParityRequired']);
  assert.deepEqual(report.familyReports[1].missingRevisionOutputs, ['readSuppressionRevisionRef']);
});

test('rejects family action, revision reason, state, or context drift', () => {
  const report = summarizeDeferredGovernanceRevisionPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        action: 'governed_forget_governance_revision',
        revisionReason: 'forgotten_governance_suppression_revision',
        revisionStates: ['excluded', 'governance_suppressed']
      }),
      familyPlan('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.governanceRevisionPolicyAccepted, false);
  assert.equal(report.familyReports[0].requiredAction, 'scope_suppression_governance_revision');
  assert.equal(report.familyReports[0].requiredRevisionReason, 'excluded_scope_suppression_revision');
  assert.deepEqual(report.familyReports[0].requiredRevisionStates, ['excluded', 'scope_suppressed']);
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceRevisionPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude'),
      familyPlan('memory_validate')
    ]
  }));

  assert.equal(report.governanceRevisionPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects revision emitter, provider, broad scan, cache clear, public MCP, and side effects', () => {
  const report = summarizeDeferredGovernanceRevisionPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noRevisionEmitterImplementation: false, noBroadRealMemoryScan: false, rawPrivateMemoryExposed: true }),
    familyPlans: [
      familyPlan('memory_exclude', {
        publicMcpTool: true,
        executionApproved: true,
        revisionEmitterImplemented: true,
        broadMemoryScanAllowed: true
      }),
      familyPlan('memory_forget', {
        candidateCacheCleared: true,
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.governanceRevisionPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
