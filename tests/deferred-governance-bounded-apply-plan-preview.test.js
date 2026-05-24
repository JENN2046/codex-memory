const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  FAMILY_SURFACES,
  PUBLIC_MCP_TOOLS
} = require('../src/core/DeferredGovernanceMutationPlanningService');
const {
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_RUNTIME_SURFACE_CAPABILITIES,
  normalizeDeferredGovernanceBoundedApplyPlanPreviewInput,
  planDeferredGovernanceBoundedApplyPlanPreview
} = require('../src/core/DeferredGovernanceBoundedApplyPlanPreview');

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
    publicTools: PUBLIC_MCP_TOOLS,
    ...overrides
  };
}

function excludePayload(overrides = {}) {
  return {
    targetMemoryIds: ['memory-exclude-apply-preview-001'],
    scopeTuple: {
      projectId: 'project-cm-0929',
      workspaceId: 'workspace-cm-0929',
      clientId: 'codex',
      visibility: 'project'
    },
    actorClientId: 'codex',
    approvalId: 'CM-0929-exclude-approval',
    requestSource: FAMILY_SURFACES.memory_exclude.requestSource,
    contextFlag: FAMILY_SURFACES.memory_exclude.contextFlag,
    reason: 'exclude memory from normal recall after scoped governance review',
    evidenceSummary: 'CM-0929 fixture evidence confirms preview-only apply plan',
    auditCorrelationId: 'CM-0929-exclude-correlation',
    ...overrides
  };
}

function forgetPayload(overrides = {}) {
  return {
    ...excludePayload({
      targetMemoryIds: ['memory-forget-apply-preview-001'],
      approvalId: 'CM-0929-forget-approval',
      requestSource: FAMILY_SURFACES.memory_forget.requestSource,
      contextFlag: FAMILY_SURFACES.memory_forget.contextFlag,
      reason: 'forget memory after governed lifecycle review',
      evidenceSummary: 'CM-0929 fixture evidence confirms forget preview-only apply plan',
      auditCorrelationId: 'CM-0929-forget-correlation'
    }),
    ...overrides
  };
}

function packet(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    family: 'memory_exclude',
    dryRunPayload: excludePayload(),
    runtimeSurfaceCapabilities: runtimeSurface(),
    plannedAt: '2026-05-24T12:00:00.000Z',
    previewOnly: true,
    publicMcpExpanded: false,
    callToolWidened: false,
    runtimeApplyRequested: false,
    readinessClaimed: false,
    ...overrides
  };
}

test('CM-0929 builds a bounded memory_exclude apply-plan preview without durable apply', () => {
  const report = planDeferredGovernanceBoundedApplyPlanPreview(packet());

  assert.equal(report.acceptedForApplyPlanPreview, true);
  assert.equal(report.decision, 'BOUNDED_INTERNAL_APPLY_PLAN_PREVIEW_READY_NOT_APPROVED');
  assert.equal(report.family, 'memory_exclude');
  assert.equal(report.serviceName, 'MemoryExcludeGovernanceService');
  assert.equal(report.previewOnly, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeApplyBlocked, true);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.mutated, false);
  assert.equal(report.durableAuditWritten, false);
  assert.equal(report.durableProjectionApplied, false);
  assert.equal(report.candidateCacheCleared, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.dryRunPlan.accepted, true);
  assert.deepEqual(report.dryRunPlan.changedMemoryIds, ['memory-exclude-apply-preview-001']);
  assert.deepEqual(report.applyPlanPreview.steps, [
    'verify_approved_internal_context',
    'append_pending_audit_preview',
    'apply_shadow_suppression_projection_blocked',
    'emit_governance_revision_preview',
    'invalidate_target_candidate_cache_preview',
    'activate_read_policy_suppression_preview',
    'append_committed_or_cancelled_audit_preview'
  ]);
  assert.equal(report.applyPlanPreview.auditPreview.durableAuditWritten, false);
  assert.equal(report.applyPlanPreview.projectionPreview.durableProjectionApplied, false);
  assert.equal(report.applyPlanPreview.candidateCacheInvalidationPreview.applied, false);
  assert.equal(report.applyPlanPreview.readPolicySuppressionPreview.applied, false);
  assert.equal(report.publicMcpTools.frozen, true);
  assert.deepEqual(report.publicMcpTools.required, PUBLIC_MCP_TOOLS);
  assert.equal(report.safety.noSideEffects, true);
});

