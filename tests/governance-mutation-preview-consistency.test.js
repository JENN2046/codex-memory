const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  summarizeGovernanceMutationPreviewConsistency
} = require('../src/core/GovernanceMutationPreviewConsistency');
const {
  planDurableGovernanceTombstoneRuntimePrep
} = require('../src/core/DurableGovernanceTombstoneRuntimePrepHelper');
const {
  planMemorySupersedeRuntimePrep
} = require('../src/core/MemorySupersedeRuntimePrepHelper');

const fixturesDir = path.join(__dirname, 'fixtures');

function loadJsonFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

function loadProjectionRecordsFixture() {
  return loadJsonFixture('durable-governance-shadow-projection-records-v1.json').records;
}

function buildTombstoneDryRunInput() {
  return {
    contract: loadJsonFixture('durable-governance-mutation-packet-v1.json'),
    phaseId: 'CM-1393-governance-mutation-preview-consistency',
    mutationFamily: 'memory_tombstone',
    targetMemoryIds: ['memory-tombstone-001'],
    scopeTuple: {
      projectId: 'project-cm-0863',
      workspaceId: 'workspace-cm-0863',
      clientId: 'codex-desktop',
      taskId: 'CM-0863',
      conversationId: 'thread-cm-0863',
      visibility: 'private'
    },
    actorClientId: 'codex-desktop',
    requestSource: 'cm-1393-fixture',
    reason: 'memory retired after preview consistency review',
    evidenceSummary: 'fixture-backed tombstone preview consistency',
    lifecycleTransition: {
      from: 'stale',
      to: 'tombstoned'
    },
    auditIntentPolicy: 'append_only_intent_before_apply',
    auditCommitPolicy: 'append_only_commit_after_apply',
    projectionPolicy: 'shadow_metadata_projection_only',
    revisionEmitter: 'governance_state_revision',
    changedMemoryIdsPolicy: 'target_memory_ids',
    rollbackPath: 'discard preview and recompute before apply',
    validationMode: 'internal_dry_run_only',
    executionApprovalStatement: 'runtime durable governance apply remains blocked pending explicit approval',
    mutationFieldValues: {
      targetMemoryId: 'memory-tombstone-001',
      tombstoneReason: 'retention-expired',
      scopeTuple: 'workspace-cm-0863',
      reason: 'memory retired after preview consistency review',
      evidenceSummary: 'fixture-backed tombstone preview consistency',
      auditIntentPolicy: 'append_only_intent_before_apply',
      projectionPolicy: 'shadow_metadata_projection_only',
      revisionEmitter: 'governance_state_revision',
      restorationPath: 'future admin-only recovery'
    }
  };
}

function buildTombstoneCapabilities() {
  return {
    updateLifecycleStatusAvailable: true,
    statusColumnAvailable: true,
    statusReasonWritable: true,
    tombstoneReasonWritable: true,
    lifecycleUpdatedAtWritable: true,
    lifecycleActorClientIdWritable: true,
    policyGuardColumnsAvailable: true,
    auditIntentAppendAvailable: true,
    auditCommitAppendAvailable: true,
    auditCancelAppendAvailable: true
  };
}

function buildSupersedeCapabilities() {
  return {
    pairShadowSeamAvailable: true,
    statusColumnAvailable: true,
    statusReasonWritable: true,
    supersedesLinkWritable: true,
    supersededByLinkWritable: true,
    lifecycleUpdatedAtWritable: true,
    lifecycleActorClientIdWritable: true,
    sharedPolicyGuardAvailable: true,
    pairAtomicityAvailable: true,
    pairRollbackPreviewAvailable: true,
    auditIntentAppendAvailable: true,
    auditCommitAppendAvailable: true,
    auditCancelAppendAvailable: true
  };
}

function buildTombstonePlan() {
  return planDurableGovernanceTombstoneRuntimePrep({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities: buildTombstoneCapabilities(),
    plannedAt: '2026-06-02T10:00:00.000Z'
  });
}

