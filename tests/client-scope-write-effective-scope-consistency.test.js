const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeClientScopeWriteEffectiveScopeConsistency
} = require('../src/core/ClientScopeWriteEffectiveScopeConsistency');

const requestContext = {
  executionContext: {
    project_id: 'project-alpha',
    workspaceId: 'workspace-context-alpha',
    client_id: 'codex',
    conversation_id: 'conversation-alpha',
    visibility_policy: 'private',
    retentionPolicy: 'standard'
  }
};

const spoofingPayload = {
  target: 'process',
  title: 'Checkpoint: synthetic write scope precedence',
  content: 'Type: checkpoint\nrisk: raw payload content must not appear in summary',
  evidence: 'CM-1405 explicit input only',
  project_id: 'project-beta',
  workspace_id: 'workspace-payload-beta',
  client_id: 'claude',
  task_id: 'task-payload-fallback',
  conversation_id: 'conversation-payload-beta',
  visibility: 'shared',
  retention_policy: 'temporary'
};

function acceptedInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    requestContext,
    payload: spoofingPayload,
    ...overrides
  };
}

test('CM-1405 accepts no-apply write effective scope precedence consistency', () => {
  const summary = summarizeClientScopeWriteEffectiveScopeConsistency(acceptedInput());

  assert.equal(summary.acceptedForWriteEffectiveScopeConsistency, true);
  assert.equal(summary.decision, 'NO_APPLY_CLIENT_SCOPE_WRITE_EFFECTIVE_SCOPE_CONSISTENCY_ACCEPTED');
  assert.equal(summary.authority.executionContextWinsOverPayload, true);
  assert.equal(summary.authority.payloadFallbackOnlyForMissingContext, true);
  assert.equal(summary.authority.aliasNormalizationCovered, true);
  assert.deepEqual(summary.authority.payloadSpoofBlockedFields, [
    'projectId',
    'workspaceId',
    'clientId'
  ]);
  assert.equal(summary.authority.contextWonOverPayloadFields.includes('projectId'), true);
  assert.equal(summary.authority.contextWonOverPayloadFields.includes('workspaceId'), true);
  assert.equal(summary.authority.contextWonOverPayloadFields.includes('clientId'), true);
  assert.equal(summary.authority.contextWonOverPayloadFields.includes('visibility'), true);
  assert.deepEqual(summary.authority.payloadFallbackFields, ['taskId']);
  assert.equal(summary.effectiveScope.projectId, 'project-alpha');
  assert.equal(summary.effectiveScope.projectIdSource, 'execution_context_snake');
  assert.equal(summary.effectiveScope.workspaceIdPresent, true);
  assert.equal(summary.effectiveScope.workspaceIdSource, 'execution_context_camel');
  assert.equal(summary.effectiveScope.clientId, 'codex');
  assert.equal(summary.effectiveScope.clientIdSource, 'execution_context_snake');
  assert.equal(summary.effectiveScope.taskIdPresent, true);
  assert.equal(summary.effectiveScope.taskIdSource, 'payload_snake');
  assert.equal(summary.effectiveScope.conversationIdPresent, true);
  assert.equal(summary.effectiveScope.conversationIdSource, 'execution_context_snake');
  assert.equal(summary.effectiveScope.visibility, 'private');
  assert.equal(summary.effectiveScope.visibilitySource, 'execution_context_snake');
  assert.equal(summary.effectiveScope.retentionPolicy, 'standard');
  assert.equal(summary.effectiveScope.retentionPolicySource, 'execution_context_camel');
  assert.equal(summary.rawWorkspaceIdExposed, false);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.recordMemoryCalled, false);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.reliabilityClaimed, false);
  assert.equal(summary.safety.callsMemoryTools, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.scansRealMemory, false);

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /workspace-context-alpha|workspace-payload-beta/);
  assert.doesNotMatch(serialized, /raw payload content|Checkpoint: synthetic write scope precedence/);
});

test('CM-1405 fails closed when payload spoof proof is absent', () => {
  const summary = summarizeClientScopeWriteEffectiveScopeConsistency(acceptedInput({
    payload: {
      ...spoofingPayload,
      project_id: 'project-alpha',
      workspace_id: 'workspace-context-alpha',
      client_id: 'codex'
    }
  }));

  assert.equal(summary.acceptedForWriteEffectiveScopeConsistency, false);
  assert.equal(summary.authority.executionContextWinsOverPayload, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('execution_context_did_not_win_over_payload_scope'),
    true
  );
});

test('CM-1405 fails closed when payload fallback proof is absent', () => {
  const summary = summarizeClientScopeWriteEffectiveScopeConsistency(acceptedInput({
    requestContext: {
      executionContext: {
        project_id: 'project-alpha',
        workspaceId: 'workspace-context-alpha',
        client_id: 'codex',
        taskId: 'task-context-alpha',
        conversationId: 'conversation-alpha',
        visibility_policy: 'private',
        retentionPolicy: 'standard'
      }
    },
    payload: {
      ...spoofingPayload
    }
  }));

  assert.equal(summary.acceptedForWriteEffectiveScopeConsistency, false);
  assert.equal(summary.authority.payloadFallbackOnlyForMissingContext, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('payload_fallback_not_limited_to_missing_context_fields'),
    true
  );
});

test('CM-1405 fails closed when no-apply invariant is violated', () => {
  const summary = summarizeClientScopeWriteEffectiveScopeConsistency(acceptedInput({
    sideEffects: {
      record_memory_calls: 1,
      providerCalls: 1,
      durableMemoryWrites: 1,
      readinessClaimed: true
    }
  }));

  assert.equal(summary.acceptedForWriteEffectiveScopeConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
  assert.equal(summary.recordMemoryCalled, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.readinessClaimed, false);
});

test('CM-1409 keeps CM-1405 fail-closed for string encoded side effects', () => {
  const summary = summarizeClientScopeWriteEffectiveScopeConsistency(acceptedInput({
    sideEffects: {
      record_memory_calls: '1',
      provider_calls: '1',
      durable_memory_writes: '1',
      readiness_claims: '1'
    }
  }));

  assert.equal(summary.acceptedForWriteEffectiveScopeConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
});
