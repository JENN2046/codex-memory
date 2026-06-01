const {
  normalizeDurableGovernanceMutationDryRunInput,
  summarizeDurableGovernanceMutationDryRun
} = require('./DurableGovernanceMutationDryRunHelper');
const {
  previewDurableGovernanceShadowProjection
} = require('./DurableGovernanceShadowProjectionPreview');
const {
  previewMemorySupersedePairOutcome
} = require('./MemorySupersedePairOutcomeHelper');
const {
  summarizeMemorySupersedeShadowSeamContract
} = require('./MemorySupersedeShadowSeamContract');
const {
  firstNonEmptyAliasString,
  LIFECYCLE_STATUS_ALIASES,
  MEMORY_ID_ALIASES,
  VISIBILITY_POLICY_ALIASES
} = require('./FieldAliasNormalizer');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const SUPPORTED_RUNTIME_PREP_FAMILIES = Object.freeze(['memory_supersede']);
const SUPPORTED_LINK_COLUMNS = Object.freeze([
  'supersedes_memory_id',
  'superseded_by_memory_id'
]);
const SQLITE_LIFECYCLE_COLUMNS = Object.freeze([
  'status',
  'status_reason',
  'supersedes_memory_id',
  'superseded_by_memory_id',
  'lifecycle_updated_at',
  'lifecycle_actor_client_id'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function firstRedactedAliasString(source = {}, aliases = []) {
  return normalizeString(firstNonEmptyAliasString(source, aliases));
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeProjectionRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};
  return {
    ...safeRecord,
    memoryId: firstRedactedAliasString(safeRecord, MEMORY_ID_ALIASES),
    status: normalizeStatus(firstRedactedAliasString(safeRecord, LIFECYCLE_STATUS_ALIASES)),
    clientId: firstRedactedAliasString(safeRecord, ['clientId', 'client_id']),
    visibility: firstRedactedAliasString(safeRecord, VISIBILITY_POLICY_ALIASES),
    lifecycleUpdatedAt: firstRedactedAliasString(safeRecord, ['lifecycleUpdatedAt', 'lifecycle_updated_at'])
  };
}

function normalizeRuntimeSurfaceCapabilities(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    pairShadowSeamAvailable: normalizeBoolean(safeInput.pairShadowSeamAvailable),
    statusColumnAvailable: normalizeBoolean(safeInput.statusColumnAvailable),
    statusReasonWritable: normalizeBoolean(safeInput.statusReasonWritable),
    supersedesLinkWritable: normalizeBoolean(safeInput.supersedesLinkWritable),
    supersededByLinkWritable: normalizeBoolean(safeInput.supersededByLinkWritable),
    lifecycleUpdatedAtWritable: normalizeBoolean(safeInput.lifecycleUpdatedAtWritable),
    lifecycleActorClientIdWritable: normalizeBoolean(safeInput.lifecycleActorClientIdWritable),
    sharedPolicyGuardAvailable: normalizeBoolean(safeInput.sharedPolicyGuardAvailable),
    pairAtomicityAvailable: normalizeBoolean(safeInput.pairAtomicityAvailable),
    pairRollbackPreviewAvailable: normalizeBoolean(safeInput.pairRollbackPreviewAvailable),
    auditIntentAppendAvailable: normalizeBoolean(safeInput.auditIntentAppendAvailable),
    auditCommitAppendAvailable: normalizeBoolean(safeInput.auditCommitAppendAvailable),
    auditCancelAppendAvailable: normalizeBoolean(safeInput.auditCancelAppendAvailable)
  };
}

function normalizeRuntimePrepInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    pairOutcomeContract: isPlainObject(safeInput.pairOutcomeContract)
      ? safeInput.pairOutcomeContract
      : {},
    shadowSeamContract: isPlainObject(safeInput.shadowSeamContract)
      ? safeInput.shadowSeamContract
      : {},
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

function findAffectedRecord(affectedRecords, memoryId) {
  return cloneArray(affectedRecords).find(record => record.memoryId === memoryId) || null;
}

