const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SUPPORTED_RUNTIME_PREP_FAMILIES,
  normalizeDurableGovernanceTombstoneRuntimePrepInput,
  planDurableGovernanceTombstoneRuntimePrep
} = require('../src/core/DurableGovernanceTombstoneRuntimePrepHelper');

const contractFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');
const projectionRecordsFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-shadow-projection-records-v1.json');

function loadContractFixture() {
  return JSON.parse(fs.readFileSync(contractFixturePath, 'utf8'));
}

function loadProjectionRecordsFixture() {
  return JSON.parse(fs.readFileSync(projectionRecordsFixturePath, 'utf8')).records;
}

function buildTombstoneDryRunInput() {
  return {
    contract: loadContractFixture(),
    phaseId: 'CM-0866-durable-governance-tombstone-runtime-prep',
    mutationFamily: 'memory_tombstone',
    targetMemoryIds: ['memory-tombstone-001'],
    scopeTuple: {
      projectId: 'project-cm-0863',
      workspaceId: 'workspace-cm-0863',
      clientId: 'codex-desktop',
      taskId: 'CM-0863',
      conversationId: 'thread-cm-0863',
      visibility: 'private',
      retentionPolicy: 'retain'
    },
    actorClientId: 'codex-desktop',
    requestSource: 'cm-0866-fixture',
    reason: 'memory retired after tombstone governance review',
    evidenceSummary: 'fixture-backed tombstone runtime-prep',
    lifecycleTransition: {
      from: 'stale',
      to: 'tombstoned'
    },
    auditIntentPolicy: 'append_only_intent_before_apply',
    auditCommitPolicy: 'append_only_commit_after_apply',
    projectionPolicy: 'shadow_metadata_projection_only',
    revisionEmitter: 'governance_state_revision',
    changedMemoryIdsPolicy: 'target_memory_ids',
    rollbackPath: 'append compensating governance mutation before any future runtime apply',
    validationMode: 'internal_dry_run_only',
    executionApprovalStatement: 'runtime durable governance apply remains blocked pending explicit approval',
    mutationFieldValues: {
      targetMemoryId: 'memory-tombstone-001',
      tombstoneReason: 'retention-expired',
      scopeTuple: 'workspace-cm-0866',
      reason: 'memory retired after tombstone governance review',
      evidenceSummary: 'fixture-backed tombstone runtime-prep',
      auditIntentPolicy: 'append_only_intent_before_apply',
      projectionPolicy: 'shadow_metadata_projection_only',
      revisionEmitter: 'governance_state_revision',
      restorationPath: 'future admin-only recovery'
    }
  };
}

function buildRuntimeSurfaceCapabilities(overrides = {}) {
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
    auditCancelAppendAvailable: true,
    ...overrides
  };
}

test('CM-0866 helper fails closed when tombstone_reason runtime surface is missing', () => {
  const plan = planDurableGovernanceTombstoneRuntimePrep({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities: buildRuntimeSurfaceCapabilities({
      tombstoneReasonWritable: false
    }),
    plannedAt: '2026-05-23T09:00:00.000Z'
  });

  assert.deepEqual(SUPPORTED_RUNTIME_PREP_FAMILIES, ['memory_tombstone']);
  assert.equal(plan.mutationFamily, 'memory_tombstone');
  assert.equal(plan.validateMemoryPatternCompatible, true);
  assert.equal(plan.acceptedForRuntimePrep, false);
  assert.equal(plan.blockers.blockingFindings.includes('tombstone_reason_projection_surface_missing'), true);
  assert.equal(plan.shadowUpdatePlan.apiCandidate, 'updateLifecycleStatus');
  assert.equal(plan.shadowUpdatePlan.options.memoryId, 'memory-tombstone-001');
  assert.equal(plan.shadowUpdatePlan.options.toStatus, 'tombstoned');
  assert.equal(plan.shadowUpdatePlan.sqliteAfterColumns.tombstone_reason, 'retention-expired');
  assert.equal(plan.auditPlan.intentEvent.event_type, 'memory_tombstone');
  assert.equal(plan.auditPlan.intentEvent.audit_phase, 'pending');
  assert.equal(plan.auditPlan.cancelledEvent.audit_phase, 'cancelled');
  assert.equal(plan.invalidationPlan.changedMemoryIds[0], 'memory-tombstone-001');
  assert.ok(plan.invalidationPlan.projectedRevisionToken.startsWith('projection-preview:'));
});

