const crypto = require('node:crypto');

const {
  normalizeDurableGovernanceMutationDryRunInput,
  summarizeDurableGovernanceMutationDryRun
} = require('./DurableGovernanceMutationDryRunHelper');
const {
  previewDurableGovernanceShadowProjection
} = require('./DurableGovernanceShadowProjectionPreview');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const SUPPORTED_RUNTIME_PREP_FAMILIES = Object.freeze(['memory_tombstone']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeProjectionRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};
  return {
    ...safeRecord,
    memoryId: firstNormalizedString(safeRecord.memoryId, safeRecord.memory_id),
    status: normalizeStatus(firstNormalizedString(
      safeRecord.status,
      safeRecord.lifecycleStatus,
      safeRecord.lifecycle_status
    )),
    clientId: firstNormalizedString(safeRecord.clientId, safeRecord.client_id),
    visibility: firstNormalizedString(safeRecord.visibility, safeRecord.visibility_policy),
    lifecycleUpdatedAt: firstNormalizedString(safeRecord.lifecycleUpdatedAt, safeRecord.lifecycle_updated_at)
  };
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeRuntimeSurfaceCapabilities(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    updateLifecycleStatusAvailable: normalizeBoolean(safeInput.updateLifecycleStatusAvailable),
    statusColumnAvailable: normalizeBoolean(safeInput.statusColumnAvailable),
    statusReasonWritable: normalizeBoolean(safeInput.statusReasonWritable),
    tombstoneReasonWritable: normalizeBoolean(safeInput.tombstoneReasonWritable),
    lifecycleUpdatedAtWritable: normalizeBoolean(safeInput.lifecycleUpdatedAtWritable),
    lifecycleActorClientIdWritable: normalizeBoolean(safeInput.lifecycleActorClientIdWritable),
    policyGuardColumnsAvailable: normalizeBoolean(safeInput.policyGuardColumnsAvailable),
    auditIntentAppendAvailable: normalizeBoolean(safeInput.auditIntentAppendAvailable),
    auditCommitAppendAvailable: normalizeBoolean(safeInput.auditCommitAppendAvailable),
    auditCancelAppendAvailable: normalizeBoolean(safeInput.auditCancelAppendAvailable)
  };
}

function normalizeRuntimePrepInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    dryRunInput: normalizeDurableGovernanceMutationDryRunInput(safeInput.dryRunInput),
    currentProjectionRecords: cloneArray(safeInput.currentProjectionRecords).map(normalizeProjectionRecord),
    runtimeSurfaceCapabilities: normalizeRuntimeSurfaceCapabilities(safeInput.runtimeSurfaceCapabilities),
    plannedAt: normalizeString(safeInput.plannedAt) || '<planned>'
  };
}

function buildRecordMap(records) {
  return new Map(records
    .filter(record => record.memoryId)
    .map(record => [record.memoryId, record]));
}

function buildStableId(prefix, payload) {
  const digest = crypto.createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
  return `${prefix}:${digest}`;
}

function buildPreviousSnapshotRef(record, fromStatus) {
  return {
    memory_id: record.memoryId,
    status: fromStatus,
    updated_at: record.lifecycleUpdatedAt || null
  };
}