function buildMissingCapabilityIds(capabilities) {
  const missing = [];
  if (!capabilities.pairShadowSeamAvailable) missing.push('two_record_shadow_seam_surface_missing');
  if (!capabilities.statusColumnAvailable) missing.push('status_column_surface_missing');
  if (!capabilities.statusReasonWritable) missing.push('status_reason_projection_surface_missing');
  if (!capabilities.supersedesLinkWritable) missing.push('supersedes_link_projection_surface_missing');
  if (!capabilities.supersededByLinkWritable) missing.push('superseded_by_link_projection_surface_missing');
  if (!capabilities.lifecycleUpdatedAtWritable) missing.push('lifecycle_updated_at_projection_surface_missing');
  if (!capabilities.lifecycleActorClientIdWritable) missing.push('lifecycle_actor_client_id_projection_surface_missing');
  if (!capabilities.sharedPolicyGuardAvailable) missing.push('shared_policy_guard_surface_missing');
  if (!capabilities.pairAtomicityAvailable) missing.push('pair_atomicity_surface_missing');
  if (!capabilities.pairRollbackPreviewAvailable) missing.push('pair_rollback_preview_surface_missing');
  if (!capabilities.auditIntentAppendAvailable) missing.push('audit_intent_surface_missing');
  if (!capabilities.auditCommitAppendAvailable) missing.push('audit_commit_surface_missing');
  if (!capabilities.auditCancelAppendAvailable) missing.push('audit_cancel_surface_missing');
  return missing;
}

function buildPairRecordRuntimePlan({
  record,
  affectedRecord,
  afterStatus,
  updatedAt,
  actorClientId,
  expectedClientId,
  expectedVisibility
}) {
  return {
    memoryId: record.memoryId,
    fromStatus: record.status,
    toStatus: afterStatus,
    expectedStatus: record.status,
    expectedClientId: expectedClientId || null,
    expectedVisibility: expectedVisibility || null,
    previousSnapshotRef: {
      memory_id: record.memoryId,
      status: record.status,
      updated_at: record.lifecycleUpdatedAt || null
    },
    sqliteAfterColumns: affectedRecord.afterSqliteColumns,
    fieldChangesSqliteColumns: affectedRecord.fieldChangesSqliteColumns
  };
}

