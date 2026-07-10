const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeClientScopeExecutionContextAuthorityConsistency
} = require('../src/core/ClientScopeExecutionContextAuthorityConsistency');

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

const aliasProbeExecutionContext = {
  projectId: 'project-alpha',
  workspace_id: 'workspace-alpha',
  clientId: 'codex',
  task_id: 'task-alpha',
  conversationId: 'conversation-alpha',
  visibility: 'private',
  retention_policy: 'standard'
};

const payloadScopeSpoof = {
  scope: {
    project_id: 'project-beta',
    workspace_id: 'workspace-payload-private',
    client_id: 'claude',
    task_id: 'task-payload-private',
    conversation_id: 'conversation-payload-private',
    visibility_policy: 'shared',
    retention_policy: 'temporary'
  }
};

const searchScopeSpoof = {
  projectId: 'project-beta',
  workspaceId: 'workspace-search-private',
  clientId: 'claude',
  taskId: 'task-search-private',
  conversationId: 'conversation-search-private',
  visibility: 'private',
  retentionPolicy: 'temporary'
};

const clientDeclaredScopeSpoof = {
  project_id: 'project-beta',
  workspace_id: 'workspace-client-private',
  client_id: 'claude',
  task_id: 'task-client-private',
  conversation_id: 'conversation-client-private',
  visibility: 'private',
  retention_policy: 'temporary'
};

function acceptedInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    requestContext,
    aliasProbeExecutionContext,
    payloadScope: payloadScopeSpoof,
    searchScope: searchScopeSpoof,
    clientDeclaredScope: clientDeclaredScopeSpoof,
    missingClientIdentityProbe: {
      operation: 'private_read',
      requestContext: {
        executionContext: {
          project_id: 'project-alpha',
          workspaceId: 'workspace-alpha',
          visibility_policy: 'private'
        }
      },
      payloadScope: {
        client_id: 'codex'
      }
    },
    publicTools: ['audit_memory', 'memory_overview', 'prepare_memory_context', 'propose_memory_delta', 'record_memory', 'search_memory', 'supersede_memory', 'tombstone_memory', 'validate_memory'],
    sideEffects: {
      runtime_applied: false,
      mcp_tools_called: 0,
      memory_tools_executed: false,
      provider_calls: 0,
      durable_memory_writes: 0,
      durable_audit_writes: 0,
      config_changed: false,
      watchdog_startup_changed: false,
      public_mcp_expansions: 0,
      readiness_claimed: false,
      reliability_claimed: false
    },
    ...overrides
  };
}

test('CM-1406 accepts no-apply execution-context authority normalization consistency', () => {
  const summary = summarizeClientScopeExecutionContextAuthorityConsistency(acceptedInput());

  assert.equal(summary.acceptedForExecutionContextAuthorityConsistency, true);
  assert.equal(
    summary.decision,
    'NO_APPLY_CLIENT_SCOPE_EXECUTION_CONTEXT_AUTHORITY_CONSISTENCY_ACCEPTED'
  );
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.authority.aliasNormalizationEquivalent, true);
  assert.equal(summary.authority.executionContextIdentityPresent, true);
  assert.equal(summary.authority.declaredScopeIdentitySpoofBlocked, true);
  assert.equal(summary.authority.missingClientIdentityFailsClosed, true);
  assert.equal(summary.authority.authorityScope.projectId, 'project-alpha');
  assert.equal(summary.authority.authorityScope.clientId, 'codex');
  assert.equal(summary.authority.authorityScope.workspaceIdPresent, true);
  assert.equal(summary.authority.authorityScope.taskIdPresent, true);
  assert.equal(summary.authority.authorityScope.conversationIdPresent, true);
  assert.equal(summary.authority.authorityScope.visibility, 'private');
  assert.equal(summary.publicTools.frozen, true);
  assert.deepEqual(summary.publicTools.expected, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.deepEqual(summary.declaredScopes.map(scope => scope.identityMismatchBlocked), [
    true,
    true,
    true
  ]);
  assert.equal(summary.missingClientIdentityProbe.failsClosed, true);
  assert.equal(summary.rawPrivateScopeExposed, false);
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

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /workspace-alpha|workspace-payload-private/);
  assert.doesNotMatch(serialized, /workspace-search-private|workspace-client-private/);
  assert.doesNotMatch(serialized, /task-alpha|task-payload-private|task-search-private/);
  assert.doesNotMatch(serialized, /conversation-alpha|conversation-payload-private/);
});

