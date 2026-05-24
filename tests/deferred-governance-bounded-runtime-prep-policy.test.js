const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_CONTEXTS,
  REQUIRED_FAMILY_PROJECTION_STATES,
  REQUIRED_FAMILY_RUNTIME_PREP_ACTIONS,
  REQUIRED_POLICY_FLAGS,
  REQUIRED_RUNTIME_PREP_FIELDS,
  REQUIRED_RUNTIME_PREP_OUTPUTS,
  summarizeDeferredGovernanceBoundedRuntimePrepPolicy
} = require('../src/core/DeferredGovernanceBoundedRuntimePrepPolicy');

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

function familyPolicy(family, overrides = {}) {
  const familyContext = REQUIRED_FAMILY_CONTEXTS[family] || {};
  return {
    family,
    runtimePrepActions: REQUIRED_FAMILY_RUNTIME_PREP_ACTIONS[family] || [],
    projectionStates: REQUIRED_FAMILY_PROJECTION_STATES[family] || [],
    requestSource: familyContext.requestSource || '',
    contextFlag: familyContext.contextFlag || '',
    requiredRuntimePrepFields: REQUIRED_RUNTIME_PREP_FIELDS,
    requiredRuntimePrepOutputs: REQUIRED_RUNTIME_PREP_OUTPUTS,
    dryRunOnly: true,
    runtimeApplyBlocked: true,
    approvedContextGateRequired: true,
    exactExecutionApprovalRequired: true,
    appendOnlyAuditPreviewRequired: true,
    shadowProjectionPreviewRequired: true,
    changedMemoryIdsRequired: true,
    governanceRevisionRequired: true,
    candidateCacheInvalidationRequired: true,
    readPolicySuppressionRequired: true,
    rollbackOrCleanupPlanRequired: true,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
    mutatesDurableState: false,
    providerCalls: 0,
    readinessClaimed: false,
    policyFlags: REQUIRED_POLICY_FLAGS,
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
    familyPolicies: [
      familyPolicy('memory_exclude'),
      familyPolicy('memory_forget')
    ],
    ...overrides
  };
}

test('accepts bounded runtime-prep policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceBoundedRuntimePrepPolicy(basePolicy());

  assert.equal(report.boundedRuntimePrepPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredRuntimePrepFields, REQUIRED_RUNTIME_PREP_FIELDS);
  assert.deepEqual(report.requiredRuntimePrepOutputs, REQUIRED_RUNTIME_PREP_OUTPUTS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.dryRunOnly === true));
  assert.ok(report.familyReports.every(item => item.runtimeApplyBlocked === true));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing runtime-prep fields or outputs', () => {
  const report = summarizeDeferredGovernanceBoundedRuntimePrepPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        requiredRuntimePrepFields: REQUIRED_RUNTIME_PREP_FIELDS.filter(field => field !== 'auditCorrelationId')
      }),
      familyPolicy('memory_forget', {
        requiredRuntimePrepOutputs: REQUIRED_RUNTIME_PREP_OUTPUTS.filter(output => output !== 'candidateCacheInvalidation')
      })
    ]
  }));

  assert.equal(report.boundedRuntimePrepPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingRuntimePrepFields, ['auditCorrelationId']);
  assert.deepEqual(report.familyReports[1].missingRuntimePrepOutputs, ['candidateCacheInvalidation']);
});

test('rejects family action, projection state, or approved context drift', () => {
  const report = summarizeDeferredGovernanceBoundedRuntimePrepPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        runtimePrepActions: ['governed_forget_suppression_projection'],
        projectionStates: ['forgotten', 'governance_suppressed']
      }),
      familyPolicy('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.boundedRuntimePrepPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingRuntimePrepActions, ['scope_suppression_projection']);
  assert.deepEqual(report.familyReports[0].unexpectedProjectionStates, ['forgotten', 'governance_suppressed']);
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceBoundedRuntimePrepPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude'),
      familyPolicy('memory_validate')
    ]
  }));

  assert.equal(report.boundedRuntimePrepPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects runtime apply, public MCP, raw exposure, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceBoundedRuntimePrepPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableMemoryWrite: false, rawPrivateMemoryExposed: true }),
    familyPolicies: [
      familyPolicy('memory_exclude', {
        dryRunOnly: false,
        runtimeApplyBlocked: false,
        publicMcpTool: true
      }),
      familyPolicy('memory_forget', {
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.boundedRuntimePrepPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
