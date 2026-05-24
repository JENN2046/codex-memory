const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_ENTRY_FLAGS,
  REQUIRED_ENTRY_INPUTS,
  REQUIRED_ENTRY_OUTPUTS,
  REQUIRED_FAMILY_RUNTIME_ENTRY_SURFACES,
  REQUIRED_PAYLOAD_FIELDS,
  summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy
} = require('../src/core/DeferredGovernanceInternalRuntimeEntrySurfacePolicy');

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
  const requiredSurface = REQUIRED_FAMILY_RUNTIME_ENTRY_SURFACES[family] || {};
  return {
    family,
    entryName: requiredSurface.entryName || '',
    serviceName: requiredSurface.serviceName || '',
    serviceMethod: requiredSurface.serviceMethod || '',
    requestSource: requiredSurface.requestSource || '',
    contextFlag: requiredSurface.contextFlag || '',
    requiredEntryInputs: REQUIRED_ENTRY_INPUTS,
    requiredPayloadFields: REQUIRED_PAYLOAD_FIELDS,
    requiredEntryOutputs: REQUIRED_ENTRY_OUTPUTS,
    entryFlags: REQUIRED_ENTRY_FLAGS,
    defaultDisabled: true,
    approvedExecutionContextRequired: true,
    publicMcpTool: false,
    callToolExposed: false,
    executionApproved: false,
    runtimeIntegrated: false,
    serviceImplemented: false,
    executionStarted: false,
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
    callToolExpanded: false,
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

test('accepts internal runtime-entry surface policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy(basePolicy());

  assert.equal(report.internalRuntimeEntrySurfacePolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.callToolExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredEntryInputs, REQUIRED_ENTRY_INPUTS);
  assert.deepEqual(report.requiredPayloadFields, REQUIRED_PAYLOAD_FIELDS);
  assert.deepEqual(report.requiredEntryOutputs, REQUIRED_ENTRY_OUTPUTS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.defaultDisabled === true));
  assert.ok(report.familyReports.every(item => item.serviceImplemented === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing entry inputs, payload fields, outputs, or flags', () => {
  const report = summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy(basePolicy({
    familySurfaces: [
      familySurface('memory_exclude', {
        requiredEntryInputs: REQUIRED_ENTRY_INPUTS.filter(input => input !== 'auditCorrelationId'),
        requiredPayloadFields: REQUIRED_PAYLOAD_FIELDS.filter(field => field !== 'audit_correlation_id')
      }),
      familySurface('memory_forget', {
        requiredEntryOutputs: REQUIRED_ENTRY_OUTPUTS.filter(output => output !== 'blockedBeforeService'),
        entryFlags: REQUIRED_ENTRY_FLAGS.filter(flag => flag !== 'noPublicCallToolExposure')
      })
    ]
  }));

  assert.equal(report.internalRuntimeEntrySurfacePolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingEntryInputs, ['auditCorrelationId']);
  assert.deepEqual(report.familyReports[0].missingPayloadFields, ['audit_correlation_id']);
  assert.deepEqual(report.familyReports[1].missingEntryOutputs, ['blockedBeforeService']);
  assert.deepEqual(report.familyReports[1].missingEntryFlags, ['noPublicCallToolExposure']);
});

test('rejects family-specific entry, service, or context drift', () => {
  const report = summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy(basePolicy({
    familySurfaces: [
      familySurface('memory_exclude', {
        entryName: 'executeInternalMemoryForget',
        serviceName: 'MemoryForgetGovernanceService',
        serviceMethod: 'planMemoryForget'
      }),
      familySurface('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.internalRuntimeEntrySurfacePolicyAccepted, false);
  assert.equal(report.familyReports[0].requiredEntryName, 'executeInternalMemoryExclude');
  assert.equal(report.familyReports[0].requiredServiceName, 'MemoryExcludeGovernanceService');
  assert.equal(report.familyReports[0].requiredServiceMethod, 'planMemoryExclude');
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy(basePolicy({
    familySurfaces: [
      familySurface('memory_exclude'),
      familySurface('memory_validate')
    ]
  }));

  assert.equal(report.internalRuntimeEntrySurfacePolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects service implementation, public entry exposure, execution, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy(basePolicy({
    publicMcpExpanded: true,
    callToolExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noRuntimeMutation: false, rawPrivateMemoryExposed: true }),
    familySurfaces: [
      familySurface('memory_exclude', {
        publicMcpTool: true,
        callToolExposed: true,
        executionApproved: true,
        serviceImplemented: true
      }),
      familySurface('memory_forget', {
        executionStarted: true,
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.internalRuntimeEntrySurfacePolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.callToolExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