test('CM-1406 fails closed when alias-normalized execution context drifts', () => {
  const summary = summarizeClientScopeExecutionContextAuthorityConsistency(acceptedInput({
    aliasProbeExecutionContext: {
      ...aliasProbeExecutionContext,
      clientId: 'claude'
    }
  }));

  assert.equal(summary.acceptedForExecutionContextAuthorityConsistency, false);
  assert.equal(summary.authority.aliasNormalizationEquivalent, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('execution_context_alias_normalization_drift'),
    true
  );
});

test('CM-1406 fails closed when competing scope spoof proof is absent', () => {
  const summary = summarizeClientScopeExecutionContextAuthorityConsistency(acceptedInput({
    payloadScope: {},
    searchScope: {},
    clientDeclaredScope: {}
  }));

  assert.equal(summary.acceptedForExecutionContextAuthorityConsistency, false);
  assert.equal(summary.authority.declaredScopeIdentitySpoofBlocked, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('declared_scope_identity_spoof_not_blocked'),
    true
  );
});

test('CM-1406 fails closed when missing-client identity proof is absent', () => {
  const summary = summarizeClientScopeExecutionContextAuthorityConsistency(acceptedInput({
    missingClientIdentityProbe: {
      operation: 'private_read',
      requestContext,
      payloadScope: {
        client_id: 'codex'
      }
    }
  }));

  assert.equal(summary.acceptedForExecutionContextAuthorityConsistency, false);
  assert.equal(summary.authority.missingClientIdentityFailsClosed, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('missing_client_identity_not_fail_closed'),
    true
  );
});

test('CM-1406 fails closed when public MCP tools are expanded', () => {
  const summary = summarizeClientScopeExecutionContextAuthorityConsistency(acceptedInput({
    publicTools: ['record_memory', 'search_memory', 'memory_overview', 'client_scope_debug']
  }));

  assert.equal(summary.acceptedForExecutionContextAuthorityConsistency, false);
  assert.equal(summary.publicTools.frozen, false);
  assert.equal(summary.blockers.blockingFindings.includes('public_tools_not_frozen'), true);
});

test('CM-1406 fails closed when no-apply invariant is violated', () => {
  const summary = summarizeClientScopeExecutionContextAuthorityConsistency(acceptedInput({
    sideEffects: {
      mcp_tools_called: 1,
      true_record_memory_calls: 1,
      provider_calls: 1,
      real_memory_reads: 1,
      durable_memory_writes: 1,
      config_watchdog_startup_changes: 1,
      candidate_cache_writes: 1,
      readiness_claimed: true
    }
  }));

  assert.equal(summary.acceptedForExecutionContextAuthorityConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.readinessClaimed, false);
});

test('CM-1409 keeps CM-1406 fail-closed for string encoded side effects', () => {
  const summary = summarizeClientScopeExecutionContextAuthorityConsistency(acceptedInput({
    sideEffects: {
      trueRecordMemoryCalls: false,
      mcp_tools_called: '1',
      true_record_memory_calls: '1',
      providerCalls: false,
      provider_calls: '1',
      real_memory_reads: '1',
      durable_memory_writes: '1',
      config_watchdog_startup_changes: '1',
      candidate_cache_writes: '1',
      readiness_claims: '1'
    }
  }));

  assert.equal(summary.acceptedForExecutionContextAuthorityConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
});