function buildAuditEvents({ normalizedInput, targetRecord, tombstoneReason }) {
  const fromStatus = targetRecord.status;
  const toStatus = normalizeStatus(normalizedInput.dryRunInput.lifecycleTransition.to);
  const payload = {
    mutationFamily: normalizedInput.dryRunInput.mutationFamily,
    targetMemoryIds: normalizedInput.dryRunInput.targetMemoryIds,
    plannedAt: normalizedInput.plannedAt,
    actorClientId: normalizedInput.dryRunInput.actorClientId
  };
  const eventId = buildStableId('memory-tombstone-event', payload);
  const baseEvent = {
    event_id: eventId,
    memory_id: targetRecord.memoryId,
    event_type: 'memory_tombstone',
    tool_name: 'memory_tombstone',
    actor_client_id: normalizedInput.dryRunInput.actorClientId,
    request_source: normalizedInput.dryRunInput.requestSource,
    from_status: fromStatus,
    to_status: toStatus,
    reason: normalizedInput.dryRunInput.reason,
    evidence: normalizedInput.dryRunInput.evidenceSummary,
    tombstone_reason: tombstoneReason,
    created_at: normalizedInput.plannedAt,
    reversible: true,
    previous_snapshot_ref: buildPreviousSnapshotRef(targetRecord, fromStatus),
    redaction_applied: true,
    lifecycle_policy_applied: true,
    scope_policy_applied: true
  };

  return {
    intent: {
      ...baseEvent,
      audit_phase: 'pending',
      mutation_applied: false
    },
    committed: {
      event_id: eventId,
      correlation_id: eventId,
      event_type: baseEvent.event_type,
      tool_name: baseEvent.tool_name,
      memory_id: baseEvent.memory_id,
      actor_client_id: baseEvent.actor_client_id,
      request_source: baseEvent.request_source,
      from_status: baseEvent.from_status,
      to_status: baseEvent.to_status,
      tombstone_reason: tombstoneReason,
      audit_phase: 'committed',
      mutation_applied: true,
      committed_at: normalizedInput.plannedAt,
      redaction_applied: true,
      lifecycle_policy_applied: true,
      scope_policy_applied: true
    },
    cancelled: {
      event_id: eventId,
      correlation_id: eventId,
      event_type: baseEvent.event_type,
      tool_name: baseEvent.tool_name,
      memory_id: baseEvent.memory_id,
      actor_client_id: baseEvent.actor_client_id,
      request_source: baseEvent.request_source,
      from_status: baseEvent.from_status,
      to_status: baseEvent.to_status,
      tombstone_reason: tombstoneReason,
      audit_phase: 'cancelled',
      mutation_applied: false,
      cancel_reason: 'lifecycle status or policy guard changed before memory_tombstone could apply.',
      cancelled_at: normalizedInput.plannedAt,
      redaction_applied: true,
      lifecycle_policy_applied: true,
      scope_policy_applied: true
    }
  };
}

function buildMissingCapabilityIds(capabilities) {
  const missing = [];
  if (!capabilities.updateLifecycleStatusAvailable) missing.push('update_lifecycle_status_surface_missing');
  if (!capabilities.statusColumnAvailable) missing.push('status_column_surface_missing');
  if (!capabilities.statusReasonWritable) missing.push('status_reason_projection_surface_missing');
  if (!capabilities.tombstoneReasonWritable) missing.push('tombstone_reason_projection_surface_missing');
  if (!capabilities.lifecycleUpdatedAtWritable) missing.push('lifecycle_updated_at_projection_surface_missing');
  if (!capabilities.lifecycleActorClientIdWritable) missing.push('lifecycle_actor_client_id_projection_surface_missing');
  if (!capabilities.policyGuardColumnsAvailable) missing.push('policy_guard_surface_missing');
  if (!capabilities.auditIntentAppendAvailable) missing.push('audit_intent_surface_missing');
  if (!capabilities.auditCommitAppendAvailable) missing.push('audit_commit_surface_missing');
  if (!capabilities.auditCancelAppendAvailable) missing.push('audit_cancel_surface_missing');
  return missing;
}

