const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_GOVERNANCE_REVIEW_CONTEXTS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BLOCKED_READ_CONTEXTS,
  REQUIRED_BLOCKED_RECORD_STATES,
  REQUIRED_POLICY_FLAGS
} = require('../src/core/DeferredGovernanceScopePollutionReadPolicy');
const {
  REQUIRED_UNSAFE_STATUSES
} = require('../src/core/GovernanceLifecycleReadPolicyIsolation');
const {
  summarizeGovernanceScopeSuppressionConsistency
} = require('../src/core/GovernanceScopeSuppressionConsistency');

const currentScope = {
  projectId: 'project-alpha',
  workspaceId: 'workspace-alpha',
  clientId: 'codex',
  taskId: 'task-alpha',
  conversationId: 'conversation-alpha',
  visibility: 'private',
  retentionPolicy: 'standard'
};

const requiredScopeFields = [
  'projectId',
  'workspaceId',
  'clientId',
  'taskId',
  'conversationId',
  'visibility',
  'retentionPolicy'
];

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

function deferredPolicy(overrides = {}) {
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

function candidate(memoryId, lifecycleStatus, extra = {}) {
  return {
    memoryId,
    lifecycleStatus,
    scope: currentScope,
    content: `raw ${lifecycleStatus} content must not leak`,
    snippet: `raw ${lifecycleStatus} snippet must not leak`,
    sourceFile: `raw/${lifecycleStatus}.jsonl`,
    ...extra
  };
}

function lifecycleIsolation(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    currentScope,
    requiredScopeFields,
    candidates: [
      candidate('mem-active', 'active'),
      ...REQUIRED_UNSAFE_STATUSES.map(status => candidate(`mem-${status}`, status))
    ],
    ...overrides
  };
}

function acceptedInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    deferredPolicy: deferredPolicy(),
    lifecycleIsolation: lifecycleIsolation(),
    ...overrides
  };
}

test('CM-1441 accepts no-apply governance scope suppression consistency', () => {
  const summary = summarizeGovernanceScopeSuppressionConsistency(acceptedInput());

  assert.equal(summary.acceptedForGovernanceScopeSuppressionConsistency, true);
  assert.equal(
    summary.decision,
    'NO_APPLY_GOVERNANCE_SCOPE_SUPPRESSION_CONSISTENCY_ACCEPTED'
  );
  assert.equal(summary.deferredPolicy.accepted, true);
  assert.equal(summary.deferredPolicy.governedFamiliesExact, true);
  assert.equal(summary.deferredPolicy.publicMcpFrozen, true);
  assert.equal(summary.lifecycleIsolation.accepted, true);
  assert.equal(summary.lifecycleIsolation.acceptedCount, 1);
  assert.equal(summary.lifecycleIsolation.missingUnsafeStatuses.length, 0);
  assert.equal(summary.lifecycleIsolation.unsafeStatusAccepted, false);
  assert.equal(summary.rawSuppressedMetadataExposed, false);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.reliabilityClaimed, false);
  assert.equal(summary.safety.callsMemoryTools, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.usesBearerToken, false);
  assert.equal(summary.safety.scansRealMemory, false);
  assert.equal(summary.safety.rawPrivateMemoryExposed, false);

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /raw .* content|raw .* snippet|sourceFile|jsonl/);
  assert.doesNotMatch(serialized, /workspace-alpha|task-alpha|conversation-alpha/);
});

test('CM-1441 fails closed when deferred policy does not prove normal recall blocking', () => {
  const summary = summarizeGovernanceScopeSuppressionConsistency(acceptedInput({
    deferredPolicy: deferredPolicy({
      familyPolicies: [
        familyPolicy('memory_exclude', { normalRecallBlocked: false }),
        familyPolicy('memory_forget')
      ]
    })
  }));

  assert.equal(summary.acceptedForGovernanceScopeSuppressionConsistency, false);
  assert.equal(summary.deferredPolicy.accepted, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('deferred_scope_pollution_policy_not_accepted'),
    true
  );
});

test('CM-1441 fails closed when lifecycle suppression coverage is incomplete', () => {
  const summary = summarizeGovernanceScopeSuppressionConsistency(acceptedInput({
    lifecycleIsolation: lifecycleIsolation({
      candidates: [
        candidate('mem-active', 'active'),
        candidate('mem-tombstoned', 'tombstoned')
      ]
    })
  }));

  assert.equal(summary.acceptedForGovernanceScopeSuppressionConsistency, false);
  assert.equal(summary.lifecycleIsolation.accepted, false);
  assert.equal(summary.lifecycleIsolation.missingUnsafeStatuses.includes('proposal'), true);
  assert.equal(
    summary.blockers.blockingFindings.includes('lifecycle_read_policy_isolation_not_accepted'),
    true
  );
});

test('CM-1441 fails closed when raw suppressed metadata exposure is reported', () => {
  const summary = summarizeGovernanceScopeSuppressionConsistency(acceptedInput({
    deferredPolicy: deferredPolicy({
      safety: baseSafety({ rawPrivateMemoryExposed: true })
    })
  }));

  assert.equal(summary.acceptedForGovernanceScopeSuppressionConsistency, false);
  assert.equal(summary.rawSuppressedMetadataExposed, true);
  assert.equal(summary.safety.rawPrivateMemoryExposed, true);
  assert.equal(
    summary.blockers.blockingFindings.includes('raw_suppressed_metadata_exposed'),
    true
  );
});

test('CM-1441 fails closed when no-apply invariant is violated', () => {
  const summary = summarizeGovernanceScopeSuppressionConsistency(acceptedInput({
    deferredPolicy: deferredPolicy({
      runtimeIntegrated: true,
      safety: baseSafety({ noRuntimeMutation: false })
    })
  }));

  assert.equal(summary.acceptedForGovernanceScopeSuppressionConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
});
