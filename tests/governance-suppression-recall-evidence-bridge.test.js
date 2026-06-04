'use strict';

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
const {
  summarizeGovernanceSuppressionRecallEvidenceBridge
} = require('../src/core/GovernanceSuppressionRecallEvidenceBridge');

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

function acceptedConsistency(overrides = {}) {
  return summarizeGovernanceScopeSuppressionConsistency({
    sourceMode: 'explicit_input',
    deferredPolicy: deferredPolicy(),
    lifecycleIsolation: lifecycleIsolation(),
    ...overrides
  });
}

function mcpResponse(structuredContent, wrapperText = '{"ignored":"wrapper"}') {
  return {
    jsonrpc: '2.0',
    id: 7,
    result: {
      content: [
        {
          type: 'text',
          text: wrapperText
        }
      ],
      structuredContent,
      isError: false
    }
  };
}

function boundedRecallEvidence(resultOverrides = {}) {
  return mcpResponse({
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: 1,
    results: [
      {
        target: 'both',
        score: 0.8,
        baseScore: 0.7,
        rerankScore: null,
        titleHitCount: 0,
        tagHitCount: 1,
        contentHitCount: 0,
        evidenceHitCount: 0,
        exactCoreTagCount: 0,
        tagMemoSurfaceScore: 0,
        dynamicCoreWeight: 0,
        sourceKinds: ['synthetic'],
        ...resultOverrides
      }
    ]
  });
}

function acceptedInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    suppressionConsistency: acceptedConsistency(),
    recallEvidence: boundedRecallEvidence(),
    suppressionProjection: {
      governanceSuppressedProjected: false,
      privateProjected: false
    },
    ...overrides
  };
}

test('CM-1443 accepts sanitized recall evidence bridged from CM-1441 consistency', () => {
  const summary = summarizeGovernanceSuppressionRecallEvidenceBridge(acceptedInput());

  assert.equal(summary.acceptedForRecallEvidenceBridge, true);
  assert.equal(
    summary.decision,
    'NO_APPLY_GOVERNANCE_SUPPRESSION_RECALL_EVIDENCE_BRIDGE_ACCEPTED'
  );
  assert.equal(summary.consistency.accepted, true);
  assert.equal(summary.recallEvidence.accepted, true);
  assert.equal(summary.recallEvidence.resultCount, 1);
  assert.equal(summary.recallEvidence.violationCount, 0);
  assert.equal(summary.suppressionProjection.explicit, true);
  assert.equal(summary.suppressionProjection.governanceSuppressedProjected, false);
  assert.equal(summary.suppressionProjection.privateProjected, false);
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
  assert.equal(summary.safety.rawPrivateMemoryExposed, false);

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /workspace-alpha|task-alpha|conversation-alpha/);
  assert.doesNotMatch(serialized, /raw .* content|raw .* snippet|sourceFile|jsonl/);
});

test('CM-1443 fails closed when CM-1441 consistency is not accepted', () => {
  const summary = summarizeGovernanceSuppressionRecallEvidenceBridge(acceptedInput({
    suppressionConsistency: acceptedConsistency({
      deferredPolicy: deferredPolicy({
        familyPolicies: [
          familyPolicy('memory_exclude', { normalRecallBlocked: false }),
          familyPolicy('memory_forget')
        ]
      })
    })
  }));

  assert.equal(summary.acceptedForRecallEvidenceBridge, false);
  assert.equal(summary.consistency.accepted, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('suppression_consistency_not_accepted'),
    true
  );
});

test('CM-1443 fails closed when bounded recall evidence exposes memory id', () => {
  const summary = summarizeGovernanceSuppressionRecallEvidenceBridge(acceptedInput({
    recallEvidence: boundedRecallEvidence({
      memoryId: 'synthetic-memory-id'
    })
  }));

  assert.equal(summary.acceptedForRecallEvidenceBridge, false);
  assert.equal(summary.recallEvidence.accepted, false);
  assert.equal(summary.safety.rawPrivateMemoryExposed, true);
  assert.equal(
    summary.blockers.blockingFindings.includes('bounded_recall_evidence_shape_not_accepted'),
    true
  );
});

test('CM-1443 fails closed when suppressed projection flags are true', () => {
  const summary = summarizeGovernanceSuppressionRecallEvidenceBridge(acceptedInput({
    suppressionProjection: {
      governanceSuppressedProjected: true,
      privateProjected: false
    }
  }));

  assert.equal(summary.acceptedForRecallEvidenceBridge, false);
  assert.equal(summary.suppressionProjection.governanceSuppressedProjected, true);
  assert.equal(
    summary.blockers.blockingFindings.includes('governance_suppressed_candidate_projected'),
    true
  );
});

test('CM-1443 fails closed when private or governance source kinds are projected', () => {
  const summary = summarizeGovernanceSuppressionRecallEvidenceBridge(acceptedInput({
    recallEvidence: boundedRecallEvidence({
      sourceKinds: ['synthetic', 'private']
    })
  }));

  assert.equal(summary.acceptedForRecallEvidenceBridge, false);
  assert.equal(summary.suppressionProjection.forbiddenSourceKindViolationCount, 1);
  assert.equal(
    summary.blockers.blockingFindings.includes('forbidden_source_kind_projected'),
    true
  );
});

test('CM-1443 fails closed when projection proof is not explicit', () => {
  const summary = summarizeGovernanceSuppressionRecallEvidenceBridge(acceptedInput({
    suppressionProjection: {}
  }));

  assert.equal(summary.acceptedForRecallEvidenceBridge, false);
  assert.equal(summary.suppressionProjection.explicit, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('suppression_projection_not_explicit'),
    true
  );
});
