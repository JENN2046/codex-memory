const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeClientIntegrationAcceptancePreflight
} = require('../src/core/ClientIntegrationAcceptancePreflight');
const {
  summarizeClientScopeExecutionContextAuthorityConsistency
} = require('../src/core/ClientScopeExecutionContextAuthorityConsistency');
const {
  summarizeClientScopePhaseHCloseoutAggregator
} = require('../src/core/ClientScopePhaseHCloseoutAggregator');
const {
  summarizeClientScopePrivateReadConsistency
} = require('../src/core/ClientScopePrivateReadConsistency');
const {
  summarizeClientScopeSearchLifecycleConsistency
} = require('../src/core/ClientScopeSearchLifecycleConsistency');
const {
  summarizeClientScopeVisibilityBoundaryConsistency
} = require('../src/core/ClientScopeVisibilityBoundaryConsistency');
const {
  summarizeClientScopeWriteEffectiveScopeConsistency
} = require('../src/core/ClientScopeWriteEffectiveScopeConsistency');

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

const alternateAliasExecutionContext = {
  projectId: 'project-alpha',
  workspace_id: 'workspace-alpha',
  clientId: 'codex',
  task_id: 'task-alpha',
  conversationId: 'conversation-alpha',
  visibility: 'private',
  retention_policy: 'standard'
};

const callerScopeSpoof = {
  project_id: 'project-alpha',
  workspace_id: 'workspace-alpha',
  client_id: 'claude',
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

function scopedCandidate(memoryId, scope, extra = {}) {
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
      liveClientExecuted: false,
      memoryToolsExecuted: false,
      providerCalls: 0,
      durableMutationExecuted: false,
      readinessClaimed: false
    }
  };
}

function acceptedPrivateReadSummary() {
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

function acceptedIntegrationPreflightSummary(privateReadSummary = acceptedPrivateReadSummary()) {
  return summarizeClientIntegrationAcceptancePreflight({
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
    publicTools: ['record_memory', 'search_memory', 'memory_overview', 'audit_memory'],
    scopeAcceptance: privateReadSummary,
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
    }
  });
}

function acceptedSearchLifecycleSummary() {
  return summarizeClientScopeSearchLifecycleConsistency({
    sourceMode: 'explicit_input',
    requestContext,
    searchScope: {
      project_id: 'project-alpha',
      workspace_id: 'workspace-alpha',
      client_id: 'codex',
      visibility: 'private'
    },
    spoofedSearchScope: {
      project_id: 'project-beta',
      workspace_id: 'workspace-beta',
      client_id: 'claude',
      visibility: 'private'
    },
    candidates: [
      scopedCandidate('mem-alpha-codex-private', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      }),
      scopedCandidate('mem-beta-codex-private', {
        projectId: 'project-beta',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      }),
      scopedCandidate('mem-alpha-claude-private', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'claude',
        visibility: 'private'
      })
    ],
    spoofProbeCandidates: [
      scopedCandidate('mem-beta-claude-private', {
        projectId: 'project-beta',
        workspaceId: 'workspace-beta',
        clientId: 'claude',
        visibility: 'private'
      }),
      scopedCandidate('mem-alpha-codex-private-control', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      })
    ]
  });
}

function acceptedWriteScopeSummary() {
  return summarizeClientScopeWriteEffectiveScopeConsistency({
    sourceMode: 'explicit_input',
    requestContext: {
      executionContext: {
        project_id: 'project-alpha',
        workspaceId: 'workspace-context-alpha',
        client_id: 'codex',
        conversation_id: 'conversation-alpha',
        visibility_policy: 'private',
        retentionPolicy: 'standard'
      }
    },
    payload: {
      target: 'process',
      title: 'Synthetic write scope precedence',
      content: 'Type: checkpoint\nrisk: payload text must not appear in summary',
      evidence: 'CM-1408 explicit input only',
      project_id: 'project-beta',
      workspace_id: 'workspace-payload-beta',
      client_id: 'claude',
      task_id: 'task-payload-fallback',
      conversation_id: 'conversation-payload-beta',
      visibility: 'shared',
      retention_policy: 'temporary'
    }
  });
}

