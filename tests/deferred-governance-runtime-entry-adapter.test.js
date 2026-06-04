const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  FAMILY_SURFACES
} = require('../src/core/DeferredGovernanceMutationPlanningService');
const {
  APPLY_PLAN_PREVIEW_ENTRY_NAMES,
  DeferredGovernanceRuntimeEntryAdapter,
  buildSharedInternalGate,
  normalizeEntryPayload
} = require('../src/core/DeferredGovernanceRuntimeEntryAdapter');

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name).sort();
}

function excludeArgs(overrides = {}) {
  return {
    memory_id: 'memory-exclude-entry-001',
    scope_tuple: {
      project_id: 'project-cm-0925',
      workspace_id: 'workspace-cm-0925',
      client_id: 'codex',
      visibility: 'project'
    },
    approval_id: 'CM-0925-exclude-approval',
    reason: 'exclude memory through runtime-entry candidate',
    evidence_summary: 'CM-0925 fixture evidence for exclude runtime-entry candidate',
    audit_correlation_id: 'CM-0925-exclude-correlation',
    ...overrides
  };
}

function forgetArgs(overrides = {}) {
  return {
    target_memory_ids: ['memory-forget-entry-001'],
    scopeTuple: {
      projectId: 'project-cm-0925',
      workspaceId: 'workspace-cm-0925',
      clientId: 'codex',
      visibility: 'project'
    },
    approvalId: 'CM-0925-forget-approval',
    reason: 'forget memory through runtime-entry candidate',
    evidenceSummary: 'CM-0925 fixture evidence for forget runtime-entry candidate',
    auditCorrelationId: 'CM-0925-forget-correlation',
    ...overrides
  };
}

function approvedContext(family, overrides = {}) {
  const surface = FAMILY_SURFACES[family];
  return {
    executionContext: {
      requestSource: surface.requestSource,
      [surface.contextFlag]: true,
      clientId: 'codex',
      ...overrides
    }
  };
}

function runtimeSurface(overrides = {}) {
  return {
    suppressionProjectionPreviewAvailable: true,
    appendOnlyAuditPreviewAvailable: true,
    governanceRevisionPreviewAvailable: true,
    changedMemoryIdsPreviewAvailable: true,
    candidateCacheInvalidationPreviewAvailable: true,
    readPolicySuppressionPreviewAvailable: true,
    rollbackCleanupPreviewAvailable: true,
    publicToolsFrozen: true,
    publicTools: ['record_memory', 'search_memory', 'memory_overview', 'audit_memory'],
    ...overrides
  };
}

test('CM-0925 adapter rejects memory_exclude when default-disabled without invoking service', () => {
  let serviceCalls = 0;
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    planningService: {
      planMemoryExclude() {
        serviceCalls += 1;
        throw new Error('planning service should not be called when disabled');
      }
    }
  });

  const result = adapter.executeInternalMemoryExclude(excludeArgs(), approvedContext('memory_exclude'));

  assert.equal(result.success, false);
  assert.equal(result.decision, 'rejected');
  assert.equal(result.entryName, 'executeInternalMemoryExclude');
  assert.match(result.reason, /disabled/);
  assert.equal(result.mutated, false);
  assert.equal(result.runtimeEntryMounted, false);
  assert.equal(result.runtimeApplyBlocked, true);
  assert.equal(serviceCalls, 0);
});

test('CM-0925 adapter rejects missing approved execution context without invoking service', () => {
  let serviceCalls = 0;
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryForgetEnabled: true,
    planningService: {
      planMemoryForget() {
        serviceCalls += 1;
        throw new Error('planning service should not be called without approved context');
      }
    }
  });

  const result = adapter.executeInternalMemoryForget(forgetArgs(), {
    executionContext: {
      requestSource: 'wrong-source',
      internalMemoryForgetRuntimeEntry: true,
      clientId: 'codex'
    }
  });

  assert.equal(result.success, false);
  assert.equal(result.decision, 'rejected');
  assert.equal(result.entryName, 'executeInternalMemoryForget');
  assert.match(result.reason, /approved internal execution context/);
  assert.equal(result.mutated, false);
  assert.equal(result.runtimeIntegrated, false);
  assert.equal(serviceCalls, 0);
});

