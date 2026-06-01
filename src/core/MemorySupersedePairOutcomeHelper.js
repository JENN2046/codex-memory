const crypto = require('node:crypto');

const {
  summarizeMemorySupersedePairOutcomeContract
} = require('./MemorySupersedePairOutcomeContract');
const {
  normalizeDurableGovernanceMutationDryRunInput,
  summarizeDurableGovernanceMutationDryRun
} = require('./DurableGovernanceMutationDryRunHelper');
const {
  normalizeDurableGovernanceShadowProjectionPreviewInput,
  previewDurableGovernanceShadowProjection
} = require('./DurableGovernanceShadowProjectionPreview');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const SUPPORTED_PAIR_OUTCOME_FAMILIES = Object.freeze(['memory_supersede']);

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

function normalizeProjectionRecordId(record = {}) {
  if (!isPlainObject(record)) {
    return record;
  }
  return {
    ...record,
    memoryId: firstNormalizedString(record.memoryId, record.memory_id)
  };
}

function normalizeHelperInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const normalizedProjectionInput = normalizeDurableGovernanceShadowProjectionPreviewInput({
    dryRunInput: safeInput.dryRunInput,
    currentProjectionRecords: safeInput.currentProjectionRecords,
    previewedAt: safeInput.plannedAt
  });

  return {
    pairOutcomeContract: isPlainObject(safeInput.pairOutcomeContract)
      ? safeInput.pairOutcomeContract
      : {},
    dryRunInput: normalizeDurableGovernanceMutationDryRunInput(safeInput.dryRunInput),
    currentProjectionRecords: normalizedProjectionInput.currentProjectionRecords,
    plannedAt: normalizeString(safeInput.plannedAt) || '<planned>'
  };
}

