const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_PROJECTION_SURFACES,
  REQUIRED_PROJECTION_FLAGS,
  REQUIRED_PROJECTION_INPUTS,
  REQUIRED_PROJECTION_OUTPUTS,
  REQUIRED_SQLITE_PROJECTION_COLUMNS,
  summarizeDeferredGovernanceShadowProjectionPolicy
} = require('../src/core/DeferredGovernanceShadowProjectionPolicy');

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
  const surface = REQUIRED_FAMILY_PROJECTION_SURFACES[family] || {};
  return {
    family,
    action: surface.action || '',
    projectionStates: surface.projectionStates || [],
    requestSource: surface.requestSource || '',
    contextFlag: surface.contextFlag || '',
    requiredProjectionInputs: REQUIRED_PROJECTION_INPUTS,
    requiredProjectionOutputs: REQUIRED_PROJECTION_OUTPUTS,
    sqliteProjectionColumns: REQUIRED_SQLITE_PROJECTION_COLUMNS,
    projectionFlags: REQUIRED_PROJECTION_FLAGS,
    shadowProjectionPreviewRequired: true,
    durableProjectionApplyBlocked: true,
    sqliteColumnMappingRequired: true,
    beforeAfterPreviewRequired: true,
    scopeVerificationRequired: true,
    projectedChangedMemoryIdsRequired: true,
    governanceRevisionRequired: true,
    candidateCacheRevisionRequired: true,
    readSuppressionStateRequired: true,
    rollbackOrCleanupPlanRequired: true,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
    projectionImplemented: false,
    durableProjectionApplied: false,
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

test('accepts shadow projection policy for exclude and forget without applying projection', () => {
  const report = summarizeDeferredGovernanceShadowProjectionPolicy(basePolicy());

  assert.equal(report.shadowProjectionPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredProjectionInputs, REQUIRED_PROJECTION_INPUTS);
  assert.deepEqual(report.requiredProjectionOutputs, REQUIRED_PROJECTION_OUTPUTS);
  assert.deepEqual(report.requiredSqliteProjectionColumns, REQUIRED_SQLITE_PROJECTION_COLUMNS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.shadowProjectionPreviewRequired === true));
  assert.ok(report.familyReports.every(item => item.durableProjectionApplied === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing projection inputs, outputs, sqlite columns, or flags', () => {
  const report = summarizeDeferredGovernanceShadowProjectionPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        requiredProjectionInputs: REQUIRED_PROJECTION_INPUTS
          .filter(input => input !== 'currentProjectionRecords'),
        sqliteProjectionColumns: REQUIRED_SQLITE_PROJECTION_COLUMNS
          .filter(column => column !== 'suppression_scope_hash')
      }),
      familyPlan('memory_forget', {
        requiredProjectionOutputs: REQUIRED_PROJECTION_OUTPUTS
          .filter(output => output !== 'projectedGovernanceRevision'),
        projectionFlags: REQUIRED_PROJECTION_FLAGS
          .filter(flag => flag !== 'readSuppressionStateRequired')
      })
    ]
  }));

  assert.equal(report.shadowProjectionPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingProjectionInputs, ['currentProjectionRecords']);
  assert.deepEqual(report.familyReports[0].missingSqliteProjectionColumns, ['suppression_scope_hash']);
  assert.deepEqual(report.familyReports[1].missingProjectionOutputs, ['projectedGovernanceRevision']);
  assert.deepEqual(report.familyReports[1].missingProjectionFlags, ['readSuppressionStateRequired']);
});

test('rejects family action, projection state, or approved-context drift', () => {
  const report = summarizeDeferredGovernanceShadowProjectionPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        action: 'governed_forget_suppression_projection',
        projectionStates: ['excluded', 'governance_suppressed']
      }),
      familyPlan('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.shadowProjectionPolicyAccepted, false);
  assert.equal(report.familyReports[0].requiredAction, 'scope_suppression_projection');
  assert.deepEqual(report.familyReports[0].requiredProjectionStates, ['excluded', 'scope_suppressed']);
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceShadowProjectionPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude'),
      familyPlan('memory_validate')
    ]
  }));

  assert.equal(report.shadowProjectionPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects durable projection apply, public MCP expansion, raw exposure, and side effects', () => {
  const report = summarizeDeferredGovernanceShadowProjectionPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableProjectionApply: false, rawPrivateMemoryExposed: true }),
    familyPlans: [
      familyPlan('memory_exclude', {
        publicMcpTool: true,
        executionApproved: true,
        projectionImplemented: true
      }),
      familyPlan('memory_forget', {
        durableProjectionApplied: true,
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.shadowProjectionPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