test('CM-0925 adapter routes approved memory_exclude to dry-run planning service only', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryExcludeEnabled: true
  });

  const result = adapter.executeInternalMemoryExclude(excludeArgs(), approvedContext('memory_exclude'));

  assert.equal(result.success, true);
  assert.equal(result.decision, 'dry-run');
  assert.equal(result.family, 'memory_exclude');
  assert.equal(result.entryName, 'executeInternalMemoryExclude');
  assert.equal(result.serviceName, 'MemoryExcludeGovernanceService');
  assert.equal(result.runtimeEntryCandidate, true);
  assert.equal(result.runtimeEntryMounted, false);
  assert.equal(result.runtimeApplyBlocked, true);
  assert.equal(result.mutated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
  assert.deepEqual(result.targetMemoryIds, ['memory-exclude-entry-001']);
  assert.deepEqual(result.surface.projectionStates, ['excluded', 'scope_suppressed']);
  assert.equal(result.appendOnlyAuditPreview.durableAuditWritten, false);
  assert.equal(result.suppressionProjectionPreview.durableProjectionApplied, false);
});

test('CM-0925 adapter routes approved memory_forget with camelCase aliases', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryForgetEnabled: true
  });

  const result = adapter.executeInternalMemoryForget(forgetArgs(), approvedContext('memory_forget'));

  assert.equal(result.success, true);
  assert.equal(result.decision, 'dry-run');
  assert.equal(result.family, 'memory_forget');
  assert.equal(result.entryName, 'executeInternalMemoryForget');
  assert.equal(result.serviceName, 'MemoryForgetGovernanceService');
  assert.deepEqual(result.targetMemoryIds, ['memory-forget-entry-001']);
  assert.deepEqual(result.surface.projectionStates, ['forgotten', 'governance_suppressed']);
  assert.equal(result.readPolicySuppression.policy, 'forget_from_normal_recall_and_candidate_generation');
  assert.equal(result.mutated, false);
});

test('CM-0926 adapter reuses shared internal gate for scalar fields and actor fallback', () => {
  const gate = buildSharedInternalGate({
    family: 'memory_exclude',
    enabled: true,
    args: excludeArgs({
      dry_run: false,
      actorClientId: '  manual-actor  '
    }),
    requestContext: approvedContext('memory_exclude')
  });

  assert.equal(gate.ok, true);
  assert.equal(gate.payload.request_source, FAMILY_SURFACES.memory_exclude.requestSource);
  assert.equal(gate.payload.approval_id, 'CM-0925-exclude-approval');
  assert.equal(gate.payload.evidence_summary, 'CM-0925 fixture evidence for exclude runtime-entry candidate');
  assert.equal(gate.payload.audit_correlation_id, 'CM-0925-exclude-correlation');
  assert.equal(gate.payload.actor_client_id, 'manual-actor');
  assert.equal(gate.payload.dry_run, false);

  let capturedPayload = null;
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryExcludeEnabled: true,
    planningService: {
      planMemoryExclude(payload) {
        capturedPayload = payload;
        return {
          success: true,
          decision: 'dry-run',
          family: 'memory_exclude',
          mutated: false
        };
      }
    }
  });

  const result = adapter.executeInternalMemoryExclude(
    excludeArgs(),
    approvedContext('memory_exclude', {
      clientId: 'context-actor-cm-0926'
    })
  );

  assert.equal(result.success, true);
  assert.equal(result.runtimeEntryCandidate, true);
  assert.equal(capturedPayload.actorClientId, 'context-actor-cm-0926');
  assert.equal(capturedPayload.approvalId, 'CM-0925-exclude-approval');
  assert.equal(capturedPayload.contextFlag, FAMILY_SURFACES.memory_exclude.contextFlag);
  assert.equal(capturedPayload.requestSource, FAMILY_SURFACES.memory_exclude.requestSource);
  assert.equal(capturedPayload.dryRun, true);
});

