const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_INVALIDATION_SCOPES,
  REQUIRED_INVALIDATION_TRIGGERS,
  REQUIRED_POLICY_FLAGS,
  REQUIRED_TARGET_FAMILIES
} = require('../src/core/DeferredGovernanceCandidateCacheInvalidationPolicy');
const {
  previewDurableGovernanceShadowProjection
} = require('../src/core/DurableGovernanceShadowProjectionPreview');
const {
  summarizeGovernanceInvalidationBoundaryConsistency
} = require('../src/core/GovernanceInvalidationBoundaryConsistency');

const fixturesDir = path.join(__dirname, 'fixtures');

function loadJsonFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

function loadProjectionRecordsFixture() {
  return loadJsonFixture('durable-governance-shadow-projection-records-v1.json').records;
}

function buildTombstoneProjectionPreview() {
  return previewDurableGovernanceShadowProjection({
    dryRunInput: {
      contract: loadJsonFixture('durable-governance-mutation-packet-v1.json'),
      phaseId: 'CM-1396-governance-invalidation-boundary',
      mutationFamily: 'memory_tombstone',
      targetMemoryIds: ['memory-tombstone-001'],
      scopeTuple: {
        projectId: 'project-cm-0863',
        workspaceId: 'workspace-cm-0863',
        clientId: 'codex-desktop',
        taskId: 'CM-0863',
        conversationId: 'thread-cm-0863',
        visibility: 'private',
        retentionPolicy: 'retain'
      },
      actorClientId: 'codex-desktop',
      requestSource: 'cm-1396-fixture',
      reason: 'memory retired after invalidation boundary review',
      evidenceSummary: 'fixture-backed invalidation boundary',
      lifecycleTransition: {
        from: 'stale',
        to: 'tombstoned'
      },
      auditIntentPolicy: 'append_only_intent_before_apply',
      auditCommitPolicy: 'append_only_commit_after_apply',
      projectionPolicy: 'shadow_metadata_projection_only',
      revisionEmitter: 'governance_state_revision',
      changedMemoryIdsPolicy: 'target_memory_ids',
      rollbackPath: 'discard preview and recompute before apply',
      validationMode: 'internal_dry_run_only',
      executionApprovalStatement: 'runtime durable governance apply remains blocked pending explicit approval',
      mutationFieldValues: {
        targetMemoryId: 'memory-tombstone-001',
        tombstoneReason: 'retention-expired',
        scopeTuple: 'workspace-cm-0863',
        reason: 'memory retired after invalidation boundary review',
        evidenceSummary: 'fixture-backed invalidation boundary',
        auditIntentPolicy: 'append_only_intent_before_apply',
        projectionPolicy: 'shadow_metadata_projection_only',
        revisionEmitter: 'governance_state_revision',
        restorationPath: 'future admin-only recovery'
      }
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    previewedAt: '2026-06-02T11:00:00.000Z'
  });
}

function safety() {
  return {
    noRuntimeMutation: true,
    noDurableAuditWrite: true,
    noDurableMemoryWrite: true,
    noPublicMcpExpansion: true,
    noProviderCall: true,
    noServiceStart: true,
    noConfigMutation: true,
    noPackageChange: true,
    noRemoteWrite: true,
    noReadinessClaim: true,
    rawSecretExposed: false,
    rawWorkspaceIdExposed: false,
    rawPrivateMemoryExposed: false
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

function candidateCacheInvalidationPolicy(overrides = {}) {
  return {
    schemaVersion: 'deferred-governance-candidate-cache-invalidation-policy-v1',
    version: 'v1',
    sourceMode: 'explicit_input',
    reviewOnly: true,
    internalOnly: true,
    publicMcpExpanded: false,
    executionApproved: false,
    runtimeIntegrated: false,
    readinessClaimed: false,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    safety: safety(),
    familyPolicies: [
      familyPolicy('memory_exclude'),
      familyPolicy('memory_forget')
    ],
    ...overrides
  };
}

test('CM-1396 accepts no-apply invalidation boundary when projection and cache policy align', () => {
  const summary = summarizeGovernanceInvalidationBoundaryConsistency({
    sourceMode: 'explicit_input',
    projectionPreview: buildTombstoneProjectionPreview(),
    candidateCacheInvalidationPolicy: candidateCacheInvalidationPolicy(),
    candidateCachePlan: {
      applied: false,
      candidateCacheCleared: false,
      durableCacheMutationExecuted: false
    }
  });

  assert.equal(summary.acceptedForInvalidationBoundary, true);
  assert.equal(summary.decision, 'NO_APPLY_INVALIDATION_BOUNDARY_ACCEPTED');
  assert.equal(summary.mutationFamily, 'memory_tombstone');
  assert.deepEqual(summary.projection.changedMemoryIds, ['memory-tombstone-001']);
  assert.equal(summary.projection.projectedRevisionTokenPresent, true);
  assert.equal(summary.projection.durableProjectionApplied, false);
  assert.equal(summary.candidateCacheInvalidation.policyAccepted, true);
  assert.equal(summary.candidateCacheInvalidation.cacheHitProjectionRecheckRequired, true);
  assert.equal(summary.candidateCacheInvalidation.staleSuppressedCacheReuseBlocked, true);
  assert.equal(summary.candidateCacheInvalidation.candidateCacheCleared, false);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.readinessClaimed, false);
});

test('CM-1396 fails closed when projection revision or cache policy is missing', () => {
  const projectionPreview = buildTombstoneProjectionPreview();
  const missingRevision = summarizeGovernanceInvalidationBoundaryConsistency({
    projectionPreview: {
      ...projectionPreview,
      projectionResult: {
        ...projectionPreview.projectionResult,
        projectedRevisionToken: null
      }
    },
    candidateCacheInvalidationPolicy: candidateCacheInvalidationPolicy()
  });
  const missingCacheScope = summarizeGovernanceInvalidationBoundaryConsistency({
    projectionPreview,
    candidateCacheInvalidationPolicy: candidateCacheInvalidationPolicy({
      familyPolicies: [
        familyPolicy('memory_exclude', {
          invalidationScopes: REQUIRED_INVALIDATION_SCOPES.filter(scope =>
            scope !== 'cache_hit_projection_recheck'
          )
        }),
        familyPolicy('memory_forget')
      ]
    })
  });

  assert.equal(missingRevision.acceptedForInvalidationBoundary, false);
  assert.equal(
    missingRevision.blockers.blockingFindings.includes('projected_revision_token_missing'),
    true
  );
  assert.equal(missingCacheScope.acceptedForInvalidationBoundary, false);
  assert.equal(
    missingCacheScope.blockers.blockingFindings.includes('candidate_cache_invalidation_policy_not_accepted'),
    true
  );
});

test('CM-1396 fails closed when candidate cache apply is asserted', () => {
  const summary = summarizeGovernanceInvalidationBoundaryConsistency({
    projectionPreview: buildTombstoneProjectionPreview(),
    candidateCacheInvalidationPolicy: candidateCacheInvalidationPolicy(),
    candidateCachePlan: {
      applied: true,
      candidateCacheCleared: true,
      durableCacheMutationExecuted: true
    }
  });

  assert.equal(summary.acceptedForInvalidationBoundary, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('candidate_cache_apply_not_blocked'), true);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
});
