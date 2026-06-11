'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ExecutionContextResolver } = require('../src/core/ExecutionContextResolver');
const {
  summarizeRecordMemoryPrincipalScopeAuthorizationPreflight
} = require('../src/core/RecordMemoryPrincipalScopeAuthorizationPreflight');

const resolver = new ExecutionContextResolver({
  allowedAgentAlias: 'Codex',
  defaultAgentId: 'codex-default-agent',
  defaultRequestSource: 'codex-memory-mcp'
});

const policy = {
  allowedAgentAlias: 'Codex',
  allowedAgentIds: ['codex-desktop'],
  allowedRequestSources: ['codex-memory-mcp'],
  allowedProjectIds: ['codex-memory'],
  allowedWorkspaceIds: ['workspace-alpha'],
  allowedClientIds: ['codex']
};

function acceptedInput(overrides = {}) {
  const executionContext = resolver.resolve({
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'codex-memory-mcp',
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'codex',
      task_id: 'task-alpha',
      conversation_id: 'conversation-alpha',
      visibility_policy: 'private',
      retention_policy: 'standard'
    }
  });

  return {
    sourceMode: 'explicit_input',
    policy,
    executionContext,
    ...overrides
  };
}

test('CM1631 accepts exact principal and scope preflight without runtime authorization change', () => {
  const summary = summarizeRecordMemoryPrincipalScopeAuthorizationPreflight(acceptedInput());

  assert.equal(summary.acceptedForPrincipalScopeAuthorizationPreflight, true);
  assert.equal(
    summary.decision,
    'NO_APPLY_RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_PREFLIGHT_ACCEPTED'
  );
  assert.equal(summary.requiredPolicyPresent, true);
  assert.equal(summary.requiredContextFieldsPresent, true);
  assert.equal(summary.allPrincipalScopeMatched, true);
  assert.deepEqual(summary.mismatchedFields, []);
  assert.deepEqual(summary.missingRequiredContextFields, []);
  assert.deepEqual(summary.matches, {
    agentAlias: true,
    agentId: true,
    requestSource: true,
    projectId: true,
    workspaceId: true,
    clientId: true
  });
  assert.equal(summary.currentRuntimeAuthorizationChanged, false);
  assert.equal(summary.recordMemoryRuntimeIntegrated, false);
  assert.equal(summary.recordMemoryCalled, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.safety.changesRuntimeAuth, false);

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /workspace-alpha/);
});

test('CM1631 fails closed on matching alias with unexpected principal or scope', () => {
  const executionContext = resolver.resolve({
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'unexpected-agent',
      requestSource: 'codex-memory-mcp',
      project_id: 'codex-memory',
      workspace_id: 'workspace-beta',
      client_id: 'claude'
    }
  });
  const summary = summarizeRecordMemoryPrincipalScopeAuthorizationPreflight(acceptedInput({
    executionContext
  }));

  assert.equal(summary.acceptedForPrincipalScopeAuthorizationPreflight, false);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.matches.agentAlias, true);
  assert.equal(summary.matches.agentId, false);
  assert.equal(summary.matches.workspaceId, false);
  assert.equal(summary.matches.clientId, false);
  assert.deepEqual(summary.mismatchedFields, ['agentId', 'workspaceId', 'clientId']);
  assert.equal(summary.recordMemoryRuntimeIntegrated, false);

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /workspace-beta/);
});

test('CM1631 fails closed when required principal or scope fields are missing', () => {
  const executionContext = resolver.resolve({
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'codex-memory-mcp',
      project_id: 'codex-memory'
    }
  });
  const summary = summarizeRecordMemoryPrincipalScopeAuthorizationPreflight(acceptedInput({
    executionContext
  }));

  assert.equal(summary.acceptedForPrincipalScopeAuthorizationPreflight, false);
  assert.equal(summary.requiredContextFieldsPresent, false);
  assert.deepEqual(summary.missingRequiredContextFields, ['workspaceId', 'clientId']);
  assert.equal(summary.allPrincipalScopeMatched, false);
});

test('CM1631 skips blank canonical scope aliases and falls through to snake case aliases', () => {
  const summary = summarizeRecordMemoryPrincipalScopeAuthorizationPreflight(acceptedInput({
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'codex-memory-mcp',
      projectId: '   ',
      project_id: 'codex-memory',
      workspaceId: '   ',
      workspace_id: 'workspace-alpha',
      clientId: '   ',
      client_id: 'codex'
    }
  }));

  assert.equal(summary.acceptedForPrincipalScopeAuthorizationPreflight, true);
  assert.equal(summary.matches.projectId, true);
  assert.equal(summary.matches.workspaceId, true);
  assert.equal(summary.matches.clientId, true);
  assert.deepEqual(summary.mismatchedFields, []);

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /workspace-alpha/);
});

test('CM1631 fails closed when no-apply invariant is violated', () => {
  const summary = summarizeRecordMemoryPrincipalScopeAuthorizationPreflight(acceptedInput({
    sideEffects: {
      record_memory_calls: 1,
      provider_calls: 1,
      durable_memory_writes: 1,
      readiness_claims: 1
    }
  }));

  assert.equal(summary.acceptedForPrincipalScopeAuthorizationPreflight, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.recordMemoryCalled, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.readinessClaimed, false);
});
