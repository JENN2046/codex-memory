const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SUPPORTED_PROJECTION_FAMILIES,
  normalizeDurableGovernanceShadowProjectionPreviewInput,
  previewDurableGovernanceShadowProjection
} = require('../src/core/DurableGovernanceShadowProjectionPreview');

const contractFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');
const projectionRecordsFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-shadow-projection-records-v1.json');

function loadContractFixture() {
  return JSON.parse(fs.readFileSync(contractFixturePath, 'utf8'));
}

function loadProjectionRecordsFixture() {
  return JSON.parse(fs.readFileSync(projectionRecordsFixturePath, 'utf8')).records;
}

function buildSupersedeDryRunInput() {
  return {
    contract: loadContractFixture(),
    phaseId: 'CM-0863-durable-governance-shadow-projection-proof',
    mutationFamily: 'memory_supersede',
    targetMemoryIds: ['memory-old-001', 'memory-new-001'],
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
    requestSource: 'cm-0863-fixture',
    reason: 'replacement memory approved after governance review',
    evidenceSummary: 'fixture-backed supersede projection preview',
    lifecycleTransition: {
      from: 'active',
      to: 'superseded'
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
      oldMemoryId: 'memory-old-001',
      newMemoryId: 'memory-new-001',
      supersedesLink: 'memory-old-001',
      supersededByLink: 'memory-new-001',
      scopeTuple: 'workspace-cm-0863',
      reason: 'replacement memory approved after governance review',
      evidenceSummary: 'fixture-backed supersede projection preview',
      auditIntentPolicy: 'append_only_intent_before_apply',
      projectionPolicy: 'shadow_metadata_projection_only',
      revisionEmitter: 'governance_state_revision'
    }
  };
}

function buildTombstoneDryRunInput() {
  return {
    contract: loadContractFixture(),
    phaseId: 'CM-0863-durable-governance-shadow-projection-proof',
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
    requestSource: 'cm-0863-fixture',
    reason: 'memory retired after governance review',
    evidenceSummary: 'fixture-backed tombstone projection preview',
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
      scopeTuple: 'workspace-cm-0863',
      reason: 'memory retired after governance review',
      evidenceSummary: 'fixture-backed tombstone projection preview',
      auditIntentPolicy: 'append_only_intent_before_apply',
      projectionPolicy: 'shadow_metadata_projection_only',
      revisionEmitter: 'governance_state_revision',
      restorationPath: 'future admin-only recovery'
    }
  };
}

test('CM-0863 helper previews supersede shadow projection from fixture-backed records', () => {
  const input = {
    dryRunInput: buildSupersedeDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture(),
    previewedAt: '2026-05-23T08:00:00.000Z'
  };
  const before = JSON.stringify(input);
  const summary = previewDurableGovernanceShadowProjection(input);

  assert.deepEqual(SUPPORTED_PROJECTION_FAMILIES, ['memory_supersede', 'memory_tombstone']);
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.acceptedForProjectionPreview, true);
  assert.equal(summary.mutationFamily, 'memory_supersede');
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.durableProjectionApplied, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.dryRunPreview.acceptedForDryRunPreview, true);
  assert.deepEqual(summary.blockers.blockingFindings, []);
  assert.equal(summary.projectionResult.affectedCount, 2);
  assert.deepEqual(summary.projectionResult.projectedChangedMemoryIds, ['memory-old-001', 'memory-new-001']);
  assert.ok(summary.projectionResult.projectedRevisionToken.startsWith('projection-preview:'));
  assert.deepEqual(summary.projectionContract.scopeKeysVerified, [
    'projectId',
    'workspaceId',
    'clientId',
    'taskId',
    'conversationId',
    'visibility',
    'retentionPolicy'
  ]);

  const oldRecord = summary.projectionResult.affectedRecords.find(record => record.memoryId === 'memory-old-001');
  const newRecord = summary.projectionResult.affectedRecords.find(record => record.memoryId === 'memory-new-001');

  assert.equal(oldRecord.after.status, 'superseded');
  assert.equal(oldRecord.after.supersededBy, 'memory-new-001');
  assert.equal(oldRecord.afterSqliteColumns.status, 'superseded');
  assert.equal(oldRecord.afterSqliteColumns.superseded_by_memory_id, 'memory-new-001');
  assert.equal(oldRecord.scopeVerified, true);
  assert.deepEqual(oldRecord.fieldChanges, [
    'status',
    'statusReason',
    'supersededBy',
    'lifecycleUpdatedAt',
    'lifecycleActorClientId'
  ]);
  assert.deepEqual(oldRecord.fieldChangesSqliteColumns, [
    'status',
    'status_reason',
    'superseded_by_memory_id',
    'lifecycle_updated_at',
    'lifecycle_actor_client_id'
  ]);
  assert.equal(newRecord.after.status, 'active');
  assert.equal(newRecord.after.supersedes, 'memory-old-001');
  assert.equal(newRecord.afterSqliteColumns.supersedes_memory_id, 'memory-old-001');
  assert.equal(newRecord.scopeVerified, true);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(JSON.stringify(input), before);
});