test('CM-0925 adapter still rejects runtime apply through planning service', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryExcludeEnabled: true
  });

  const result = adapter.executeInternalMemoryExclude(
    excludeArgs({
      dryRun: false,
      confirm: true
    }),
    approvedContext('memory_exclude')
  );

  assert.equal(result.success, false);
  assert.equal(result.decision, 'rejected');
  assert.equal(result.entryName, 'executeInternalMemoryExclude');
  assert.equal(result.dryRun, false);
  assert.equal(result.mutated, false);
  assert.equal(result.runtimeApplyBlocked, true);
  assert.match(result.reason, /runtime apply is blocked/);
});

test('CM-0925 adapter normalizes aliases and redacts sensitive scope output', () => {
  const payload = normalizeEntryPayload({
    memory_ids: ['memory-1', 'memory-1', 'memory-2'],
    workspace_id: 'workspace-cm-0925-raw',
    client_id: 'codex',
    visibility: '   ',
    visibility_policy: 'private',
    approval_id: 'approval-cm-0925',
    reason: 'bounded reason',
    evidence: 'bounded evidence',
    correlation_id: 'correlation-cm-0925'
  }, {
    executionContext: {
      requestSource: FAMILY_SURFACES.memory_exclude.requestSource,
      internalMemoryExcludeRuntimeEntry: true,
      clientId: 'codex'
    }
  }, 'memory_exclude');
  const text = JSON.stringify(payload).toLowerCase();

  assert.deepEqual(payload.targetMemoryIds, ['memory-1', 'memory-2']);
  assert.equal(payload.requestSource, FAMILY_SURFACES.memory_exclude.requestSource);
  assert.equal(payload.contextFlag, FAMILY_SURFACES.memory_exclude.contextFlag);
  assert.equal(payload.actorClientId, 'codex');
  assert.equal(payload.evidenceSummary, 'bounded evidence');
  assert.equal(payload.scopeTuple.visibility, 'private');
  assert.equal(text.includes('workspace-cm-0925-raw'), false);
});

test('CM-0925 adapter falls through empty target id arrays to later target aliases', () => {
  const payload = normalizeEntryPayload({
    targetMemoryIds: [],
    target_memory_ids: ['   '],
    memory_ids: ['memory-from-snake-array', 'memory-from-snake-array'],
    memoryIds: ['memory-from-camel-array'],
    memory_id: 'memory-from-scalar',
    approval_id: 'approval-cm-0925',
    reason: 'bounded reason',
    evidence_summary: 'bounded evidence',
    audit_correlation_id: 'correlation-cm-0925'
  }, approvedContext('memory_exclude'), 'memory_exclude');

  assert.deepEqual(payload.targetMemoryIds, ['memory-from-snake-array']);
});

