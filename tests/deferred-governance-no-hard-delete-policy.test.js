const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_POLICY_FLAGS,
  summarizeDeferredGovernanceNoHardDeletePolicy
} = require('../src/core/DeferredGovernanceNoHardDeletePolicy');

function baseSafety(overrides = {}) {
  const safety = {};
  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    safety[flag] = true;
  }
  return {
    ...safety,
    rawSecretExposed: false,
    rawWorkspaceIdExposed: false,
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
      familyPolicy('memory_exclude', 'scope_suppression'),
      familyPolicy('memory_forget', 'governed_suppression_then_review')
    ],
    ...overrides
  };
}

function familyPolicy(family, defaultAction, overrides = {}) {
  return {
    family,
    defaultAction,
    hardDeleteAllowedByDefault: false,
    destructiveDeleteRequiresExactApproval: true,
    appendOnlyAuditRequired: true,
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

test('accepts no-hard-delete default policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceNoHardDeletePolicy(basePolicy());

  assert.equal(report.noHardDeleteDefaultAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.governedFamilies.missing, []);
  assert.deepEqual(report.governedFamilies.unexpected, []);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.hardDeleteAllowedByDefault === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects hard delete as a default action', () => {
  const report = summarizeDeferredGovernanceNoHardDeletePolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', 'hard_delete', {
        hardDeleteAllowedByDefault: true
      }),
      familyPolicy('memory_forget', 'governed_suppression_then_review')
    ]
  }));

  assert.equal(report.noHardDeleteDefaultAccepted, false);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[0].hardDeleteAllowedByDefault, true);
});

test('rejects missing exact approval requirement for destructive delete', () => {
  const report = summarizeDeferredGovernanceNoHardDeletePolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', 'scope_suppression'),
      familyPolicy('memory_forget', 'governed_suppression_then_review', {
        destructiveDeleteRequiresExactApproval: false
      })
    ]
  }));

  assert.equal(report.noHardDeleteDefaultAccepted, false);
  assert.equal(report.familyReports[1].accepted, false);
  assert.equal(report.familyReports[1].destructiveDeleteRequiresExactApproval, false);
});

test('requires the exact deferred family set', () => {
  const report = summarizeDeferredGovernanceNoHardDeletePolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', 'scope_suppression'),
      familyPolicy('memory_validate', 'governed_tombstone')
    ]
  }));

  assert.equal(report.noHardDeleteDefaultAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects public MCP, runtime integration, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceNoHardDeletePolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableMemoryWrite: false }),
    familyPolicies: [
      familyPolicy('memory_exclude', 'scope_suppression', {
        publicMcpTool: true
      }),
      familyPolicy('memory_forget', 'governed_suppression_then_review', {
        mutatesDurableState: true
      })
    ]
  }));

  assert.equal(report.noHardDeleteDefaultAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
