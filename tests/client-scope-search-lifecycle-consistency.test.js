const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeClientScopeSearchLifecycleConsistency
} = require('../src/core/ClientScopeSearchLifecycleConsistency');

const requestContext = {
  executionContext: {
    projectId: 'project-alpha',
    workspaceId: 'workspace-alpha',
    clientId: 'codex',
    taskId: 'task-alpha',
    conversationId: 'conversation-alpha',
    visibility: 'private',
    retentionPolicy: 'standard'
  }
};

const matchingSearchScope = {
  project_id: 'project-alpha',
  workspace_id: 'workspace-alpha',
  client_id: 'codex',
  visibility: 'private',
  strict: false
};

const spoofedSearchScope = {
  project_id: 'project-beta',
  workspace_id: 'workspace-beta',
  client_id: 'claude',
  visibility: 'private',
  strict: true
};

function candidate(memoryId, scope, extra = {}) {
  return {
    memoryId,
    lifecycleStatus: 'active',
    scope: {
      taskId: 'task-alpha',
      conversationId: 'conversation-alpha',
      retentionPolicy: 'standard',
      ...scope
    },
    title: `raw title for ${memoryId} must not leak`,
    content: `raw content for ${memoryId} must not leak`,
    snippet: `raw snippet for ${memoryId} must not leak`,
    sourceFile: `private/${memoryId}.jsonl`,
    ...extra
  };
}

function acceptedInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    requestContext,
    searchScope: matchingSearchScope,
    spoofedSearchScope,
    candidates: [
      candidate('mem-alpha-codex-private', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      }),
      candidate('mem-beta-codex-private', {
        projectId: 'project-beta',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      }),
      candidate('mem-alpha-claude-private', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'claude',
        visibility: 'private'
      }),
      candidate('mem-alpha-codex-shared', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'shared'
      })
    ],
    spoofProbeCandidates: [
      candidate('mem-beta-claude-private', {
        projectId: 'project-beta',
        workspaceId: 'workspace-beta',
        clientId: 'claude',
        visibility: 'private'
      }),
      candidate('mem-alpha-codex-private-control', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      })
    ],
    ...overrides
  };
}

test('CM-1404 accepts no-apply search scope and lifecycle governance consistency', () => {
  const summary = summarizeClientScopeSearchLifecycleConsistency(acceptedInput());

  assert.equal(summary.acceptedForSearchLifecycleConsistency, true);
  assert.equal(summary.decision, 'NO_APPLY_CLIENT_SCOPE_SEARCH_LIFECYCLE_CONSISTENCY_ACCEPTED');
  assert.equal(summary.authority.requestClientId, 'codex');
  assert.equal(summary.authority.searchScopeClientId, 'codex');
  assert.equal(summary.authority.lifecycleCurrentScopeClientId, 'codex');
  assert.equal(summary.authority.requestWorkspacePresent, true);
  assert.equal(summary.authority.lifecycleCurrentScopeWorkspacePresent, true);
  assert.equal(summary.authority.lifecycleCurrentScopeFromExecutionContext, true);
  assert.equal(summary.authority.searchScopeDoesNotBecomeLifecycleIdentity, true);
  assert.equal(summary.searchScope.appliedAsCandidateFilter, true);
  assert.equal(summary.searchScope.scopedSearchFiltersProjectWorkspaceClientVisibility, true);
  assert.equal(summary.searchScope.acceptedCount, 1);
  assert.equal(summary.searchScope.filteredOutCount, 3);
  assert.equal(summary.lifecycleReadPolicy.acceptedLifecycleCandidatePresent, true);
  assert.equal(summary.lifecycleReadPolicy.spoofProbeCandidateFilterAcceptedCount, 1);
  assert.equal(summary.lifecycleReadPolicy.spoofProbeLifecycleSuppressedCount, 1);
  assert.equal(summary.lifecycleReadPolicy.spoofScopeCandidateSuppressed, true);
  assert.equal(summary.rawSuppressedMetadataExposed, false);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.configChanged, false);
  assert.equal(summary.watchdogStartupChanged, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.reliabilityClaimed, false);
  assert.equal(summary.safety.callsMemoryTools, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.scansRealMemory, false);
  assert.equal(summary.safety.rawPrivateMemoryExposed, false);

  const serializedAudit = JSON.stringify(summary.sanitizedAuditMetadata);
  assert.match(serializedAudit, /mem-beta-codex-private/);
  assert.match(serializedAudit, /search_scope_candidate_filter_mismatch/);
  assert.match(serializedAudit, /mem-beta-claude-private/);
  assert.match(serializedAudit, /scope_mismatch_excluded/);
  assert.doesNotMatch(
    serializedAudit,
    /raw title|raw content|raw snippet|sourceFile|jsonl|project-beta|workspace-beta/
  );
  assert.doesNotMatch(JSON.stringify(summary), /workspace-alpha|workspace-beta/);
});