function planDurableGovernanceTombstoneRuntimePrep(input = {}) {
  const normalizedInput = normalizeRuntimePrepInput(input);
  const dryRunPreview = summarizeDurableGovernanceMutationDryRun(normalizedInput.dryRunInput);
  const projectionPreview = previewDurableGovernanceShadowProjection({
    dryRunInput: input.dryRunInput,
    currentProjectionRecords: normalizedInput.currentProjectionRecords,
    previewedAt: normalizedInput.plannedAt
  });
  const recordMap = buildRecordMap(normalizedInput.currentProjectionRecords);
  const targetMemoryId = normalizedInput.dryRunInput.targetMemoryIds[0] || '';
  const targetRecord = recordMap.get(targetMemoryId) || null;
  const tombstoneReason = normalizeString(
    normalizedInput.dryRunInput.mutationFieldValues.tombstoneReason ||
    normalizedInput.dryRunInput.mutationFieldValues.tombstone_reason
  );
  const blockingFindings = [];

  if (!SUPPORTED_RUNTIME_PREP_FAMILIES.includes(normalizedInput.dryRunInput.mutationFamily)) {
    blockingFindings.push('unsupported_runtime_candidate_family');
  }
  if (dryRunPreview.acceptedForDryRunPreview !== true) {
    blockingFindings.push('dry_run_preview_not_accepted');
  }
  if (projectionPreview.acceptedForProjectionPreview !== true) {
    blockingFindings.push('projection_preview_not_accepted');
  }
  if (!targetRecord) {
    blockingFindings.push('target_projection_record_missing');
  }

  const missingCapabilities = buildMissingCapabilityIds(normalizedInput.runtimeSurfaceCapabilities);
  blockingFindings.push(...missingCapabilities);

  const acceptedForRuntimePrep = blockingFindings.length === 0;
  const targetAffectedRecord = projectionPreview.projectionResult.affectedRecords.find(
    record => record.memoryId === targetMemoryId
  ) || null;
  const auditEvents = targetRecord
    ? buildAuditEvents({
        normalizedInput,
        targetRecord,
        tombstoneReason
      })
    : null;

  return {
    sourceMode: 'explicit_input',
    acceptedForRuntimePrep,
    decision: acceptedForRuntimePrep
      ? 'BOUNDED_INTERNAL_RUNTIME_PREP_READY_NOT_APPROVED'
      : 'NOT_READY_BLOCKED',
    approvalStatus: 'BLOCKED_PENDING_APPROVAL',
    mutationFamily: normalizedInput.dryRunInput.mutationFamily,
    runtimeCandidateFamily: 'memory_tombstone',
    validateMemoryPatternCompatible: true,
    executionApproved: false,
    runtimeIntegrated: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    publicMcpExpanded: false,
    realMemoryScanned: false,
    plannedAt: normalizedInput.plannedAt,
    dryRunPreview: {
      acceptedForDryRunPreview: dryRunPreview.acceptedForDryRunPreview === true,
      blockingFindings: dryRunPreview.blockers.blockingFindings || []
    },
    projectionPreview: {
      acceptedForProjectionPreview: projectionPreview.acceptedForProjectionPreview === true,
      blockingFindings: projectionPreview.blockers.blockingFindings || [],
      projectedChangedMemoryIds: projectionPreview.projectionResult.projectedChangedMemoryIds || [],
      projectedRevisionToken: projectionPreview.projectionResult.projectedRevisionToken || null
    },
    runtimeContract: {
      supportedFamilies: SUPPORTED_RUNTIME_PREP_FAMILIES,
      runtimeApplyBlocked: true,
      singleRecordMutation: true,
      updateApiCandidate: 'updateLifecycleStatus',
      requiresPendingAuditIntent: true,
      requiresCommittedAudit: true,
      requiresCancelledAudit: true,
      sqliteLifecycleColumns: [
        'status',
        'status_reason',
        'tombstone_reason',
        'lifecycle_updated_at',
        'lifecycle_actor_client_id'
      ]
    },
    runtimeSurface: {
      capabilities: normalizedInput.runtimeSurfaceCapabilities,
      missingCapabilities
    },
    auditPlan: {
      eventFamily: 'memory_tombstone',
      intentEvent: auditEvents ? auditEvents.intent : null,
      committedEvent: auditEvents ? auditEvents.committed : null,
      cancelledEvent: auditEvents ? auditEvents.cancelled : null
    },
    shadowUpdatePlan: targetRecord && targetAffectedRecord ? {
      targetMemoryId,
      fromStatus: targetRecord.status,
      toStatus: normalizeStatus(normalizedInput.dryRunInput.lifecycleTransition.to),
      apiCandidate: 'updateLifecycleStatus',
      options: {
        memoryId: targetMemoryId,
        fromStatus: targetRecord.status,
        toStatus: normalizeStatus(normalizedInput.dryRunInput.lifecycleTransition.to),
        updatedAt: normalizedInput.plannedAt,
        actorClientId: normalizedInput.dryRunInput.actorClientId || null,
        reason: normalizedInput.dryRunInput.reason || null,
        expectedClientId: targetRecord.clientId || null,
        expectedVisibility: targetRecord.visibility || null
      },
      sqliteAfterColumns: targetAffectedRecord.afterSqliteColumns,
      fieldChangesSqliteColumns: targetAffectedRecord.fieldChangesSqliteColumns,
      missingProjectionColumns: missingCapabilities.filter(id => /projection_surface_missing/.test(id))
    } : null,
    invalidationPlan: {
      changedMemoryIds: projectionPreview.projectionResult.projectedChangedMemoryIds || [],
      projectedRevisionToken: projectionPreview.projectionResult.projectedRevisionToken || null
    },
    blockers: {
      blockingFindings,
      targetRecordPresent: targetRecord !== null,
      dryRunAccepted: dryRunPreview.acceptedForDryRunPreview === true,
      projectionAccepted: projectionPreview.acceptedForProjectionPreview === true
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: false,
      rawWorkspaceIdExposed: false
    },
    nextStep: acceptedForRuntimePrep
      ? 'Keep runtime apply blocked, but this tombstone-first internal plan is now shaped enough for a future bounded temp-local or internal runtime proof.'
      : 'Repair the tombstone-first runtime surface or explicit input gaps and keep durable governance runtime apply blocked.'
  };
}

module.exports = {
  SUPPORTED_RUNTIME_PREP_FAMILIES,
  normalizeDurableGovernanceTombstoneRuntimePrepInput: normalizeRuntimePrepInput,
  planDurableGovernanceTombstoneRuntimePrep
};
