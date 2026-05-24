const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_INVALIDATION_SCOPES,
  REQUIRED_INVALIDATION_TRIGGERS,
  REQUIRED_POLICY_FLAGS,
  REQUIRED_TARGET_FAMILIES,
  summarizeDeferredGovernanceCandidateCacheInvalidationPolicy
} = require('../src/core/DeferredGovernanceCandidateCacheInvalidationPolicy');

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
    invalidationTriggers: REQUIRED_INVALIDATION_TRIGGERS,
    invalidationScopes: REQUIRED_INVALIDATION_SCOPES,
    targetFamilies: REQUIRED_TARGET_FAMILIES,
    changedMemoryIdsRequired: true,
    governanceRevisionRequired: true,
    dependentCandidateEntriesCleared: true,
    targetFamilyFallbackRequired: true,
    cacheHitProjectionRechecked: true,
    staleSuppressedCacheReuseBlocked: true,
    scopeBoundaryInvalidatesCache: true,
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

test('accepts candidate-cache invalidation policy for exclude and forget without execution', () => {
  const report = summarizeDeferredGovernanceCandidateCacheInvalidationPolicy(basePolicy());

  assert.equal(report.candidateCacheInvalidationPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredInvalidationTriggers, REQUIRED_INVALIDATION_TRIGGERS);
  assert.deepEqual(report.requiredInvalidationScopes, REQUIRED_INVALIDATION_SCOPES);
  assert.deepEqual(report.requiredTargetFamilies, REQUIRED_TARGET_FAMILIES);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.changedMemoryIdsRequired === true));
  assert.ok(report.familyReports.every(item => item.cacheHitProjectionRechecked === true));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects policy when changed ids or governance revision are not required', () => {
  const report = summarizeDeferredGovernanceCandidateCacheInvalidationPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        changedMemoryIdsRequired: false
      }),
      familyPolicy('memory_forget', {
        governanceRevisionRequired: false
      })
    ]
  }));

  assert.equal(report.candidateCacheInvalidationPolicyAccepted, false);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[0].changedMemoryIdsRequired, false);
  assert.equal(report.familyReports[1].accepted, false);
  assert.equal(report.familyReports[1].governanceRevisionRequired, false);
});

test('rejects missing invalidation triggers or scopes', () => {
  const report = summarizeDeferredGovernanceCandidateCacheInvalidationPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        invalidationTriggers: [
          'governance_revision_changed',
          'changed_memory_ids_emitted',
          'suppression_state_changed'
        ]
      }),
      familyPolicy('memory_forget', {
        invalidationScopes: [
          'current_embedding_fingerprint',
          'dependent_candidate_entries',
          'target_family_fallback'
        ]
      })
    ]
  }));

  assert.equal(report.candidateCacheInvalidationPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingInvalidationTriggers, ['scope_boundary_changed']);
  assert.deepEqual(report.familyReports[1].missingInvalidationScopes, ['cache_hit_projection_recheck']);
});

test('requires the exact deferred family set and target families', () => {
  const report = summarizeDeferredGovernanceCandidateCacheInvalidationPolicy(basePolicy({
    familyPolicies: [
      familyPolicy('memory_exclude', {
        targetFamilies: ['process', 'knowledge']
      }),
      familyPolicy('memory_validate')
    ]
  }));

  assert.equal(report.candidateCacheInvalidationPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
  assert.deepEqual(report.familyReports[0].missingTargetFamilies, ['both']);
});

test('rejects public MCP, runtime integration, raw exposure, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceCandidateCacheInvalidationPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableMemoryWrite: false, rawPrivateMemoryExposed: true }),
    familyPolicies: [
      familyPolicy('memory_exclude', {
        publicMcpTool: true,
        staleSuppressedCacheReuseBlocked: false
      }),
      familyPolicy('memory_forget', {
        mutatesDurableState: true,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.candidateCacheInvalidationPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
