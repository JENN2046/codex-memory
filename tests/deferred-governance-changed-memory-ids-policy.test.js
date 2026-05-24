const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_CHANGED_ID_FLAGS,
  REQUIRED_CHANGED_ID_INPUTS,
  REQUIRED_CHANGED_ID_OUTPUTS,
  REQUIRED_FAMILY_CHANGED_ID_SURFACES,
  summarizeDeferredGovernanceChangedMemoryIdsPolicy
} = require('../src/core/DeferredGovernanceChangedMemoryIdsPolicy');

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
  const surface = REQUIRED_FAMILY_CHANGED_ID_SURFACES[family] || {};
  return {
    family,
    action: surface.action || '',
    changeReason: surface.changeReason || '',
    emittedStates: surface.emittedStates || [],
    requestSource: surface.requestSource || '',
    contextFlag: surface.contextFlag || '',
    requiredChangedIdInputs: REQUIRED_CHANGED_ID_INPUTS,
    requiredChangedIdOutputs: REQUIRED_CHANGED_ID_OUTPUTS,
    changedIdFlags: REQUIRED_CHANGED_ID_FLAGS,
    exactTargetSetRequired: true,
    dedupeRequired: true,
    nonEmptyWhenTargetsPresent: true,
    auditProjectionParityRequired: true,
    governanceRevisionRequired: true,
    candidateCacheInvalidationRequired: true,
    readSuppressionRecheckRequired: true,
    rollbackOrCleanupPlanRequired: true,
    noBroadScanRequired: true,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
    changedIdsEmitterImplemented: false,
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

test('accepts changed-memory-ids policy for exclude and forget without emitting runtime ids', () => {
  const report = summarizeDeferredGovernanceChangedMemoryIdsPolicy(basePolicy());

  assert.equal(report.changedMemoryIdsPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredChangedIdInputs, REQUIRED_CHANGED_ID_INPUTS);
  assert.deepEqual(report.requiredChangedIdOutputs, REQUIRED_CHANGED_ID_OUTPUTS);
  assert.deepEqual(report.requiredChangedIdFlags, REQUIRED_CHANGED_ID_FLAGS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.exactTargetSetRequired === true));
  assert.ok(report.familyReports.every(item => item.changedIdsEmitterImplemented === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing changed-id inputs, outputs, or flags', () => {
  const report = summarizeDeferredGovernanceChangedMemoryIdsPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        requiredChangedIdInputs: REQUIRED_CHANGED_ID_INPUTS
          .filter(input => input !== 'projectionAffectedRecords'),
        changedIdFlags: REQUIRED_CHANGED_ID_FLAGS
          .filter(flag => flag !== 'auditProjectionParityRequired')
      }),
      familyPlan('memory_forget', {
        requiredChangedIdOutputs: REQUIRED_CHANGED_ID_OUTPUTS
          .filter(output => output !== 'candidateCacheInvalidationPlan')
      })
    ]
  }));

  assert.equal(report.changedMemoryIdsPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingChangedIdInputs, ['projectionAffectedRecords']);
  assert.deepEqual(report.familyReports[0].missingChangedIdFlags, ['auditProjectionParityRequired']);
  assert.deepEqual(report.familyReports[1].missingChangedIdOutputs, ['candidateCacheInvalidationPlan']);
});

test('rejects family action, change reason, emitted state, or context drift', () => {
  const report = summarizeDeferredGovernanceChangedMemoryIdsPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        action: 'governed_forget_changed_memory_ids',
        changeReason: 'forgotten_governance_suppression',
        emittedStates: ['excluded', 'governance_suppressed']
      }),
      familyPlan('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.changedMemoryIdsPolicyAccepted, false);
  assert.equal(report.familyReports[0].requiredAction, 'scope_suppression_changed_memory_ids');
  assert.equal(report.familyReports[0].requiredChangeReason, 'excluded_scope_suppression');
  assert.deepEqual(report.familyReports[0].requiredEmittedStates, ['excluded', 'scope_suppressed']);
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceChangedMemoryIdsPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude'),
      familyPlan('memory_validate')
    ]
  }));

  assert.equal(report.changedMemoryIdsPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects runtime emitter, broad scan, cache clear, public MCP, and side effects', () => {
  const report = summarizeDeferredGovernanceChangedMemoryIdsPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noBroadRealMemoryScan: false, noCandidateCacheClear: false, rawPrivateMemoryExposed: true }),
    familyPlans: [
      familyPlan('memory_exclude', {
        publicMcpTool: true,
        executionApproved: true,
        changedIdsEmitterImplemented: true,
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

  assert.equal(report.changedMemoryIdsPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
