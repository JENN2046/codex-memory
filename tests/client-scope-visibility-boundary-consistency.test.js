const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeClientScopeVisibilityBoundaryConsistency
} = require('../src/core/ClientScopeVisibilityBoundaryConsistency');

const requestContext = {
  executionContext: {
    project_id: 'project-alpha',
    workspaceId: 'workspace-alpha',
    client_id: 'codex',
    taskId: 'task-alpha',
    conversation_id: 'conversation-alpha',
    visibility_policy: 'private',
    retentionPolicy: 'standard'
  }
};

const callerScopeSpoof = {
  project_id: 'project-alpha',
  workspace_id: 'workspace-alpha',
  client_id: 'claude',
  visibility: 'private'
};

function candidate(memoryId, scope, extra = {}) {
  return {
    memoryId,
    lifecycleStatus: 'active',
    scope: {
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      taskId: 'task-alpha',
      conversationId: 'conversation-alpha',
      retentionPolicy: 'standard',
      ...scope
    },
    content: `raw fixture content for ${memoryId} must not leak`,
    snippet: `raw fixture snippet for ${memoryId} must not leak`,
    sourceFile: `private/${memoryId}.jsonl`,
    ...extra
  };
}

function acceptedInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    requestContext,
    callerScope: callerScopeSpoof,
    candidates: [
      candidate('mem-shared-claude', {
        clientId: 'claude',
        visibility: 'shared'
      }),
      candidate('mem-project-ownerless', {
        clientId: '',
        visibility: 'project'
      }, {
        lifecycleStatus: 'stale'
      }),
      candidate('mem-private-codex', {
        clientId: 'codex',
        visibility: 'private'
      }),
      candidate('mem-private-claude', {
        clientId: 'claude',
        visibility: 'private'
      }),
      candidate('mem-private-ownerless', {
        clientId: '',
        visibility: 'private'
      }),
      candidate('mem-proposal-shared', {
        clientId: 'claude',
        visibility: 'shared'
      }, {
        lifecycleStatus: 'proposal'
      })
    ],
    missingRequestIdentityProbeCandidates: [
      candidate('mem-missing-context-private', {
        clientId: 'codex',
        visibility: 'private'
      })
    ],
    sideEffects: {
      runtime_applied: false,
      mcp_tools_called: 0,
      memory_tools_executed: false,
      provider_calls: 0,
      real_memory_reads: 0,
      durable_memory_writes: 0,
      durable_audit_writes: 0,
      config_watchdog_startup_changes: 0,
      readiness_claims: 0,
      reliability_claims: 0
    },
    ...overrides
  };
}

test('CM-1407 accepts no-apply client-scope visibility boundary consistency', () => {
  const summary = summarizeClientScopeVisibilityBoundaryConsistency(acceptedInput());

  assert.equal(summary.acceptedForVisibilityBoundaryConsistency, true);
  assert.equal(
    summary.decision,
    'NO_APPLY_CLIENT_SCOPE_VISIBILITY_BOUNDARY_CONSISTENCY_ACCEPTED'
  );
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.authority.requestClientId, 'codex');
  assert.equal(summary.authority.callerScopeClientId, 'claude');
  assert.equal(summary.authority.requestWorkspacePresent, true);
  assert.equal(summary.authority.callerScopeWorkspacePresent, true);
  assert.equal(summary.authority.callerScopeCandidateFilterOnly, true);
  assert.deepEqual(summary.visibilityPolicy.readableLifecycleStatuses, ['active', 'stale']);
  assert.equal(summary.visibilityPolicy.sameClientPrivateAccepted, true);
  assert.equal(summary.visibilityPolicy.nonPrivateVisibilityAccepted, true);
  assert.equal(summary.visibilityPolicy.crossClientPrivateSuppressed, true);
  assert.equal(summary.visibilityPolicy.ownerlessPrivateSuppressed, true);
  assert.equal(summary.visibilityPolicy.missingRequestIdentityPrivateSuppressed, true);
  assert.equal(summary.visibilityPolicy.blockedLifecycleSuppressed, true);
  assert.equal(summary.visibilityPolicy.acceptedCount, 3);
  assert.equal(summary.visibilityPolicy.suppressedCount, 4);
  assert.equal(summary.rawCandidateDataExposed, false);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.configChanged, false);
  assert.equal(summary.watchdogStartupChanged, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.reliabilityClaimed, false);
  assert.equal(summary.safety.callsMcpTools, false);
  assert.equal(summary.safety.callsMemoryTools, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.usesBearerToken, false);
  assert.equal(summary.safety.mutatesClientConfig, false);
  assert.equal(summary.safety.mutatesDurableState, false);

  const suppressed = summary.sanitizedPolicyTrace.suppressedCandidates;
  assert.equal(
    suppressed.some(candidateSummary =>
      candidateSummary.memoryId === 'mem-private-claude' &&
      candidateSummary.blockers.includes('cross_client_private_suppressed')
    ),
    true
  );
  assert.equal(
    suppressed.some(candidateSummary =>
      candidateSummary.memoryId === 'mem-proposal-shared' &&
      candidateSummary.blockers.includes('lifecycle_status_not_readable')
    ),
    true
  );
  assert.equal(
    summary.sanitizedPolicyTrace.acceptedCandidates.some(candidateSummary =>
      candidateSummary.memoryId === 'mem-project-ownerless' &&
      candidateSummary.lifecycleStatus === 'stale' &&
      candidateSummary.visibility === 'project'
    ),
    true
  );
  assert.doesNotMatch(JSON.stringify(summary), /workspace-alpha|task-alpha|conversation-alpha/);
  assert.doesNotMatch(JSON.stringify(summary), /raw fixture content|raw fixture snippet|sourceFile|jsonl/);
});

