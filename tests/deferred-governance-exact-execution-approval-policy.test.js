const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DENIED_APPROVAL_SHORTCUTS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_FIELDS,
  REQUIRED_FAMILY_APPROVAL_ACTIONS,
  REQUIRED_POLICY_FLAGS,
  summarizeDeferredGovernanceExactExecutionApprovalPolicy
} = require('../src/core/DeferredGovernanceExactExecutionApprovalPolicy');

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
  return {
    family,
    approvalActions: REQUIRED_FAMILY_APPROVAL_ACTIONS[family] || [],
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    deniedApprovalShortcuts: DENIED_APPROVAL_SHORTCUTS,
    exactExecutionApprovalRequired: true,
    familySpecificApprovalRequired: true,
    targetMemoryIdsRequired: true,
    scopeBindingRequired: true,
    approvalExpiryRequired: true,
    auditCorrelationRequired: true,
    rollbackOrCleanupPlanRequired: true,
    implicitApprovalAllowed: false,
    bundledApprovalAllowed: false,
    wildcardTargetAllowed: false,
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

test('accepts exact execution approval policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceExactExecutionApprovalPolicy(basePolicy());

  assert.equal(report.exactExecutionApprovalPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredApprovalFields, REQUIRED_APPROVAL_FIELDS);
  assert.deepEqual(report.deniedApprovalShortcuts, DENIED_APPROVAL_SHORTCUTS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.exactExecutionApprovalRequired === true));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing approval fields and denied shortcut coverage', () => {
  const report = summarizeDeferredGovernanceExactExecutionApprovalPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        requiredApprovalFields: REQUIRED_APPROVAL_FIELDS.filter(field => field !== 'approvedScope')
      }),
      familyPolicy('memory_forget', {
        deniedApprovalShortcuts: DENIED_APPROVAL_SHORTCUTS.filter(shortcut => shortcut !== 'blanket_go_ahead')
      })
    ]
  }));

  assert.equal(report.exactExecutionApprovalPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingApprovalFields, ['approvedScope']);
  assert.deepEqual(report.familyReports[1].missingDeniedApprovalShortcuts, ['blanket_go_ahead']);
});

test('rejects implicit approval, bundled approval, and wildcard target drift', () => {
  const report = summarizeDeferredGovernanceExactExecutionApprovalPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        implicitApprovalAllowed: true,
        bundledApprovalAllowed: true
      }),
      familyPolicy('memory_forget', {
        wildcardTargetAllowed: true,
        exactExecutionApprovalRequired: false
      })
    ]
  }));

  assert.equal(report.exactExecutionApprovalPolicyAccepted, false);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[0].implicitApprovalAllowed, true);
  assert.equal(report.familyReports[0].bundledApprovalAllowed, true);
  assert.equal(report.familyReports[1].wildcardTargetAllowed, true);
  assert.equal(report.familyReports[1].exactExecutionApprovalRequired, false);
});

test('requires exact deferred family set and family-specific actions', () => {
  const report = summarizeDeferredGovernanceExactExecutionApprovalPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        approvalActions: ['forget_governed_suppression']
      }),
      familyPolicy('memory_validate')
    ]
  }));

  assert.equal(report.exactExecutionApprovalPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
  assert.deepEqual(report.familyReports[0].missingApprovalActions, ['exclude_scope_suppression']);
  assert.deepEqual(report.familyReports[0].unexpectedApprovalActions, ['forget_governed_suppression']);
});

test('rejects public MCP, runtime integration, raw exposure, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceExactExecutionApprovalPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableMemoryWrite: false, rawPrivateMemoryExposed: true }),
    familyPolicies: [
      familyPolicy('memory_exclude', {
        publicMcpTool: true
      }),
      familyPolicy('memory_forget', {
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.exactExecutionApprovalPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