function buildSupersedePlan() {
  return planMemorySupersedeRuntimePrep({
    pairOutcomeContract: loadJsonFixture('memory-supersede-pair-outcome-v1.json'),
    shadowSeamContract: loadJsonFixture('memory-supersede-shadow-seam-v1.json'),
    dryRunInput: {
      contract: loadJsonFixture('durable-governance-mutation-packet-v1.json'),
      ...loadJsonFixture('memory-supersede-runtime-prep-request-v1.json')
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities: buildSupersedeCapabilities(),
    plannedAt: '2026-06-02T10:05:00.000Z'
  });
}

test('CM-1393 summarizes tombstone runtime-prep as accepted no-apply preview consistency', () => {
  const summary = summarizeGovernanceMutationPreviewConsistency(buildTombstonePlan());

  assert.equal(summary.acceptedForPreviewConsistency, true);
  assert.equal(summary.mutationFamily, 'memory_tombstone');
  assert.equal(summary.runtimeCandidateFamily, 'memory_tombstone');
  assert.equal(summary.noApplyInvariant, true);
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.durableProjectionApplied, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.realMemoryScanned, false);
  assert.deepEqual(summary.targeting.changedMemoryIds, ['memory-tombstone-001']);
  assert.equal(summary.targeting.singleTarget, true);
  assert.equal(summary.lifecycleTransition.shape, 'single');
  assert.deepEqual(summary.lifecycleTransition.records[0], {
    role: 'target',
    memoryId: 'memory-tombstone-001',
    fromStatus: 'stale',
    toStatus: 'tombstoned'
  });
  assert.equal(summary.auditPlan.phasesComplete, true);
  assert.equal(summary.projectionPlan.shadowUpdatePlanPresent, true);
  assert.equal(summary.invalidationPlan.projectedRevisionTokenPresent, true);
  assert.equal(summary.approval.exactApprovalRequiredForApply, true);
  assert.deepEqual(summary.blockers.missingRequiredPreviewShape, []);
});

test('CM-1393 summarizes supersede runtime-prep as accepted no-apply preview consistency', () => {
  const summary = summarizeGovernanceMutationPreviewConsistency(buildSupersedePlan());

  assert.equal(summary.acceptedForPreviewConsistency, true);
  assert.equal(summary.mutationFamily, 'memory_supersede');
  assert.equal(summary.runtimeCandidateFamily, 'memory_supersede');
  assert.equal(summary.noApplyInvariant, true);
  assert.deepEqual(summary.targeting.changedMemoryIds, ['memory-old-001', 'memory-new-001']);
  assert.equal(summary.targeting.pairTarget, true);
  assert.equal(summary.lifecycleTransition.shape, 'pair');
  assert.deepEqual(summary.lifecycleTransition.records, [
    {
      role: 'old',
      memoryId: 'memory-old-001',
      fromStatus: 'active',
      toStatus: 'superseded'
    },
    {
      role: 'new',
      memoryId: 'memory-new-001',
      fromStatus: 'proposal',
      toStatus: 'active'
    }
  ]);
  assert.equal(summary.auditPlan.eventFamily, 'memory_supersede');
  assert.equal(summary.auditPlan.phasesComplete, true);
  assert.equal(summary.projectionPlan.shadowUpdatePlanPresent, true);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.scansRealMemory, false);
});

test('CM-1393 fails closed when required preview shape is missing or side effects are present', () => {
  const missingShape = summarizeGovernanceMutationPreviewConsistency({
    sourceMode: 'explicit_input',
    mutationFamily: 'memory_tombstone',
    executionApproved: false,
    runtimeIntegrated: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    publicMcpExpanded: false,
    realMemoryScanned: false,
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false
    }
  });
  const sideEffect = summarizeGovernanceMutationPreviewConsistency({
    ...buildTombstonePlan(),
    mutated: true
  });

  assert.equal(missingShape.acceptedForPreviewConsistency, false);
  assert.equal(missingShape.blockers.missingRequiredPreviewShape.includes('changed_memory_ids_missing'), true);
  assert.equal(missingShape.blockers.missingRequiredPreviewShape.includes('audit_phases_incomplete'), true);
  assert.equal(sideEffect.acceptedForPreviewConsistency, false);
  assert.equal(sideEffect.noApplyInvariant, false);
  assert.equal(sideEffect.mutated, false);
});