function buildRecordMap(records) {
  return new Map(records
    .map(normalizeProjectionRecordId)
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

function buildPreviousSnapshotRef(record) {
  return {
    memory_id: record.memoryId,
    status: record.status,
    updated_at: record.lifecycleUpdatedAt || null
  };
}

function findAffectedRecord(affectedRecords, memoryId) {
  return cloneArray(affectedRecords).find(record => record.memoryId === memoryId) || null;
}

function buildPairOutcomePreview({
  normalizedInput,
  oldRecord,
  newRecord,
  oldAffectedRecord,
  newAffectedRecord,
  pairCorrelationId,
  intentEventId,
  committedEventId,
  cancelledEventId
}) {
  const fieldValues = normalizedInput.dryRunInput.mutationFieldValues;
  return {
    oldMemoryId: oldRecord.memoryId,
    newMemoryId: newRecord.memoryId,
    intentEventId,
    committedEventId,
    cancelledEventId,
    pairCorrelationId,
    oldPreviousSnapshotRef: buildPreviousSnapshotRef(oldRecord),
    newPreviousSnapshotRef: buildPreviousSnapshotRef(newRecord),
    oldFromStatus: oldRecord.status,
    oldToStatus: oldAffectedRecord.after.status,
    newFromStatus: newRecord.status,
    newToStatus: newAffectedRecord.after.status,
    supersededByLink: normalizeString(fieldValues.supersededByLink) || newRecord.memoryId,
    supersedesLink: normalizeString(fieldValues.supersedesLink) || oldRecord.memoryId,
    actorClientId: normalizedInput.dryRunInput.actorClientId,
    requestSource: normalizedInput.dryRunInput.requestSource,
    reason: normalizedInput.dryRunInput.reason,
    evidence: normalizedInput.dryRunInput.evidenceSummary,
    createdAt: normalizedInput.plannedAt
  };
}

function buildAuditEvents({ pairOutcomePreview, projectionPreview }) {
  const baseEvent = {
    event_type: 'memory_supersede',
    tool_name: 'supersede_memory',
    memory_id: pairOutcomePreview.oldMemoryId,
    replacement_memory_id: pairOutcomePreview.newMemoryId,
    supersedes_memory_id: pairOutcomePreview.supersedesLink,
    superseded_by_memory_id: pairOutcomePreview.supersededByLink,
    actor_client_id: pairOutcomePreview.actorClientId,
    request_source: pairOutcomePreview.requestSource,
    old_from_status: pairOutcomePreview.oldFromStatus,
    old_to_status: pairOutcomePreview.oldToStatus,
    new_from_status: pairOutcomePreview.newFromStatus,
    new_to_status: pairOutcomePreview.newToStatus,
    from_status: pairOutcomePreview.oldFromStatus,
    to_status: pairOutcomePreview.oldToStatus,
    reason: pairOutcomePreview.reason,
    evidence: pairOutcomePreview.evidence,
    created_at: pairOutcomePreview.createdAt,
    reversible: true,
    redaction_applied: true,
    lifecycle_policy_applied: true,
    scope_policy_applied: true,
    pair_correlation_id: pairOutcomePreview.pairCorrelationId,
    old_previous_snapshot_ref: pairOutcomePreview.oldPreviousSnapshotRef,
    new_previous_snapshot_ref: pairOutcomePreview.newPreviousSnapshotRef,
    projected_changed_memory_ids: projectionPreview.projectionResult.projectedChangedMemoryIds,
    projected_revision_token: projectionPreview.projectionResult.projectedRevisionToken
  };

  return {
    intentEvent: {
      ...baseEvent,
      event_id: pairOutcomePreview.intentEventId,
      audit_phase: 'pending',
      mutation_applied: false
    },
    committedEvent: {
      ...baseEvent,
      event_id: pairOutcomePreview.committedEventId,
      correlation_id: pairOutcomePreview.pairCorrelationId,
      audit_phase: 'committed',
      mutation_applied: true,
      committed_at: pairOutcomePreview.createdAt
    },
    cancelledEvent: {
      ...baseEvent,
      event_id: pairOutcomePreview.cancelledEventId,
      correlation_id: pairOutcomePreview.pairCorrelationId,
      audit_phase: 'cancelled',
      mutation_applied: false,
      cancel_reason: 'pair lifecycle state or supersede link guard changed before memory_supersede could apply.',
      cancelled_at: pairOutcomePreview.createdAt
    }
  };
}

function previewMemorySupersedePairOutcome(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const normalizedInput = normalizeHelperInput(input);
  const pairContractSummary = summarizeMemorySupersedePairOutcomeContract(normalizedInput.pairOutcomeContract);
  const dryRunPreview = summarizeDurableGovernanceMutationDryRun({
    contract: normalizedInput.dryRunInput.contract,
    ...normalizedInput.dryRunInput
  });
  const projectionPreview = previewDurableGovernanceShadowProjection({
    dryRunInput: isPlainObject(safeInput.dryRunInput)
      ? safeInput.dryRunInput
      : {
          contract: normalizedInput.dryRunInput.contract,
          ...normalizedInput.dryRunInput
        },
    currentProjectionRecords: Array.isArray(safeInput.currentProjectionRecords)
      ? safeInput.currentProjectionRecords
      : normalizedInput.currentProjectionRecords,
    previewedAt: normalizedInput.plannedAt
  });
  const recordMap = buildRecordMap(normalizedInput.currentProjectionRecords);
  const oldMemoryId = normalizeString(normalizedInput.dryRunInput.mutationFieldValues.oldMemoryId);
  const newMemoryId = normalizeString(normalizedInput.dryRunInput.mutationFieldValues.newMemoryId);
  const oldRecord = recordMap.get(oldMemoryId) || null;
  const newRecord = recordMap.get(newMemoryId) || null;
  const oldAffectedRecord = findAffectedRecord(projectionPreview.projectionResult.affectedRecords, oldMemoryId);
  const newAffectedRecord = findAffectedRecord(projectionPreview.projectionResult.affectedRecords, newMemoryId);
  const blockingFindings = [];

  if (pairContractSummary.acceptedForContractHelper !== true) {
    blockingFindings.push('pair_outcome_contract_not_accepted');
  }
  if (!SUPPORTED_PAIR_OUTCOME_FAMILIES.includes(normalizedInput.dryRunInput.mutationFamily)) {
    blockingFindings.push('unsupported_pair_outcome_family');
  }
  if (dryRunPreview.acceptedForDryRunPreview !== true) {
    blockingFindings.push('dry_run_preview_not_accepted');
  }
  if (projectionPreview.acceptedForProjectionPreview !== true) {
    blockingFindings.push('projection_preview_not_accepted');
  }
  if (!oldRecord) {
    blockingFindings.push('old_projection_record_missing');
  }
  if (!newRecord) {
    blockingFindings.push('new_projection_record_missing');
  }
  if (!oldAffectedRecord || !newAffectedRecord) {
    blockingFindings.push('pair_affected_records_missing');
  }
  if (oldAffectedRecord && oldAffectedRecord.after.status !== 'superseded') {
    blockingFindings.push('old_after_status_not_superseded');
  }
  if (newAffectedRecord && newAffectedRecord.after.status !== 'active') {
    blockingFindings.push('new_after_status_not_active');
  }

  const acceptedForPairOutcomePreview = blockingFindings.length === 0;
  const identityPayload = {
    mutationFamily: normalizedInput.dryRunInput.mutationFamily,
    oldMemoryId,
    newMemoryId,
    plannedAt: normalizedInput.plannedAt,
    actorClientId: normalizedInput.dryRunInput.actorClientId,
    requestSource: normalizedInput.dryRunInput.requestSource
  };
  const pairCorrelationId = acceptedForPairOutcomePreview
    ? buildStableId('memory-supersede-pair-correlation', identityPayload)
    : null;
  const intentEventId = acceptedForPairOutcomePreview
    ? buildStableId('memory-supersede-intent', identityPayload)
    : null;
  const committedEventId = acceptedForPairOutcomePreview
    ? buildStableId('memory-supersede-committed', identityPayload)
    : null;
  const cancelledEventId = acceptedForPairOutcomePreview
    ? buildStableId('memory-supersede-cancelled', identityPayload)
    : null;

  const pairOutcomePreview = acceptedForPairOutcomePreview
    ? buildPairOutcomePreview({
        normalizedInput,
        oldRecord,
        newRecord,
        oldAffectedRecord,
        newAffectedRecord,
        pairCorrelationId,
        intentEventId,
        committedEventId,
        cancelledEventId
      })
    : null;
  const auditPlan = acceptedForPairOutcomePreview
    ? buildAuditEvents({
        pairOutcomePreview,
        projectionPreview
      })
    : {
        intentEvent: null,
        committedEvent: null,
        cancelledEvent: null
      };

  return {
    sourceMode: 'explicit_input',
    acceptedForPairOutcomePreview,
    decision: acceptedForPairOutcomePreview
      ? 'BOUNDED_INTERNAL_PAIR_OUTCOME_PREVIEW_READY_NOT_APPROVED'
      : 'NOT_READY_BLOCKED',
    approvalStatus: 'BLOCKED_PENDING_APPROVAL',
    mutationFamily: normalizedInput.dryRunInput.mutationFamily,
    executionApproved: false,
    runtimeIntegrated: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    publicMcpExpanded: false,
    realMemoryScanned: false,
    plannedAt: normalizedInput.plannedAt,
    pairOutcomeContract: {
      acceptedForContractHelper: pairContractSummary.acceptedForContractHelper === true,
      requiredEventPhasesExact: pairContractSummary.requiredEventPhasesExact === true,
      requiredPairOutcomeFieldsExact: pairContractSummary.requiredPairOutcomeFieldsExact === true
    },
    dryRunPreview: {
      acceptedForDryRunPreview: dryRunPreview.acceptedForDryRunPreview === true,
      blockingFindings: dryRunPreview.blockers.blockingFindings || [],
      changedMemoryIds: dryRunPreview.targeting.changedMemoryIds || []
    },
    projectionPreview: {
      acceptedForProjectionPreview: projectionPreview.acceptedForProjectionPreview === true,
      blockingFindings: projectionPreview.blockers.blockingFindings || [],
      projectedChangedMemoryIds: projectionPreview.projectionResult.projectedChangedMemoryIds || [],
      projectedRevisionToken: projectionPreview.projectionResult.projectedRevisionToken || null
    },
    pairOutcomePreview,
    auditPlan,
    blockers: {
      blockingFindings,
      oldRecordPresent: oldRecord !== null,
      newRecordPresent: newRecord !== null,
      pairAffectedRecordsPresent: oldAffectedRecord !== null && newAffectedRecord !== null
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
    nextStep: acceptedForPairOutcomePreview
      ? 'Keep this supersede pair-outcome preview internal-only until a future runtime-prep helper and two-record seam are explicitly approved.'
      : 'Repair the blocked pair contract, dry-run packet, or projection preview before attempting any supersede runtime-prep.'
  };
}

module.exports = {
  SUPPORTED_PAIR_OUTCOME_FAMILIES,
  normalizeMemorySupersedePairOutcomeHelperInput: normalizeHelperInput,
  previewMemorySupersedePairOutcome
};
