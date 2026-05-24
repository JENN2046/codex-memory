const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_GOVERNANCE_REVIEW_CONTEXTS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BLOCKED_READ_CONTEXTS,
  REQUIRED_BLOCKED_RECORD_STATES,
  REQUIRED_POLICY_FLAGS,
  summarizeDeferredGovernanceScopePollutionReadPolicy
} = require('../src/core/DeferredGovernanceScopePollutionReadPolicy');

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
    blockedRecordStates: REQUIRED_BLOCKED_RECORD_STATES,
    blockedReadContexts: REQUIRED_BLOCKED_READ_CONTEXTS,
    allowedGovernanceReviewContexts: ALLOWED_GOVERNANCE_REVIEW_CONTEXTS,
    normalRecallBlocked: true,
    candidateGenerationBlocked: true,
    cacheHitProjectionBlocked: true,
    scopeMismatchFailsClosed: true,
    pollutionCountersRequired: true,
    rawContentExposed: false,
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

test('accepts scope and pollution read policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceScopePollutionReadPolicy(basePolicy());

  assert.equal(report.scopePollutionReadPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredBlockedRecordStates, REQUIRED_BLOCKED_RECORD_STATES);
  assert.deepEqual(report.requiredBlockedReadContexts, REQUIRED_BLOCKED_READ_CONTEXTS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.normalRecallBlocked === true));
  assert.ok(report.familyReports.every(item => item.rawContentExposed === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects policy when normal recall or cache-hit projection can leak suppressed records', () => {
  const report = summarizeDeferredGovernanceScopePollutionReadPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        normalRecallBlocked: false
      }),
      familyPolicy('memory_forget', {
        cacheHitProjectionBlocked: false
      })
    ]
  }));

  assert.equal(report.scopePollutionReadPolicyAccepted, false);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[0].normalRecallBlocked, false);
  assert.equal(report.familyReports[1].accepted, false);
  assert.equal(report.familyReports[1].cacheHitProjectionBlocked, false);
});

test('rejects missing blocked record states or read contexts', () => {
  const report = summarizeDeferredGovernanceScopePollutionReadPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        blockedRecordStates: ['excluded', 'forgotten', 'scope_suppressed']
      }),
      familyPolicy('memory_forget', {
        blockedReadContexts: ['normal_recall', 'candidate_generation']
      })
    ]
  }));

  assert.equal(report.scopePollutionReadPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingBlockedRecordStates, ['governance_suppressed']);
  assert.deepEqual(report.familyReports[1].missingBlockedReadContexts, ['cache_hit_projection']);
});

test('requires the exact deferred family set', () => {
  const report = summarizeDeferredGovernanceScopePollutionReadPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude'),
      familyPolicy('memory_validate')
    ]
  }));

  assert.equal(report.scopePollutionReadPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects public MCP, runtime integration, raw exposure, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceScopePollutionReadPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noRuntimeMutation: false, rawPrivateMemoryExposed: true }),
    familyPolicies: [
      familyPolicy('memory_exclude', {
        publicMcpTool: true,
        rawContentExposed: true
      }),
      familyPolicy('memory_forget', {
        mutatesDurableState: true,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.scopePollutionReadPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