function acceptedExecutionAuthoritySummary() {
  return summarizeClientScopeExecutionContextAuthorityConsistency({
    sourceMode: 'explicit_input',
    requestContext,
    aliasProbeExecutionContext: alternateAliasExecutionContext,
    payloadScope: {
      scope: {
        project_id: 'project-beta',
        workspace_id: 'workspace-payload-private',
        client_id: 'claude',
        task_id: 'task-payload-private',
        conversation_id: 'conversation-payload-private',
        visibility_policy: 'shared',
        retention_policy: 'temporary'
      }
    },
    searchScope: {
      projectId: 'project-beta',
      workspaceId: 'workspace-search-private',
      clientId: 'claude',
      taskId: 'task-search-private',
      conversationId: 'conversation-search-private',
      visibility: 'private',
      retentionPolicy: 'temporary'
    },
    clientDeclaredScope: {
      project_id: 'project-beta',
      workspace_id: 'workspace-client-private',
      client_id: 'claude',
      task_id: 'task-client-private',
      conversation_id: 'conversation-client-private',
      visibility: 'private',
      retention_policy: 'temporary'
    },
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
    publicTools: ['record_memory', 'search_memory', 'memory_overview', 'audit_memory']
  });
}

function acceptedVisibilityBoundarySummary() {
  return summarizeClientScopeVisibilityBoundaryConsistency({
    sourceMode: 'explicit_input',
    requestContext,
    callerScope: callerScopeSpoof,
    candidates: [
      scopedCandidate('mem-shared-claude', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'claude',
        visibility: 'shared'
      }),
      scopedCandidate('mem-project-ownerless', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: '',
        visibility: 'project'
      }, {
        lifecycleStatus: 'stale'
      }),
      scopedCandidate('mem-private-codex', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      }),
      scopedCandidate('mem-private-claude', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'claude',
        visibility: 'private'
      }),
      scopedCandidate('mem-private-ownerless', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: '',
        visibility: 'private'
      }),
      scopedCandidate('mem-proposal-shared', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'claude',
        visibility: 'shared'
      }, {
        lifecycleStatus: 'proposal'
      })
    ],
    missingRequestIdentityProbeCandidates: [
      scopedCandidate('mem-missing-context-private', {
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'private'
      })
    ]
  });
}

function acceptedEvidenceUnits(overrides = {}) {
  const privateReadConsistency = acceptedPrivateReadSummary();
  return {
    privateReadConsistency,
    clientIntegrationAcceptancePreflight:
      acceptedIntegrationPreflightSummary(privateReadConsistency),
    searchLifecycleConsistency: acceptedSearchLifecycleSummary(),
    writeEffectiveScopeConsistency: acceptedWriteScopeSummary(),
    executionContextAuthorityConsistency: acceptedExecutionAuthoritySummary(),
    visibilityBoundaryConsistency: acceptedVisibilityBoundarySummary(),
    ...overrides
  };
}

function acceptedCloseoutInput(overrides = {}) {
  return {
    sourceMode: 'explicit_input',
    evidenceUnits: acceptedEvidenceUnits(),
    sideEffects: {
      provider_calls: 0,
      real_memory_reads: 0,
      raw_jsonl_reads: 0,
      durable_memory_writes: 0,
      config_watchdog_startup_changes: 0,
      readiness_claims: 0,
      reliability_claims: 0
    },
    ...overrides
  };
}

test('CM-1408 accepts no-apply Phase H client-scope closeout aggregation', () => {
  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput());

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, true);
  assert.equal(summary.decision, 'NO_APPLY_PHASE_H_CLIENT_SCOPE_CLOSEOUT_ACCEPTED_NOT_READY');
  assert.equal(summary.evidenceCoverage.requiredUnitCount, 6);
  assert.equal(summary.evidenceCoverage.acceptedUnitCount, 6);
  assert.equal(summary.evidenceCoverage.allRequiredUnitsAccepted, true);
  assert.deepEqual(summary.evidenceCoverage.missingEvidenceUnits, []);
  assert.deepEqual(summary.evidenceCoverage.unsupportedEvidenceUnits, []);
  assert.deepEqual(summary.evidenceCoverage.duplicateEvidenceUnits, []);
  assert.deepEqual(summary.evidenceCoverage.units.map(unit => unit.id), [
    'CM-1400',
    'CM-1402',
    'CM-1404',
    'CM-1405',
    'CM-1406',
    'CM-1407'
  ]);
  assert.equal(summary.closeoutSummary.localNoApplyCloseoutReviewable, true);
  assert.equal(summary.closeoutSummary.publicMcpToolsFrozen, true);
  assert.equal(summary.closeoutSummary.privateReadBoundaryClosed, true);
  assert.equal(summary.closeoutSummary.clientIntegrationPreflightClosed, true);
  assert.equal(summary.closeoutSummary.searchLifecycleBoundaryClosed, true);
  assert.equal(summary.closeoutSummary.writeEffectiveScopeBoundaryClosed, true);
  assert.equal(summary.closeoutSummary.executionContextAuthorityBoundaryClosed, true);
  assert.equal(summary.closeoutSummary.visibilityBoundaryClosed, true);
  assert.equal(summary.closeoutSummary.remainingApprovalBoundaries.includes('real_scoped_write_proof'), true);
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.reviewableOutputExposesRawScope, false);
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
  assert.equal(summary.rcReadyClaimed, false);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.callsMcpTools, false);
  assert.equal(summary.safety.callsMemoryTools, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.usesBearerToken, false);
  assert.equal(summary.safety.mutatesClientConfig, false);
  assert.equal(summary.safety.mutatesDurableState, false);

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /workspace-alpha|workspace-beta|workspace-payload/);
  assert.doesNotMatch(serialized, /task-alpha|task-payload|conversation-alpha/);
  assert.doesNotMatch(serialized, /raw private content|raw content|raw snippet|sourceFile|jsonl/);
});

