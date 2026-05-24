const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_CONTEXT_FIELDS,
  REQUIRED_FAMILY_CONTEXTS,
  REQUIRED_GATE_PROPERTIES,
  summarizeDeferredGovernanceApprovedContextGatePolicy
} = require('../src/core/DeferredGovernanceApprovedContextGatePolicy');

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
    requestSource: familyContext.requestSource || '',
    contextFlag: familyContext.contextFlag || '',
    requiredContextFields: REQUIRED_CONTEXT_FIELDS,
    gateProperties: REQUIRED_GATE_PROPERTIES,
    defaultDisabled: true,
    requiresExactRequestSource: true,
    requiresFamilyContextFlag: true,
    requiresActorClientId: true,
    requiresApprovalId: true,
    requiresAuditCorrelationId: true,
    requiresScopeBinding: true,
    publicMcpContextAllowed: false,
    missingExecutionContextAllowed: false,
    staleApprovalContextAllowed: false,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
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
    familyPolicies: [
      familyPolicy('memory_exclude'),
      familyPolicy('memory_forget')
    ],
    ...overrides
  };
}

test('accepts approved-context gate policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceApprovedContextGatePolicy(basePolicy());

  assert.equal(report.approvedContextGatePolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredContextFields, REQUIRED_CONTEXT_FIELDS);
  assert.deepEqual(report.requiredGateProperties, REQUIRED_GATE_PROPERTIES);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.defaultDisabled === true));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects request-source or context-flag drift', () => {
  const report = summarizeDeferredGovernanceApprovedContextGatePolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        requestSource: 'internal-memory-forget-runtime-entry'
      }),
      familyPolicy('memory_forget', {
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.approvedContextGatePolicyAccepted, false);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[0].requiredRequestSource, 'internal-memory-exclude-runtime-entry');
  assert.equal(report.familyReports[1].accepted, false);
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('rejects missing context fields and gate properties', () => {
  const report = summarizeDeferredGovernanceApprovedContextGatePolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        requiredContextFields: REQUIRED_CONTEXT_FIELDS.filter(field => field !== 'scope')
      }),
      familyPolicy('memory_forget', {
        gateProperties: REQUIRED_GATE_PROPERTIES.filter(property => property !== 'rejectsStaleApprovalContext')
      })
    ]
  }));

  assert.equal(report.approvedContextGatePolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingContextFields, ['scope']);
  assert.deepEqual(report.familyReports[1].missingGateProperties, ['rejectsStaleApprovalContext']);
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceApprovedContextGatePolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude'),
      familyPolicy('memory_validate')
    ]
  }));

  assert.equal(report.approvedContextGatePolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects public context, stale context, runtime integration, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceApprovedContextGatePolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableMemoryWrite: false, rawPrivateMemoryExposed: true }),
    familyPolicies: [
      familyPolicy('memory_exclude', {
        defaultDisabled: false,
        publicMcpContextAllowed: true,
        publicMcpTool: true
      }),
      familyPolicy('memory_forget', {
        missingExecutionContextAllowed: true,
        staleApprovalContextAllowed: true,
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.approvedContextGatePolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
