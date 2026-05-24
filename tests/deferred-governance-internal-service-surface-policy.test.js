const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_SERVICE_SURFACES,
  REQUIRED_SERVICE_DEPENDENCIES,
  REQUIRED_SERVICE_FLAGS,
  REQUIRED_SERVICE_INPUTS,
  REQUIRED_SERVICE_OUTPUTS,
  summarizeDeferredGovernanceInternalServiceSurfacePolicy
} = require('../src/core/DeferredGovernanceInternalServiceSurfacePolicy');

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

function familySurface(family, overrides = {}) {
  const requiredSurface = REQUIRED_FAMILY_SERVICE_SURFACES[family] || {};
  return {
    family,
    serviceName: requiredSurface.serviceName || '',
    serviceMethod: requiredSurface.serviceMethod || '',
    requestSource: requiredSurface.requestSource || '',
    contextFlag: requiredSurface.contextFlag || '',
    action: requiredSurface.action || '',
    projectionStates: requiredSurface.projectionStates || [],
    requiredServiceInputs: REQUIRED_SERVICE_INPUTS,
    requiredServiceOutputs: REQUIRED_SERVICE_OUTPUTS,
    requiredServiceDependencies: REQUIRED_SERVICE_DEPENDENCIES,
    serviceFlags: REQUIRED_SERVICE_FLAGS,
    internalOnly: true,
    defaultDisabled: true,
    dryRunFirst: true,
    runtimeEntryEnabledByDefault: false,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
    mutatesDurableState: false,
    hardDeleteAllowed: false,
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
    familySurfaces: [
      familySurface('memory_exclude'),
      familySurface('memory_forget')
    ],
    ...overrides
  };
}

test('accepts internal service surface policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceInternalServiceSurfacePolicy(basePolicy());

  assert.equal(report.internalServiceSurfacePolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredServiceInputs, REQUIRED_SERVICE_INPUTS);
  assert.deepEqual(report.requiredServiceOutputs, REQUIRED_SERVICE_OUTPUTS);
  assert.deepEqual(report.requiredServiceDependencies, REQUIRED_SERVICE_DEPENDENCIES);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.defaultDisabled === true));
  assert.ok(report.familyReports.every(item => item.runtimeEntryEnabledByDefault === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing service inputs, outputs, dependencies, or flags', () => {
  const report = summarizeDeferredGovernanceInternalServiceSurfacePolicy(basePolicy({
    familySurfaces: [
      familySurface('memory_exclude', {
        requiredServiceInputs: REQUIRED_SERVICE_INPUTS.filter(input => input !== 'auditCorrelationId'),
        requiredServiceDependencies: REQUIRED_SERVICE_DEPENDENCIES.filter(dependency => dependency !== 'runtimePrepPolicy')
      }),
      familySurface('memory_forget', {
        requiredServiceOutputs: REQUIRED_SERVICE_OUTPUTS.filter(output => output !== 'readPolicySuppression'),
        serviceFlags: REQUIRED_SERVICE_FLAGS.filter(flag => flag !== 'noHardDeleteDefault')
      })
    ]
  }));

  assert.equal(report.internalServiceSurfacePolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingServiceInputs, ['auditCorrelationId']);
  assert.deepEqual(report.familyReports[0].missingServiceDependencies, ['runtimePrepPolicy']);
  assert.deepEqual(report.familyReports[1].missingServiceOutputs, ['readPolicySuppression']);
  assert.deepEqual(report.familyReports[1].missingServiceFlags, ['noHardDeleteDefault']);
});

test('rejects family-specific service, action, projection, or context drift', () => {
  const report = summarizeDeferredGovernanceInternalServiceSurfacePolicy(basePolicy({
    familySurfaces: [
      familySurface('memory_exclude', {
        serviceName: 'MemoryForgetGovernanceService',
        serviceMethod: 'planMemoryForget',
        action: 'governed_forget_suppression_projection',
        projectionStates: ['forgotten', 'governance_suppressed']
      }),
      familySurface('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.internalServiceSurfacePolicyAccepted, false);
  assert.equal(report.familyReports[0].requiredServiceName, 'MemoryExcludeGovernanceService');
  assert.equal(report.familyReports[0].requiredServiceMethod, 'planMemoryExclude');
  assert.equal(report.familyReports[0].requiredAction, 'scope_suppression_projection');
  assert.deepEqual(report.familyReports[0].unexpectedProjectionStates, ['forgotten', 'governance_suppressed']);
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceInternalServiceSurfacePolicy(basePolicy({
    familySurfaces: [
      familySurface('memory_exclude'),
      familySurface('memory_validate')
    ]
  }));

  assert.equal(report.internalServiceSurfacePolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects runtime enablement, public MCP, durable mutation, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceInternalServiceSurfacePolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableAuditWrite: false, rawPrivateMemoryExposed: true }),
    familySurfaces: [
      familySurface('memory_exclude', {
        runtimeEntryEnabledByDefault: true,
        publicMcpTool: true,
        executionApproved: true
      }),
      familySurface('memory_forget', {
        mutatesDurableState: true,
        hardDeleteAllowed: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.internalServiceSurfacePolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