function planMemorySupersedeRuntimePrep(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const normalizedInput = normalizeRuntimePrepInput(input);
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
    currentProjectionRecords: normalizedInput.currentProjectionRecords,
    previewedAt: normalizedInput.plannedAt
  });
  const pairOutcomePreview = previewMemorySupersedePairOutcome({
    pairOutcomeContract: normalizedInput.pairOutcomeContract,
    dryRunInput: isPlainObject(safeInput.dryRunInput)
      ? safeInput.dryRunInput
      : {
          contract: normalizedInput.dryRunInput.contract,
          ...normalizedInput.dryRunInput
        },
    currentProjectionRecords: normalizedInput.currentProjectionRecords,
    plannedAt: normalizedInput.plannedAt
  });
  const seamContractSummary = summarizeMemorySupersedeShadowSeamContract(normalizedInput.shadowSeamContract);
  const recordMap = buildRecordMap(normalizedInput.currentProjectionRecords);
  const oldMemoryId = normalizeString(normalizedInput.dryRunInput.mutationFieldValues.oldMemoryId);
  const newMemoryId = normalizeString(normalizedInput.dryRunInput.mutationFieldValues.newMemoryId);
  const oldRecord = recordMap.get(oldMemoryId) || null;
  const newRecord = recordMap.get(newMemoryId) || null;
  const oldAffectedRecord = findAffectedRecord(projectionPreview.projectionResult.affectedRecords, oldMemoryId);
  const newAffectedRecord = findAffectedRecord(projectionPreview.projectionResult.affectedRecords, newMemoryId);
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
  if (pairOutcomePreview.acceptedForPairOutcomePreview !== true) {
    blockingFindings.push('pair_outcome_preview_not_accepted');
  }
  if (seamContractSummary.acceptedForPlanning !== true) {
    blockingFindings.push('shadow_seam_contract_not_accepted');
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

  const missingCapabilities = buildMissingCapabilityIds(normalizedInput.runtimeSurfaceCapabilities);
  blockingFindings.push(...missingCapabilities);

  const acceptedForRuntimePrep = blockingFindings.length === 0;
  const pairPreview = pairOutcomePreview.pairOutcomePreview || null;

  return {
    sourceMode: 'explicit_input',
    acceptedForRuntimePrep,
    decision: acceptedForRuntimePrep
      ? 'BOUNDED_INTERNAL_RUNTIME_PREP_READY_NOT_APPROVED'
      : 'NOT_READY_BLOCKED',
    approvalStatus: 'BLOCKED_PENDING_APPROVAL',
    mutationFamily: normalizedInput.dryRunInput.mutationFamily,
    runtimeCandidateFamily: 'memory_supersede',
    sharedInternalRuntimeEntryCandidate: false,
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
    pairOutcomePreview: {
      acceptedForPairOutcomePreview: pairOutcomePreview.acceptedForPairOutcomePreview === true,
      blockingFindings: pairOutcomePreview.blockers.blockingFindings || [],
      pairOutcome: pairPreview
    },
    shadowSeamContract: {
      acceptedForPlanning: seamContractSummary.acceptedForPlanning === true,
      requiredPairFieldsExact: seamContractSummary.requiredPairFields.exact === true,
      supportedLinkColumnsExact: seamContractSummary.supportedLinkColumns.exact === true,
      seamPropertiesBlocked: seamContractSummary.seamProperties.blocked === true
    },
    runtimeContract: {
      supportedFamilies: SUPPORTED_RUNTIME_PREP_FAMILIES,
      runtimeApplyBlocked: true,
      pairMutation: true,
      singleRecordReuseAllowed: false,
      pairUpdateApiCandidate: 'applySupersedePair',
      pairOutcomePreviewRequired: true,
      shadowSeamContractRequired: true,
      requiresPendingAuditIntent: true,
      requiresCommittedAudit: true,
      requiresCancelledAudit: true,
      pairAtomicityRequired: true,
      sqliteLifecycleColumns: SQLITE_LIFECYCLE_COLUMNS,
      supportedLinkColumns: SUPPORTED_LINK_COLUMNS
    },
    runtimeSurface: {
      capabilities: normalizedInput.runtimeSurfaceCapabilities,
      missingCapabilities
    },
    auditPlan: {
      eventFamily: 'memory_supersede',
      intentEvent: pairOutcomePreview.auditPlan.intentEvent,
      committedEvent: pairOutcomePreview.auditPlan.committedEvent,
      cancelledEvent: pairOutcomePreview.auditPlan.cancelledEvent
    },
    shadowUpdatePlan: oldRecord && newRecord && oldAffectedRecord && newAffectedRecord && pairPreview ? {
      apiCandidate: 'applySupersedePair',
      pairCorrelationId: pairPreview.pairCorrelationId,
      pairLinkColumns: SUPPORTED_LINK_COLUMNS,
      oldRecord: buildPairRecordRuntimePlan({
        record: oldRecord,
        affectedRecord: oldAffectedRecord,
        afterStatus: pairPreview.oldToStatus,
        updatedAt: normalizedInput.plannedAt,
        actorClientId: normalizedInput.dryRunInput.actorClientId,
        expectedClientId: oldRecord.clientId,
        expectedVisibility: oldRecord.visibility
      }),
      newRecord: buildPairRecordRuntimePlan({
        record: newRecord,
        affectedRecord: newAffectedRecord,
        afterStatus: pairPreview.newToStatus,
        updatedAt: normalizedInput.plannedAt,
        actorClientId: normalizedInput.dryRunInput.actorClientId,
        expectedClientId: newRecord.clientId,
        expectedVisibility: newRecord.visibility
      }),
      shared: {
        actorClientId: normalizedInput.dryRunInput.actorClientId || null,
        requestSource: normalizedInput.dryRunInput.requestSource || null,
        updatedAt: normalizedInput.plannedAt,
        statusReason: normalizedInput.dryRunInput.reason || null,
        supersedesLink: pairPreview.supersedesLink,
        supersededByLink: pairPreview.supersededByLink
      },
      missingProjectionColumns: missingCapabilities.filter(id => /projection_surface_missing/.test(id))
    } : null,
    rollbackPreview: {
      path: normalizedInput.dryRunInput.rollbackPath || null,
      provided: Boolean(normalizedInput.dryRunInput.rollbackPath),
      pairRollbackPreviewRequired: true,
      compensatingMutationRequired: true
    },
    invalidationPlan: {
      changedMemoryIds: projectionPreview.projectionResult.projectedChangedMemoryIds || [],
      projectedRevisionToken: projectionPreview.projectionResult.projectedRevisionToken || null
    },
    blockers: {
      blockingFindings,
      oldRecordPresent: oldRecord !== null,
      newRecordPresent: newRecord !== null,
      pairAffectedRecordsPresent: oldAffectedRecord !== null && newAffectedRecord !== null,
      pairOutcomeAccepted: pairOutcomePreview.acceptedForPairOutcomePreview === true,
      seamContractAccepted: seamContractSummary.acceptedForPlanning === true,
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
      ? 'Keep runtime apply blocked, but this supersede pair-shaped internal plan is now precise enough for a future guarded two-record seam discussion.'
      : 'Repair the supersede pair preview, seam contract, or pair runtime surface gaps and keep runtime durable governance apply blocked.'
  };
}

module.exports = {
  SUPPORTED_RUNTIME_PREP_FAMILIES,
  normalizeMemorySupersedeRuntimePrepInput: normalizeRuntimePrepInput,
  planMemorySupersedeRuntimePrep
};