test('CM-0866 helper produces tombstone-first internal apply plan when runtime surface is complete', () => {
  const plan = planDurableGovernanceTombstoneRuntimePrep({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities: buildRuntimeSurfaceCapabilities(),
    plannedAt: '2026-05-23T09:05:00.000Z'
  });

  assert.equal(plan.acceptedForRuntimePrep, true);
  assert.equal(plan.decision, 'BOUNDED_INTERNAL_RUNTIME_PREP_READY_NOT_APPROVED');
  assert.equal(plan.executionApproved, false);
  assert.equal(plan.runtimeIntegrated, false);
  assert.equal(plan.mutated, false);
  assert.equal(plan.runtimeContract.singleRecordMutation, true);
  assert.equal(plan.runtimeContract.requiresPendingAuditIntent, true);
  assert.equal(plan.runtimeContract.requiresCommittedAudit, true);
  assert.equal(plan.runtimeContract.requiresCancelledAudit, true);
  assert.deepEqual(plan.runtimeSurface.missingCapabilities, []);
  assert.equal(plan.auditPlan.intentEvent.tombstone_reason, 'retention-expired');
  assert.equal(plan.auditPlan.committedEvent.audit_phase, 'committed');
  assert.equal(plan.auditPlan.committedEvent.mutation_applied, true);
  assert.equal(plan.shadowUpdatePlan.options.expectedClientId, 'codex-desktop');
  assert.equal(plan.shadowUpdatePlan.options.expectedVisibility, 'private');
  assert.deepEqual(plan.shadowUpdatePlan.fieldChangesSqliteColumns, [
    'status',
    'status_reason',
    'tombstone_reason',
    'lifecycle_updated_at',
    'lifecycle_actor_client_id'
  ]);
  assert.equal(plan.safety.noSideEffects, true);
});

test('CM-0866 helper normalizes blank projection record fields from snake-case fallbacks', () => {
  const records = loadProjectionRecordsFixture().map(record => (
    record.memoryId === 'memory-tombstone-001'
      ? {
          ...record,
          memoryId: '   ',
          memory_id: 'memory-tombstone-001',
          status: '',
          lifecycle_status: 'stale',
          clientId: '   ',
          client_id: 'codex-desktop',
          visibility: '',
          visibility_policy: 'private',
          lifecycleUpdatedAt: '   ',
          lifecycle_updated_at: '2026-05-22T12:00:00.000Z'
        }
      : record
  ));

  const plan = planDurableGovernanceTombstoneRuntimePrep({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: records,
    runtimeSurfaceCapabilities: buildRuntimeSurfaceCapabilities(),
    plannedAt: '2026-05-23T09:06:00.000Z'
  });

  assert.equal(plan.acceptedForRuntimePrep, true);
  assert.equal(plan.shadowUpdatePlan.targetMemoryId, 'memory-tombstone-001');
  assert.equal(plan.shadowUpdatePlan.fromStatus, 'stale');
  assert.equal(plan.shadowUpdatePlan.options.expectedClientId, 'codex-desktop');
  assert.equal(plan.shadowUpdatePlan.options.expectedVisibility, 'private');
  assert.deepEqual(plan.auditPlan.intentEvent.previous_snapshot_ref, {
    memory_id: 'memory-tombstone-001',
    status: 'stale',
    updated_at: '2026-05-22T12:00:00.000Z'
  });
});

test('CM-0866 helper rejects unsupported runtime-prep families', () => {
  const plan = planDurableGovernanceTombstoneRuntimePrep({
    dryRunInput: {
      ...buildTombstoneDryRunInput(),
      mutationFamily: 'memory_supersede',
      targetMemoryIds: ['memory-old-001', 'memory-new-001'],
      mutationFieldValues: {
        oldMemoryId: 'memory-old-001',
        newMemoryId: 'memory-new-001',
        supersedesLink: 'memory-old-001',
        supersededByLink: 'memory-new-001'
      }
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities: buildRuntimeSurfaceCapabilities({
      tombstoneReasonWritable: true
    }),
    plannedAt: '2026-05-23T09:10:00.000Z'
  });

  assert.equal(plan.acceptedForRuntimePrep, false);
  assert.equal(plan.blockers.blockingFindings.includes('unsupported_runtime_candidate_family'), true);
});

test('CM-0866 helper redacts sensitive fields in normalized runtime-prep input', () => {
  const normalized = normalizeDurableGovernanceTombstoneRuntimePrepInput({
    dryRunInput: {
      ...buildTombstoneDryRunInput(),
      actorClientId: 'authorization: Bearer RUNTIME_PREP_TOKEN_1234567890',
      requestSource: 'cookie: session=secret',
      scopeTuple: {
        projectId: 'project-secret-001',
        workspaceId: 'workspace-secret-001',
        clientId: 'client-secret-001',
        taskId: 'task-secret-001',
        conversationId: 'conversation-secret-001',
        visibility: 'private',
        retentionPolicy: 'retain'
      }
    },
    currentProjectionRecords: loadProjectionRecordsFixture().map(record => ({
      ...record,
      clientId: 'authorization: Bearer CHILD_TOKEN_123',
      lifecycle_actor_client_id: 'cookie: actor=secret'
    })),
    runtimeSurfaceCapabilities: buildRuntimeSurfaceCapabilities(),
    plannedAt: 'C:\\secret\\.env'
  });
  const normalizedText = JSON.stringify(normalized).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'runtime_prep_token_1234567890',
    'project-secret-001',
    'workspace-secret-001',
    'client-secret-001',
    'task-secret-001',
    'conversation-secret-001',
    'c:\\',
    '.env'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
  }
});