test('CM-0929 builds a bounded memory_forget apply-plan preview with forget suppression states', () => {
  const report = planDeferredGovernanceBoundedApplyPlanPreview(packet({
    family: 'memory_forget',
    dryRunPayload: forgetPayload(),
    plannedAt: '2026-05-24T12:05:00.000Z'
  }));

  assert.equal(report.acceptedForApplyPlanPreview, true);
  assert.equal(report.family, 'memory_forget');
  assert.equal(report.serviceName, 'MemoryForgetGovernanceService');
  assert.deepEqual(report.applyPlanPreview.projectionPreview.projectedStates, [
    'forgotten',
    'governance_suppressed'
  ]);
  assert.equal(
    report.applyPlanPreview.readPolicySuppressionPreview.policy,
    'forget_from_normal_recall_and_candidate_generation'
  );
});

test('CM-0929 rejects incomplete runtime surface evidence and public MCP drift', () => {
  const report = planDeferredGovernanceBoundedApplyPlanPreview(packet({
    runtimeSurfaceCapabilities: runtimeSurface({
      candidateCacheInvalidationPreviewAvailable: false,
      publicTools: [...PUBLIC_MCP_TOOLS, 'memory_exclude']
    })
  }));

  assert.equal(report.acceptedForApplyPlanPreview, false);
  assert.equal(report.applyPlanPreview, null);
  assert.equal(report.publicMcpTools.frozen, false);
  assert.equal(report.blockers.blockingFindings.includes('candidateCacheInvalidationPreviewAvailable_missing'), true);
  assert.equal(report.blockers.blockingFindings.includes('public_mcp_freeze_evidence_missing'), true);
});

test('CM-0929 rejects runtime apply, family drift, and readiness claims', () => {
  const report = planDeferredGovernanceBoundedApplyPlanPreview(packet({
    family: 'memory_exclude',
    dryRunPayload: excludePayload({
      requestSource: FAMILY_SURFACES.memory_forget.requestSource,
      contextFlag: FAMILY_SURFACES.memory_forget.contextFlag,
      dryRun: false,
      confirm: true
    }),
    runtimeApplyRequested: true,
    readinessClaimed: true
  }));

  assert.equal(report.acceptedForApplyPlanPreview, false);
  assert.equal(report.dryRunPlan.accepted, false);
  assert.equal(report.runtimeApplyBlocked, true);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.blockers.blockingFindings.includes('runtime_apply_blocked'), true);
  assert.equal(report.blockers.blockingFindings.includes('readiness_claim_blocked'), true);
  assert.equal(report.blockers.blockingFindings.includes('dry_run_plan_not_accepted'), true);
});

test('CM-0929 rejects secret-like content and redacts normalized preview input', () => {
  const rejected = planDeferredGovernanceBoundedApplyPlanPreview(packet({
    dryRunPayload: excludePayload({
      reason: 'api_key=CM0929SECRETKEY1234567890'
    })
  }));
  const normalized = normalizeDeferredGovernanceBoundedApplyPlanPreviewInput(packet({
    dryRunPayload: excludePayload({
      actorClientId: 'authorization: Bearer CM0929TOKEN1234567890'
    }),
    plannedAt: 'C:\\secret\\.env'
  }));
  const normalizedText = JSON.stringify(normalized).toLowerCase();

  assert.equal(rejected.acceptedForApplyPlanPreview, false);
  assert.equal(rejected.blockers.blockingFindings.includes('dry_run_plan_not_accepted'), true);
  for (const forbidden of [
    'authorization',
    'bearer',
    'cm0929token1234567890',
    'c:\\',
    '.env'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
  }
});

test('CM-0929 does not perform implicit filesystem reads while building preview', () => {
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during bounded apply-plan preview');
  };

  try {
    const report = planDeferredGovernanceBoundedApplyPlanPreview(packet());

    assert.equal(REQUIRED_RUNTIME_SURFACE_CAPABILITIES.length, 7);
    assert.equal(report.acceptedForApplyPlanPreview, true);
    assert.equal(report.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});