test('CM-0863 helper previews tombstone shadow projection from fixture-backed records', () => {
  const summary = previewDurableGovernanceShadowProjection({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture(),
    previewedAt: '2026-05-23T08:05:00.000Z'
  });

  assert.equal(summary.acceptedForProjectionPreview, true);
  assert.equal(summary.mutationFamily, 'memory_tombstone');
  assert.equal(summary.projectionResult.affectedCount, 1);
  assert.deepEqual(summary.projectionResult.projectedChangedMemoryIds, ['memory-tombstone-001']);
  const targetRecord = summary.projectionResult.affectedRecords[0];
  assert.equal(targetRecord.memoryId, 'memory-tombstone-001');
  assert.equal(targetRecord.after.status, 'tombstoned');
  assert.equal(targetRecord.after.tombstoneReason, 'retention-expired');
  assert.equal(targetRecord.afterSqliteColumns.tombstone_reason, 'retention-expired');
  assert.equal(targetRecord.scopeVerified, true);
});

test('CM-0863 helper fails closed for unsupported projection families and rejected dry-run previews', () => {
  const unsupportedFamily = previewDurableGovernanceShadowProjection({
    dryRunInput: {
      ...buildTombstoneDryRunInput(),
      mutationFamily: 'memory_exclude',
      targetMemoryIds: ['memory-tombstone-001'],
      mutationFieldValues: {
        targetMemoryId: 'memory-tombstone-001',
        logicalExclusionReason: 'out-of-scope',
        scopeTuple: 'workspace-cm-0863',
        reason: 'memory excluded after governance review',
        evidenceSummary: 'fixture-backed exclude preview',
        auditIntentPolicy: 'append_only_intent_before_apply',
        projectionPolicy: 'shadow_metadata_projection_only',
        revisionEmitter: 'governance_state_revision'
      }
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    previewedAt: '2026-05-23T08:10:00.000Z'
  });

  assert.equal(unsupportedFamily.acceptedForProjectionPreview, false);
  assert.equal(unsupportedFamily.blockers.blockingFindings.includes('unsupported_projection_family'), true);

  const malformed = previewDurableGovernanceShadowProjection({
    dryRunInput: null,
    currentProjectionRecords: [],
    previewedAt: '2026-05-23T08:10:00.000Z'
  });

  assert.equal(malformed.acceptedForProjectionPreview, false);
  assert.equal(malformed.blockers.blockingFindings.includes('dry_run_preview_not_accepted'), true);
  assert.equal(malformed.blockers.blockingFindings.includes('current_projection_records_missing'), true);
});

test('CM-0863 helper rejects scope mismatch and invalid lifecycle states', () => {
  const scopeMismatch = previewDurableGovernanceShadowProjection({
    dryRunInput: buildSupersedeDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture().map(record =>
      record.memoryId === 'memory-old-001'
        ? { ...record, workspaceId: 'workspace-other' }
        : record
    ),
    previewedAt: '2026-05-23T08:15:00.000Z'
  });

  assert.equal(scopeMismatch.acceptedForProjectionPreview, false);
  assert.equal(scopeMismatch.blockers.blockingFindings.includes('old_record_scope_mismatch'), true);

  const invalidStatus = previewDurableGovernanceShadowProjection({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture().map(record =>
      record.memoryId === 'memory-tombstone-001'
        ? { ...record, status: 'tombstoned' }
        : record
    ),
    previewedAt: '2026-05-23T08:16:00.000Z'
  });

  assert.equal(invalidStatus.acceptedForProjectionPreview, false);
  assert.equal(invalidStatus.blockers.blockingFindings.includes('target_record_status_not_tombstonable'), true);
});

test('CM-0863 helper does not perform implicit fixture reads', () => {
  const input = {
    dryRunInput: buildSupersedeDryRunInput(),
    currentProjectionRecords: loadProjectionRecordsFixture(),
    previewedAt: '2026-05-23T08:20:00.000Z'
  };
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during durable governance projection preview evaluation');
  };

  try {
    const summary = previewDurableGovernanceShadowProjection(input);

    assert.equal(summary.acceptedForProjectionPreview, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('CM-0863 helper redacts sensitive scope and actor output', () => {
  const normalized = normalizeDurableGovernanceShadowProjectionPreviewInput({
    dryRunInput: {
      ...buildSupersedeDryRunInput(),
      actorClientId: 'authorization: Bearer PROJECTION_TOKEN_1234567890',
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
    currentProjectionRecords: loadProjectionRecordsFixture(),
    previewedAt: 'C:\\secret\\.env'
  });
  const summary = previewDurableGovernanceShadowProjection(normalized);
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'projection_token_1234567890',
    'project-secret-001',
    'workspace-secret-001',
    'client-secret-001',
    'task-secret-001',
    'conversation-secret-001',
    'c:\\',
    '.env'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }

  assert.equal(summary.projectionContract.scopePreview.projectId, '<redacted>');
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
});

test('CM-0865 helper accepts SQLite-style projection record fields and exposes aligned aliases', () => {
  const sqliteStyleRecords = loadProjectionRecordsFixture().map(record => ({
    memoryId: record.memoryId,
    status: record.status,
    status_reason: record.statusReason,
    projectId: record.projectId,
    workspaceId: record.workspaceId,
    clientId: record.clientId,
    taskId: record.taskId,
    conversationId: record.conversationId,
    visibility: record.visibility,
    retentionPolicy: record.retentionPolicy,
    superseded_by_memory_id: record.supersededBy,
    supersedes_memory_id: record.supersedes,
    tombstone_reason: record.tombstoneReason,
    lifecycle_updated_at: '2026-05-23T07:59:00.000Z',
    lifecycle_actor_client_id: 'codex-desktop'
  }));
  const summary = previewDurableGovernanceShadowProjection({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: sqliteStyleRecords,
    previewedAt: '2026-05-23T08:25:00.000Z'
  });

  assert.equal(summary.acceptedForProjectionPreview, true);
  const targetRecord = summary.projectionResult.affectedRecords[0];
  assert.equal(targetRecord.before.lifecycleUpdatedAt, '2026-05-23T07:59:00.000Z');
  assert.equal(targetRecord.beforeSqliteColumns.lifecycle_updated_at, '2026-05-23T07:59:00.000Z');
  assert.equal(targetRecord.afterSqliteColumns.status_reason, 'memory retired after governance review');
  assert.equal(targetRecord.afterSqliteColumns.tombstone_reason, 'retention-expired');
});

test('CM-0865 helper falls through blank camel-case projection fields to SQLite-style fields', () => {
  const sqliteStyleRecords = loadProjectionRecordsFixture().map(record => ({
    memoryId: record.memoryId,
    status: record.status,
    statusReason: '   ',
    status_reason: record.statusReason,
    projectId: '   ',
    project_id: record.projectId,
    workspaceId: '   ',
    workspace_id: record.workspaceId,
    clientId: '   ',
    client_id: record.clientId,
    taskId: '   ',
    task_id: record.taskId,
    conversationId: '   ',
    conversation_id: record.conversationId,
    visibility: record.visibility,
    retentionPolicy: '   ',
    retention_policy: record.retentionPolicy,
    supersededBy: '   ',
    superseded_by_memory_id: record.supersededBy,
    supersedes: '   ',
    supersedes_memory_id: record.supersedes,
    tombstoneReason: '   ',
    tombstone_reason: record.tombstoneReason,
    lifecycleUpdatedAt: '   ',
    lifecycle_updated_at: '2026-05-23T07:59:00.000Z',
    lifecycleActorClientId: '   ',
    lifecycle_actor_client_id: 'codex-desktop'
  }));
  const summary = previewDurableGovernanceShadowProjection({
    dryRunInput: buildTombstoneDryRunInput(),
    currentProjectionRecords: sqliteStyleRecords,
    previewedAt: '2026-05-23T08:30:00.000Z'
  });

  assert.equal(summary.acceptedForProjectionPreview, true);
  const targetRecord = summary.projectionResult.affectedRecords[0];
  assert.equal(targetRecord.before.statusReason, 'aged-out');
  assert.equal(targetRecord.before.lifecycleUpdatedAt, '2026-05-23T07:59:00.000Z');
  assert.equal(targetRecord.beforeSqliteColumns.lifecycle_actor_client_id, 'codex-desktop');
  assert.equal(targetRecord.scopeVerified, true);
  assert.deepEqual(summary.blockers.blockingFindings, []);
});