test('CM-1407 fails closed when same-client private acceptance is absent', () => {
  const summary = summarizeClientScopeVisibilityBoundaryConsistency(acceptedInput({
    candidates: acceptedInput().candidates.filter(item => item.memoryId !== 'mem-private-codex')
  }));

  assert.equal(summary.acceptedForVisibilityBoundaryConsistency, false);
  assert.equal(summary.visibilityPolicy.sameClientPrivateAccepted, false);
  assert.equal(summary.blockers.blockingFindings.includes('same_client_private_not_accepted'), true);
});

test('CM-1407 fails closed when cross-client private suppression is not proven', () => {
  const summary = summarizeClientScopeVisibilityBoundaryConsistency(acceptedInput({
    candidates: acceptedInput().candidates.filter(item => item.memoryId !== 'mem-private-claude')
  }));

  assert.equal(summary.acceptedForVisibilityBoundaryConsistency, false);
  assert.equal(summary.visibilityPolicy.crossClientPrivateSuppressed, false);
  assert.equal(summary.blockers.blockingFindings.includes('cross_client_private_not_suppressed'), true);
});

test('CM-1407 fails closed when missing-request identity private probe is absent', () => {
  const summary = summarizeClientScopeVisibilityBoundaryConsistency(acceptedInput({
    missingRequestIdentityProbeCandidates: []
  }));

  assert.equal(summary.acceptedForVisibilityBoundaryConsistency, false);
  assert.equal(summary.visibilityPolicy.missingRequestIdentityPrivateSuppressed, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('missing_request_identity_private_not_suppressed'),
    true
  );
});

test('CM-1407 fails closed when blocked lifecycle suppression is not proven', () => {
  const summary = summarizeClientScopeVisibilityBoundaryConsistency(acceptedInput({
    candidates: acceptedInput().candidates.filter(item => item.memoryId !== 'mem-proposal-shared')
  }));

  assert.equal(summary.acceptedForVisibilityBoundaryConsistency, false);
  assert.equal(summary.visibilityPolicy.blockedLifecycleSuppressed, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('blocked_lifecycle_status_not_suppressed'),
    true
  );
});

test('CM-1407 fails closed when no-apply invariant is violated', () => {
  const summary = summarizeClientScopeVisibilityBoundaryConsistency(acceptedInput({
    sideEffects: {
      true_search_memory_calls: 1,
      provider_calls: 1,
      real_memory_reads: 1,
      raw_jsonl_reads: 1,
      durable_memory_writes: 1,
      config_watchdog_startup_changes: 1,
      vector_flushes: 1,
      readiness_claims: 1
    }
  }));

  assert.equal(summary.acceptedForVisibilityBoundaryConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.readinessClaimed, false);
});

test('CM-1409 keeps CM-1407 fail-closed for string encoded side effects', () => {
  const summary = summarizeClientScopeVisibilityBoundaryConsistency(acceptedInput({
    sideEffects: {
      trueSearchMemoryCalls: false,
      true_search_memory_calls: '1',
      providerCalls: false,
      provider_calls: '1',
      real_memory_reads: '1',
      raw_jsonl_reads: '1',
      durable_memory_writes: '1',
      config_watchdog_startup_changes: '1',
      vector_flushes: '1',
      readiness_claims: '1'
    }
  }));

  assert.equal(summary.acceptedForVisibilityBoundaryConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
});
