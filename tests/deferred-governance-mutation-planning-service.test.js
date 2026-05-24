const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  FAMILY_SURFACES,
  PUBLIC_MCP_TOOLS,
  DeferredGovernanceMutationPlanningService,
  buildDryRunPlan,
  normalizePayload
} = require('../src/core/DeferredGovernanceMutationPlanningService');

function excludePayload(overrides = {}) {
  return {
    targetMemoryIds: ['memory-exclude-001'],
    scopeTuple: {
      projectId: 'project-cm-0924',
      workspaceId: 'workspace-cm-0924',
      clientId: 'codex',
      visibility: 'project'
    },
    actorClientId: 'codex',
    approvalId: 'CM-0924-exclude-approval',
    requestSource: FAMILY_SURFACES.memory_exclude.requestSource,
    contextFlag: FAMILY_SURFACES.memory_exclude.contextFlag,
    reason: 'exclude memory from normal recall after scope review',
    evidenceSummary: 'CM-0924 fixture evidence confirms scope suppression only',
    auditCorrelationId: 'CM-0924-exclude-correlation',
    ...overrides
  };
}

function forgetPayload(overrides = {}) {
  return {
    ...excludePayload({
      targetMemoryIds: ['memory-forget-001'],
      approvalId: 'CM-0924-forget-approval',
      requestSource: FAMILY_SURFACES.memory_forget.requestSource,
      contextFlag: FAMILY_SURFACES.memory_forget.contextFlag,
      reason: 'forget memory after governance lifecycle review',
      evidenceSummary: 'CM-0924 fixture evidence confirms governed forget only',
      auditCorrelationId: 'CM-0924-forget-correlation'
    }),
    ...overrides
  };
}

test('plans memory_exclude as an internal dry-run-only candidate', () => {
  const service = new DeferredGovernanceMutationPlanningService();
  const input = excludePayload();
  const before = JSON.stringify(input);
  const result = service.planMemoryExclude(input);

  assert.equal(result.success, true);
  assert.equal(result.decision, 'dry-run');
  assert.equal(result.family, 'memory_exclude');
  assert.equal(result.serviceName, 'MemoryExcludeGovernanceService');
  assert.equal(result.serviceMethod, 'planMemoryExclude');
  assert.equal(result.internalOnly, true);
  assert.equal(result.defaultDisabled, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.mutated, false);
  assert.equal(result.runtimeApplyBlocked, true);
  assert.equal(result.executionApproved, false);
  assert.equal(result.runtimeIntegrated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
  assert.deepEqual(result.targetMemoryIds, ['memory-exclude-001']);
  assert.deepEqual(result.changedMemoryIds, ['memory-exclude-001']);
  assert.deepEqual(result.surface.projectionStates, ['excluded', 'scope_suppressed']);
  assert.equal(result.suppressionProjectionPreview.durableProjectionApplied, false);
  assert.equal(result.appendOnlyAuditPreview.durableAuditWritten, false);
  assert.deepEqual(result.appendOnlyAuditPreview.phases.map(phase => phase.phase), [
    'pending',
    'committed',
    'cancelled'
  ]);
  assert.equal(result.candidateCacheInvalidation.applied, false);
  assert.equal(result.readPolicySuppression.normalRecallBlocked, true);
  assert.equal(result.safety.noSideEffects, true);
  assert.deepEqual(result.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(JSON.stringify(input), before);
});

test('plans memory_forget with governed forget projection states', () => {
  const service = new DeferredGovernanceMutationPlanningService();
  const result = service.planMemoryForget(forgetPayload());

  assert.equal(result.success, true);
  assert.equal(result.family, 'memory_forget');
  assert.equal(result.serviceName, 'MemoryForgetGovernanceService');
  assert.equal(result.serviceMethod, 'planMemoryForget');
  assert.deepEqual(result.surface.projectionStates, ['forgotten', 'governance_suppressed']);
  assert.equal(result.governanceRevision.reason, 'forgotten_governance_suppression_revision');
  assert.equal(result.readPolicySuppression.policy, 'forget_from_normal_recall_and_candidate_generation');
  assert.equal(result.runtimeApplyBlocked, true);
  assert.equal(result.mutated, false);
});

test('rejects runtime apply attempts even when confirm is true', () => {
  const service = new DeferredGovernanceMutationPlanningService();
  const result = service.planMemoryExclude(excludePayload({
    dryRun: false,
    confirm: true
  }));

  assert.equal(result.success, false);
  assert.equal(result.decision, 'rejected');
  assert.equal(result.dryRun, false);
  assert.equal(result.mutated, false);
  assert.equal(result.runtimeApplyBlocked, true);
  assert.match(result.reason, /runtime apply is blocked/);
});

test('rejects family surface drift and unsupported families', () => {
  const service = new DeferredGovernanceMutationPlanningService();
  const drift = service.planMemoryExclude(excludePayload({
    requestSource: FAMILY_SURFACES.memory_forget.requestSource,
    contextFlag: FAMILY_SURFACES.memory_forget.contextFlag
  }));
  const unsupported = buildDryRunPlan({
    family: 'memory_publish',
    payload: excludePayload()
  });

  assert.equal(drift.success, false);
  assert.match(drift.reason, /memory_exclude requires requestSource/);
  assert.equal(unsupported.success, false);
  assert.equal(unsupported.family, 'memory_publish');
  assert.match(unsupported.reason, /unsupported deferred governance family/);
});

test('rejects missing targets, empty scope, and unexpected payload keys', () => {
  const service = new DeferredGovernanceMutationPlanningService();
  const missingTargets = service.planMemoryExclude(excludePayload({ targetMemoryIds: [] }));
  const emptyScope = service.planMemoryForget(forgetPayload({ scopeTuple: {} }));
  const unexpectedKey = service.planMemoryExclude({
    ...excludePayload(),
    publicMcpTool: true
  });

  assert.equal(missingTargets.success, false);
  assert.match(missingTargets.reason, /targetMemoryIds/);
  assert.equal(emptyScope.success, false);
  assert.match(emptyScope.reason, /scopeTuple/);
  assert.equal(unexpectedKey.success, false);
  assert.match(unexpectedKey.reason, /publicMcpTool is not allowed/);
});

test('rejects secret-like content and redacts sensitive normalized output', () => {
  const service = new DeferredGovernanceMutationPlanningService();
  const result = service.planMemoryForget(forgetPayload({
    reason: 'token=CM0924SECRETTOKEN1234567890',
    evidenceSummary: 'safe evidence'
  }));
  const normalized = normalizePayload(forgetPayload({
    scopeTuple: {
      workspaceId: 'workspace-raw-cm-0924',
      clientId: 'codex',
      visibility: 'private'
    },
    actorClientId: 'authorization: Bearer CM0924AUTHTOKEN1234567890',
    evidenceSummary: 'api_key=CM0924APIKEY1234567890'
  }));
  const normalizedText = JSON.stringify(normalized).toLowerCase();

  assert.equal(result.success, false);
  assert.match(result.reason, /secret-like content/);
  for (const forbidden of [
    'workspace-raw-cm-0924',
    'cm0924authtoken1234567890',
    'cm0924apikey1234567890',
    'authorization',
    'bearer',
    'api_key'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
  }
});

test('does not perform implicit filesystem reads while planning', () => {
  const service = new DeferredGovernanceMutationPlanningService();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during deferred governance planning');
  };

  try {
    const result = service.planMemoryExclude(excludePayload());

    assert.equal(result.success, true);
    assert.equal(result.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});