test('CM-0925 adapter keeps public MCP frozen and does not perform filesystem reads', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryExcludeEnabled: true
  });
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during deferred governance runtime-entry adapter');
  };

  try {
    const result = adapter.executeInternalMemoryExclude(excludeArgs(), approvedContext('memory_exclude'));

    assert.equal(result.success, true);
    assert.equal(result.safety.readsFiles, false);
    assert.deepEqual(publicToolNames(), ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('CM-0930 adapter keeps apply-plan preview default-disabled', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter();
  const result = adapter.previewInternalMemoryExcludeApplyPlan(
    {
      ...excludeArgs(),
      runtimeSurfaceCapabilities: runtimeSurface()
    },
    approvedContext('memory_exclude')
  );

  assert.equal(APPLY_PLAN_PREVIEW_ENTRY_NAMES.memory_exclude, 'previewInternalMemoryExcludeApplyPlan');
  assert.equal(result.success, false);
  assert.equal(result.decision, 'rejected');
  assert.equal(result.entryName, 'previewInternalMemoryExcludeApplyPlan');
  assert.match(result.reason, /disabled/);
  assert.equal(result.applyPlanPreviewCandidate, true);
  assert.equal(result.mutated, false);
  assert.equal(result.runtimeApplyBlocked, true);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM-0930 adapter routes approved memory_exclude apply-plan preview without durable apply', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryExcludeApplyPlanPreviewEnabled: true
  });
  const result = adapter.previewInternalMemoryExcludeApplyPlan(
    {
      ...excludeArgs(),
      runtimeSurfaceCapabilities: runtimeSurface(),
      plannedAt: '2026-05-24T12:30:00.000Z'
    },
    approvedContext('memory_exclude')
  );

  assert.equal(result.success, true);
  assert.equal(result.acceptedForApplyPlanPreview, true);
  assert.equal(result.decision, 'BOUNDED_INTERNAL_APPLY_PLAN_PREVIEW_READY_NOT_APPROVED');
  assert.equal(result.entryName, 'previewInternalMemoryExcludeApplyPlan');
  assert.equal(result.family, 'memory_exclude');
  assert.equal(result.applyPlanPreviewCandidate, true);
  assert.equal(result.runtimeEntryMounted, false);
  assert.equal(result.executionApproved, false);
  assert.equal(result.runtimeApplyBlocked, true);
  assert.equal(result.mutated, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableProjectionApplied, false);
  assert.equal(result.candidateCacheCleared, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
  assert.deepEqual(result.applyPlanPreview.changedMemoryIds, ['memory-exclude-entry-001']);
  assert.equal(result.applyPlanPreview.auditPreview.durableAuditWritten, false);
  assert.equal(result.applyPlanPreview.projectionPreview.durableProjectionApplied, false);
});

test('CM-0930 adapter routes approved memory_forget apply-plan preview with explicit request context surface', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryForgetApplyPlanPreviewEnabled: true
  });
  const result = adapter.previewInternalMemoryForgetApplyPlan(
    forgetArgs(),
    {
      ...approvedContext('memory_forget'),
      runtimeSurfaceCapabilities: runtimeSurface()
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.family, 'memory_forget');
  assert.equal(result.entryName, 'previewInternalMemoryForgetApplyPlan');
  assert.deepEqual(result.applyPlanPreview.projectionPreview.projectedStates, [
    'forgotten',
    'governance_suppressed'
  ]);
  assert.equal(result.applyPlanPreview.readPolicySuppressionPreview.applied, false);
});

test('CM-0930 adapter apply-plan preview rejects runtime apply and surface drift', () => {
  const adapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryExcludeApplyPlanPreviewEnabled: true
  });
  const result = adapter.previewInternalMemoryExcludeApplyPlan(
    {
      ...excludeArgs({
        dryRun: false,
        confirm: true
      }),
      runtimeApplyRequested: true,
      runtimeSurfaceCapabilities: runtimeSurface({
        publicTools: ['record_memory', 'search_memory', 'memory_overview', 'memory_exclude'],
        candidateCacheInvalidationPreviewAvailable: false
      })
    },
    approvedContext('memory_exclude')
  );

  assert.equal(result.success, false);
  assert.equal(result.acceptedForApplyPlanPreview, false);
  assert.equal(result.entryName, 'previewInternalMemoryExcludeApplyPlan');
  assert.equal(result.runtimeApplyBlocked, true);
  assert.equal(result.publicMcpTools.frozen, false);
  assert.equal(result.blockers.blockingFindings.includes('runtime_apply_blocked'), true);
  assert.equal(result.blockers.blockingFindings.includes('dry_run_plan_not_accepted'), true);
  assert.equal(result.blockers.blockingFindings.includes('candidateCacheInvalidationPreviewAvailable_missing'), true);
  assert.equal(result.blockers.blockingFindings.includes('public_mcp_freeze_evidence_missing'), true);
});
