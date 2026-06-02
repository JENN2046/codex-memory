const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeClientScopePrivateReadConsistency
} = require('../src/core/ClientScopePrivateReadConsistency');

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

const callerScopeSpoof = {
  projectId: 'project-alpha',
  workspaceId: 'workspace-alpha',
  clientId: 'claude',
  visibility: 'private'
};

function privateCandidate(memoryId, clientId, extra = {}) {
  return {
    memoryId,
    lifecycleStatus: 'active',
    scope: {
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      clientId,
      taskId: 'task-alpha',
      conversationId: 'conversation-alpha',
      visibility: 'private',
      retentionPolicy: 'standard'
    },
    content: `raw private content for ${memoryId} must not leak`,
    snippet: `raw private snippet for ${memoryId} must not leak`,
    sourceFile: `private/${memoryId}.jsonl`,
    ...extra
  };
}

test('CM-1400 accepts no-apply client-scope private read consistency', () => {
  const summary = summarizeClientScopePrivateReadConsistency({
    sourceMode: 'explicit_input',
    requestContext,
    callerScope: callerScopeSpoof,
    candidates: [
      privateCandidate('mem-codex-private', 'codex'),
      privateCandidate('mem-claude-private', 'claude'),
      privateCandidate('mem-ownerless-private', '')
    ],
    missingRequestIdentityProbeCandidates: [
      privateCandidate('mem-no-context-private', 'codex')
    ]
  });

  assert.equal(summary.acceptedForPrivateReadConsistency, true);
  assert.equal(summary.decision, 'NO_APPLY_CLIENT_SCOPE_PRIVATE_READ_CONSISTENCY_ACCEPTED');
  assert.equal(summary.authority.requestClientId, 'codex');
  assert.equal(summary.authority.callerScopeClientId, 'claude');
  assert.equal(summary.authority.lifecycleCurrentScopeClientId, 'codex');
  assert.equal(summary.authority.callerScopeCandidateFilterOnly, true);
  assert.equal(summary.authority.lifecycleCurrentScopeFromExecutionContext, true);
  assert.equal(summary.privateReadPolicy.sameClientPrivateAccepted, true);
  assert.equal(summary.privateReadPolicy.crossClientPrivateSuppressed, true);
  assert.equal(summary.privateReadPolicy.ownerlessPrivateSuppressed, true);
  assert.equal(summary.privateReadPolicy.missingRequestIdentityPrivateSuppressed, true);
  assert.equal(summary.rawSuppressedMetadataExposed, false);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.reliabilityClaimed, false);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.scansRealMemory, false);

  const serializedAudit = JSON.stringify(summary.sanitizedAuditMetadata);
  assert.match(serializedAudit, /mem-claude-private/);
  assert.match(serializedAudit, /cross_client_private_suppressed/);
  assert.match(serializedAudit, /owner_client_id_missing_fail_closed/);
  assert.match(serializedAudit, /request_client_id_missing_fail_closed/);
  assert.doesNotMatch(serializedAudit, /raw private content|raw private snippet|sourceFile|jsonl/);
});

test('CM-1400 fails closed when missing-request identity probe is absent', () => {
  const summary = summarizeClientScopePrivateReadConsistency({
    sourceMode: 'explicit_input',
    requestContext,
    callerScope: callerScopeSpoof,
    candidates: [
      privateCandidate('mem-codex-private', 'codex'),
      privateCandidate('mem-claude-private', 'claude'),
      privateCandidate('mem-ownerless-private', '')
    ]
  });

  assert.equal(summary.acceptedForPrivateReadConsistency, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('missing_request_identity_private_not_suppressed'),
    true
  );
});

test('CM-1400 fails closed when caller scope is treated as current lifecycle identity', () => {
  const summary = summarizeClientScopePrivateReadConsistency({
    sourceMode: 'explicit_input',
    requestContext,
    callerScope: callerScopeSpoof,
    lifecycleExecutionContext: {
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      clientId: 'claude',
      visibility: 'private'
    },
    candidates: [
      privateCandidate('mem-codex-private', 'codex'),
      privateCandidate('mem-claude-private', 'claude'),
      privateCandidate('mem-ownerless-private', '')
    ],
    missingRequestIdentityProbeCandidates: [
      privateCandidate('mem-no-context-private', 'codex')
    ]
  });

  assert.equal(summary.acceptedForPrivateReadConsistency, false);
  assert.equal(summary.authority.lifecycleCurrentScopeFromExecutionContext, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('lifecycle_current_scope_not_execution_context'),
    true
  );
});

test('CM-1400 fails closed when no-apply invariant is violated', () => {
  const summary = summarizeClientScopePrivateReadConsistency({
    sourceMode: 'explicit_input',
    requestContext,
    callerScope: callerScopeSpoof,
    candidates: [
      privateCandidate('mem-codex-private', 'codex'),
      privateCandidate('mem-claude-private', 'claude'),
      privateCandidate('mem-ownerless-private', '')
    ],
    missingRequestIdentityProbeCandidates: [
      privateCandidate('mem-no-context-private', 'codex')
    ],
    sideEffects: {
      runtimeApplied: true,
      durableMutationExecuted: true,
      publicMcpExpanded: true,
      readinessClaimed: true
    }
  });

  assert.equal(summary.acceptedForPrivateReadConsistency, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('no_apply_invariant_failed'), true);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
});
