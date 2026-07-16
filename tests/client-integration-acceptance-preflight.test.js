const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeClientIntegrationAcceptancePreflight
} = require('../src/core/ClientIntegrationAcceptancePreflight');
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

function privateCandidate(memoryId, clientId) {
  return {
    memoryId,
    scope: {
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      clientId,
      taskId: 'task-alpha',
      conversationId: 'conversation-alpha',
      visibility: 'private',
      retentionPolicy: 'standard'
    },
    content: `raw private content for ${memoryId} must not leak`
  };
}

function acceptedScopeSummary() {
  return summarizeClientScopePrivateReadConsistency({
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
}

function clientFixture(clientId) {
  return {
    clientId,
    transport: 'http',
    mcpUrl: 'http://127.0.0.1:7605/mcp/codex-memory',
    runbook: {
      codexConfigTemplateDocumented: clientId === 'codex',
      claudeCommandTemplateDocumented: clientId === 'claude',
      healthProbeDocumented: true,
      rollbackDocumented: true,
      noConfigMutationWarningDocumented: true,
      noTokenPolicyDocumented: true,
      noMemoryToolPolicyDocumented: true
    },
    sideEffects: {
      configChanged: false,
      watchdogStartupChanged: false,
      tokenUsed: false,
      liveClientExecuted: false,
      memoryToolsExecuted: false,
      providerCalls: 0,
      durableMutationExecuted: false,
      readinessClaimed: false
    }
  };
}

function acceptedInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    runbook: {
      codexHttpTemplateDocumented: true,
      claudeHttpTemplateDocumented: true,
      noApplyBoundaryDocumented: true,
      noTokenBoundaryDocumented: true,
      noMemoryToolsBoundaryDocumented: true,
      rollbackPathDocumented: true,
      failureCriteriaDocumented: true,
      readinessNonClaimDocumented: true
    },
    publicTools: ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory'],
    scopeAcceptance: acceptedScopeSummary(),
    clients: [
      clientFixture('codex'),
      clientFixture('claude')
    ],
    sideEffects: {
      runtimeApplied: false,
      configChanged: false,
      watchdogStartupChanged: false,
      memoryToolsExecuted: false,
      providerCalls: 0,
      durableMutationExecuted: false,
      readinessClaimed: false
    },
    ...overrides
  };
}

test('CM-1402 accepts no-apply Codex/Claude client integration acceptance preflight', () => {
  const summary = summarizeClientIntegrationAcceptancePreflight(acceptedInput());

  assert.equal(summary.acceptedForClientIntegrationPreflight, true);
  assert.equal(summary.decision, 'NO_APPLY_CLIENT_INTEGRATION_ACCEPTANCE_PREFLIGHT_ACCEPTED');
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.publicTools.frozen, true);
  assert.deepEqual(summary.publicTools.expected, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(summary.clientScopeAcceptance.acceptedForPrivateReadConsistency, true);
  assert.equal(summary.runbook.runbookComplete, true);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.runtimeApplied, false);
  assert.equal(summary.realConfigChanged, false);
  assert.equal(summary.watchdogStartupChanged, false);
  assert.equal(summary.memoryToolsExecuted, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.rcReadyClaimed, false);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.usesBearerToken, false);
  assert.equal(summary.safety.callsMcpTools, false);
  assert.equal(summary.safety.callsMemoryTools, false);
  assert.equal(summary.safety.mutatesClientConfig, false);
  assert.equal(summary.safety.mutatesDurableState, false);
});

test('CM-1402 fails closed on real config mutation or bearer token use', () => {
  const codex = clientFixture('codex');
  codex.sideEffects.configChanged = true;
  codex.sideEffects.tokenUsed = true;
  const summary = summarizeClientIntegrationAcceptancePreflight(acceptedInput({
    clients: [codex, clientFixture('claude')]
  }));

  assert.equal(summary.acceptedForClientIntegrationPreflight, false);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.blockers.blockingFindings.includes('client_preflight_not_accepted'), true);
  assert.equal(
    summary.blockers.blockingFindings.includes('codex:real_config_mutation_detected'),
    true
  );
  assert.equal(summary.blockers.blockingFindings.includes('codex:token_use_detected'), true);
});

test('CM-1402 fails closed on public MCP tool drift', () => {
  const summary = summarizeClientIntegrationAcceptancePreflight(acceptedInput({
    publicTools: ['record_memory', 'search_memory', 'memory_overview', 'delete_memory']
  }));

  assert.equal(summary.acceptedForClientIntegrationPreflight, false);
  assert.equal(summary.publicTools.frozen, false);
  assert.equal(summary.blockers.blockingFindings.includes('public_tools_not_frozen'), true);
});

test('CM-1402 fails closed on live client execution, memory tool execution, or readiness claim', () => {
  const claude = clientFixture('claude');
  claude.sideEffects.liveClientExecuted = true;
  claude.sideEffects.memoryToolsExecuted = true;
  claude.sideEffects.toolsCallExecuted = true;
  claude.sideEffects.providerCalls = true;
  claude.sideEffects.readinessClaimed = true;
  const summary = summarizeClientIntegrationAcceptancePreflight(acceptedInput({
    clients: [clientFixture('codex'), claude],
    sideEffects: {
      toolsCallExecuted: true,
      providerCalls: true,
      readinessClaimed: true
    }
  }));

  assert.equal(summary.acceptedForClientIntegrationPreflight, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('claude:live_client_acceptance_executed'),
    true
  );
  assert.equal(summary.blockers.blockingFindings.includes('claude:memory_tools_executed'), true);
  assert.equal(summary.blockers.blockingFindings.includes('claude:provider_calls_detected'), true);
  assert.equal(summary.blockers.blockingFindings.includes('claude:readiness_claimed'), true);
  assert.equal(
    summary.blockers.blockingFindings.includes('top_level_no_apply_invariant_failed'),
    true
  );
});

test('CM-1409 keeps CM-1402 fail-closed for string encoded side effects', () => {
  const claude = clientFixture('claude');
  claude.sideEffects.providerCalls = false;
  claude.sideEffects.provider_calls = '1';
  claude.sideEffects.memoryToolsExecuted = false;
  claude.sideEffects.memory_tools_executed = '1';
  const summary = summarizeClientIntegrationAcceptancePreflight(acceptedInput({
    clients: [clientFixture('codex'), claude],
    sideEffects: {
      providerCalls: false,
      provider_calls: '1',
      toolsCallExecuted: false,
      tools_call_executed: '1',
      readiness_claimed: '1'
    }
  }));

  assert.equal(summary.acceptedForClientIntegrationPreflight, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('client_preflight_not_accepted'), true);
  assert.equal(summary.blockers.blockingFindings.includes('claude:memory_tools_executed'), true);
  assert.equal(summary.blockers.blockingFindings.includes('claude:provider_calls_detected'), true);
  assert.equal(
    summary.blockers.blockingFindings.includes('top_level_no_apply_invariant_failed'),
    true
  );
});

test('CM-1402 fails closed when token material is present in explicit input', () => {
  const summary = summarizeClientIntegrationAcceptancePreflight(acceptedInput({
    diagnosticText: 'Authorization: Bearer abcdef123456'
  }));

  assert.equal(summary.acceptedForClientIntegrationPreflight, false);
  assert.equal(summary.tokenMaterialDetected, true);
  assert.equal(
    summary.blockers.blockingFindings.includes('sensitive_token_material_detected'),
    true
  );
});