test('CM-1408 fails closed when required Phase H evidence is missing', () => {
  const evidenceUnits = acceptedEvidenceUnits();
  delete evidenceUnits.visibilityBoundaryConsistency;

  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput({
    evidenceUnits
  }));

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, false);
  assert.deepEqual(summary.evidenceCoverage.missingEvidenceUnits, ['CM-1407']);
  assert.equal(summary.blockers.blockingFindings.includes('missing_evidence_units:CM-1407'), true);
});

test('CM-1408 fails closed when an evidence unit is not accepted', () => {
  const privateReadConsistency = {
    ...acceptedPrivateReadSummary(),
    acceptedForPrivateReadConsistency: false
  };
  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput({
    evidenceUnits: acceptedEvidenceUnits({ privateReadConsistency })
  }));

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, false);
  assert.equal(summary.blockers.blockingFindings.includes('CM-1400:unit_not_accepted'), true);
});

test('CM-1408 fails closed when public MCP freeze evidence drifts', () => {
  const executionContextAuthorityConsistency = {
    ...acceptedExecutionAuthoritySummary(),
    publicTools: {
      expected: ['record_memory', 'search_memory', 'memory_overview', 'audit_memory'],
      observed: ['record_memory', 'search_memory', 'memory_overview', 'debug_scope'],
      frozen: false
    }
  };
  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput({
    evidenceUnits: acceptedEvidenceUnits({ executionContextAuthorityConsistency })
  }));

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, false);
  assert.equal(summary.closeoutSummary.publicMcpToolsFrozen, false);
  assert.equal(
    summary.blockers.blockingFindings.includes('CM-1406:required_signals_not_accepted'),
    true
  );
});

test('CM-1408 fails closed when duplicate evidence aliases are supplied', () => {
  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput({
    evidenceUnits: {
      ...acceptedEvidenceUnits(),
      'CM-1400': acceptedPrivateReadSummary()
    }
  }));

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, false);
  assert.deepEqual(summary.evidenceCoverage.duplicateEvidenceUnits, [
    'CM-1400:CM-1400|privateReadConsistency'
  ]);
  assert.equal(
    summary.blockers.blockingFindings.includes(
      'duplicate_evidence_units:CM-1400:CM-1400|privateReadConsistency'
    ),
    true
  );
});

test('CM-1408 fails closed when top-level no-apply counters are non-zero', () => {
  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput({
    sideEffects: {
      true_search_memory_calls: 1,
      provider_calls: 1,
      real_memory_reads: 1,
      raw_jsonl_reads: 1,
      durable_memory_writes: 1,
      config_watchdog_startup_changes: 1,
      readiness_claims: 1
    }
  }));

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('top_level_no_apply_invariant_failed'), true);
});

test('CM-1408 fails closed when top-level no-apply counters are string encoded', () => {
  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput({
    sideEffects: {
      trueSearchMemoryCalls: false,
      true_search_memory_calls: '1',
      providerCalls: false,
      provider_calls: '1',
      durable_memory_writes: '1',
      config_watchdog_startup_changes: '1',
      readiness_claims: '1'
    }
  }));

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, false);
  assert.equal(summary.noApplyInvariant, false);
  assert.equal(summary.blockers.blockingFindings.includes('top_level_no_apply_invariant_failed'), true);
});

test('CM-1408 fails closed when unsupported evidence units are supplied', () => {
  const summary = summarizeClientScopePhaseHCloseoutAggregator(acceptedCloseoutInput({
    evidenceUnits: {
      ...acceptedEvidenceUnits(),
      clientRuntimeAcceptance: {
        accepted: true
      }
    }
  }));

  assert.equal(summary.acceptedForPhaseHClientScopeCloseout, false);
  assert.deepEqual(summary.evidenceCoverage.unsupportedEvidenceUnits, ['clientRuntimeAcceptance']);
  assert.equal(
    summary.blockers.blockingFindings.includes('unsupported_evidence_units:clientRuntimeAcceptance'),
    true
  );
});