test('CM-1404 fails closed when lifecycle scope follows spoofed search scope', () => {
  const summary = summarizeClientScopeSearchLifecycleConsistency(acceptedInput({
    lifecycleExecutionContext: {
      projectId: 'project-beta',
      workspaceId: 'workspace-beta',
      clientId: 'claude',
      visibility: 'private'
    }
  }));

  assert.equal(summary.acceptedForSearchLifecycleConsistency, false);
  assert.equal(summary.authority.lifecycleCurrentScopeFromExecutionContext, false);
  assert.equal(summary.authority.searchScopeDoesNotBecomeLifecycleIdentity, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('lifecycle_current_scope_not_execution_context'),
    true
  );
  assert.equal(
    summary.blockers.blockingFindings.includes('search_scope_identity_spoof_not_proven_blocked'),
    true
  );
});

test('CM-1404 fails closed when search scope does not filter all supplied dimensions', () => {
  const summary = summarizeClientScopeSearchLifecycleConsistency(acceptedInput({
    searchScope: {
      project_id: 'project-alpha',
      client_id: 'codex'
    }
  }));

  assert.equal(summary.acceptedForSearchLifecycleConsistency, false);
  assert.equal(summary.searchScope.scopedSearchFiltersProjectWorkspaceClientVisibility, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('search_scope_dimension_filtering_not_proven'),
    true
  );
});

test('CM-1404 keeps suppressed metadata sanitized even when candidates carry raw private fields', () => {
  const summary = summarizeClientScopeSearchLifecycleConsistency(acceptedInput({
    spoofProbeCandidates: [
      {
        memoryId: 'mem-leak-probe',
        lifecycleStatus: 'active',
        scope: {
          projectId: 'project-beta',
          workspaceId: 'workspace-beta',
          clientId: 'claude',
          visibility: 'private'
        },
        malformedScope: true,
        raw: {
          content: 'raw private nested content must fail'
        }
      }
    ]
  }));

  assert.equal(summary.acceptedForSearchLifecycleConsistency, true);
  assert.equal(summary.rawSuppressedMetadataExposed, false);
  assert.equal(summary.blockers.blockingFindings.includes('raw_suppressed_metadata_exposed'), false);

  const serializedAudit = JSON.stringify(summary.sanitizedAuditMetadata);
  assert.match(serializedAudit, /mem-leak-probe/);
  assert.doesNotMatch(serializedAudit, /raw private nested content|"content"|"raw"|sourceFile|jsonl/);
});

test('CM-1404 fails closed when no-apply invariant is violated', () => {
  const summary = summarizeClientScopeSearchLifecycleConsistency(acceptedInput({
    sideEffects: {
      memory_tools_executed: 1,
      providerCalls: 1,
      durableMutationExecuted: true,
      readinessClaimed: true
    }
  }));

  assert.equal(summary.acceptedForSearchLifecycleConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.readinessClaimed, false);
});

test('CM-1409 keeps CM-1404 fail-closed for string encoded side effects', () => {
  const summary = summarizeClientScopeSearchLifecycleConsistency(acceptedInput({
    sideEffects: {
      memory_tools_executed: '1',
      provider_calls: '1',
      durable_audit_writes: '1',
      readiness_claims: '1'
    }
  }));

  assert.equal(summary.acceptedForSearchLifecycleConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
});
