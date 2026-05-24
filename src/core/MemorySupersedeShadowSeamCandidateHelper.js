const {
  normalizeMemorySupersedeRuntimePrepInput,
  planMemorySupersedeRuntimePrep
} = require('./MemorySupersedeRuntimePrepHelper');
const {
  summarizeMemorySupersedeShadowSeamContract
} = require('./MemorySupersedeShadowSeamContract');

const SUPPORTED_SHADOW_SEAM_CANDIDATE_FAMILIES = Object.freeze(['memory_supersede']);
const SUPPORTED_LINK_COLUMNS = Object.freeze([
  'supersedes_memory_id',
  'superseded_by_memory_id'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeShadowSeamCandidateInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const normalizedRuntimePrepInput = normalizeMemorySupersedeRuntimePrepInput(safeInput);

  return {
    pairOutcomeContract: isPlainObject(safeInput.pairOutcomeContract)
      ? safeInput.pairOutcomeContract
      : {},
    shadowSeamContract: isPlainObject(safeInput.shadowSeamContract)
      ? safeInput.shadowSeamContract
      : {},
    dryRunInput: normalizedRuntimePrepInput.dryRunInput,
    currentProjectionRecords: normalizedRuntimePrepInput.currentProjectionRecords,
    runtimeSurfaceCapabilities: normalizedRuntimePrepInput.runtimeSurfaceCapabilities,
    plannedAt: normalizedRuntimePrepInput.plannedAt
  };
}

function buildPairApplyCandidate(runtimePrepPreview) {
  const shadowUpdatePlan = runtimePrepPreview.shadowUpdatePlan;
  const oldRecordPlan = shadowUpdatePlan.oldRecord;
  const newRecordPlan = shadowUpdatePlan.newRecord;

  return {
    methodName: runtimePrepPreview.runtimeContract.pairUpdateApiCandidate,
    pairCorrelationId: shadowUpdatePlan.pairCorrelationId,
    executionBlocked: true,
    runtimeIntegrated: false,
    mutated: false,
    pairAtomicityRequired: true,
    sharedPolicyGuardRequired: true,
    singleRecordReuseAllowed: false,
    supportedLinkColumns: SUPPORTED_LINK_COLUMNS,
    oldRecordUpdate: {
      memoryId: oldRecordPlan.memoryId,
      expectedStatus: oldRecordPlan.expectedStatus,
      nextStatus: oldRecordPlan.toStatus,
      expectedClientId: oldRecordPlan.expectedClientId,
      expectedVisibility: oldRecordPlan.expectedVisibility,
      sqliteAfterColumns: oldRecordPlan.sqliteAfterColumns,
      fieldChangesSqliteColumns: oldRecordPlan.fieldChangesSqliteColumns
    },
    newRecordUpdate: {
      memoryId: newRecordPlan.memoryId,
      expectedStatus: newRecordPlan.expectedStatus,
      nextStatus: newRecordPlan.toStatus,
      expectedClientId: newRecordPlan.expectedClientId,
      expectedVisibility: newRecordPlan.expectedVisibility,
      sqliteAfterColumns: newRecordPlan.sqliteAfterColumns,
      fieldChangesSqliteColumns: newRecordPlan.fieldChangesSqliteColumns
    },
    sharedWritePlan: {
      actorClientId: shadowUpdatePlan.shared.actorClientId,
      requestSource: shadowUpdatePlan.shared.requestSource,
      updatedAt: shadowUpdatePlan.shared.updatedAt,
      statusReason: shadowUpdatePlan.shared.statusReason,
      supersedesLink: shadowUpdatePlan.shared.supersedesLink,
      supersededByLink: shadowUpdatePlan.shared.supersededByLink
    }
  };
}

function buildPairGuardPlan(runtimePrepPreview) {
  const shadowUpdatePlan = runtimePrepPreview.shadowUpdatePlan;
  const oldRecordPlan = shadowUpdatePlan.oldRecord;
  const newRecordPlan = shadowUpdatePlan.newRecord;

  return {
    sharedPolicyGuardRequired: true,
    pairAtomicityRequired: true,
    singleRecordReuseAllowed: false,
    rollbackPreviewRequired: runtimePrepPreview.rollbackPreview.pairRollbackPreviewRequired === true,
    projectedChangedMemoryIds: runtimePrepPreview.invalidationPlan.changedMemoryIds,
    oldRecordGuard: {
      memoryId: oldRecordPlan.memoryId,
      expectedStatus: oldRecordPlan.expectedStatus,
      expectedClientId: oldRecordPlan.expectedClientId,
      expectedVisibility: oldRecordPlan.expectedVisibility
    },
    newRecordGuard: {
      memoryId: newRecordPlan.memoryId,
      expectedStatus: newRecordPlan.expectedStatus,
      expectedClientId: newRecordPlan.expectedClientId,
      expectedVisibility: newRecordPlan.expectedVisibility
    }
  };
}

function buildAuditCorrelationPlan(runtimePrepPreview) {
  return {
    eventFamily: runtimePrepPreview.auditPlan.eventFamily,
    intentEventId: runtimePrepPreview.auditPlan.intentEvent
      ? runtimePrepPreview.auditPlan.intentEvent.event_id
      : null,
    committedEventId: runtimePrepPreview.auditPlan.committedEvent
      ? runtimePrepPreview.auditPlan.committedEvent.event_id
      : null,
    cancelledEventId: runtimePrepPreview.auditPlan.cancelledEvent
      ? runtimePrepPreview.auditPlan.cancelledEvent.event_id
      : null,
    pairCorrelationId: runtimePrepPreview.shadowUpdatePlan
      ? runtimePrepPreview.shadowUpdatePlan.pairCorrelationId
      : null,
    intentPhaseRequired: true,
    committedPhaseRequired: true,
    cancelledPhaseRequired: true
  };
}

function planMemorySupersedeShadowSeamCandidate(input = {}) {
  const normalizedInput = normalizeShadowSeamCandidateInput(input);
  const runtimePrepPreview = planMemorySupersedeRuntimePrep(input);
  const shadowSeamContract = summarizeMemorySupersedeShadowSeamContract(normalizedInput.shadowSeamContract);
  const blockingFindings = [];

  if (!SUPPORTED_SHADOW_SEAM_CANDIDATE_FAMILIES.includes(normalizedInput.dryRunInput.mutationFamily)) {
    blockingFindings.push('unsupported_shadow_seam_candidate_family');
  }
  if (shadowSeamContract.acceptedForPlanning !== true) {
    blockingFindings.push('shadow_seam_contract_not_accepted');
  }
  if (runtimePrepPreview.acceptedForRuntimePrep !== true) {
    blockingFindings.push('runtime_prep_not_accepted');
  }
  if (!runtimePrepPreview.shadowUpdatePlan) {
    blockingFindings.push('pair_shadow_update_plan_missing');
  }
  if (!runtimePrepPreview.auditPlan.intentEvent ||
      !runtimePrepPreview.auditPlan.committedEvent ||
      !runtimePrepPreview.auditPlan.cancelledEvent) {
    blockingFindings.push('pair_audit_follow_up_plan_missing');
  }
  if (runtimePrepPreview.runtimeContract.pairUpdateApiCandidate !== 'applySupersedePair') {
    blockingFindings.push('unexpected_pair_update_api_candidate');
  }
  if (runtimePrepPreview.rollbackPreview.provided !== true) {
    blockingFindings.push('pair_rollback_preview_missing');
  }

  const acceptedForShadowSeamCandidate = blockingFindings.length === 0;

  return {
    sourceMode: 'explicit_input',
    acceptedForShadowSeamCandidate,
    decision: acceptedForShadowSeamCandidate
      ? 'BOUNDED_INTERNAL_SHADOW_SEAM_CANDIDATE_READY_NOT_APPROVED'
      : 'NOT_READY_BLOCKED',
    approvalStatus: 'BLOCKED_PENDING_APPROVAL',
    mutationFamily: normalizedInput.dryRunInput.mutationFamily,
    runtimeCandidateFamily: 'memory_supersede',
    executionApproved: false,
    runtimeIntegrated: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    publicMcpExpanded: false,
    realMemoryScanned: false,
    plannedAt: normalizedInput.plannedAt,
    shadowSeamContract: {
      acceptedForPlanning: shadowSeamContract.acceptedForPlanning === true,
      requiredPairFieldsExact: shadowSeamContract.requiredPairFields.exact === true,
      supportedLinkColumnsExact: shadowSeamContract.supportedLinkColumns.exact === true,
      seamPropertiesBlocked: shadowSeamContract.seamProperties.blocked === true
    },
    runtimePrepPreview: {
      acceptedForRuntimePrep: runtimePrepPreview.acceptedForRuntimePrep === true,
      blockingFindings: runtimePrepPreview.blockers.blockingFindings || [],
      projectedChangedMemoryIds: runtimePrepPreview.invalidationPlan.changedMemoryIds || [],
      projectedRevisionToken: runtimePrepPreview.invalidationPlan.projectedRevisionToken || null
    },
    shadowSeamCandidate: acceptedForShadowSeamCandidate
      ? buildPairApplyCandidate(runtimePrepPreview)
      : null,
    pairGuardPlan: acceptedForShadowSeamCandidate
      ? buildPairGuardPlan(runtimePrepPreview)
      : null,
    auditCorrelationPlan: acceptedForShadowSeamCandidate
      ? buildAuditCorrelationPlan(runtimePrepPreview)
      : null,
    rollbackPreview: runtimePrepPreview.rollbackPreview,
    blockers: {
      blockingFindings,
      shadowSeamContractAccepted: shadowSeamContract.acceptedForPlanning === true,
      runtimePrepAccepted: runtimePrepPreview.acceptedForRuntimePrep === true,
      pairShadowUpdatePlanPresent: Boolean(runtimePrepPreview.shadowUpdatePlan),
      pairAuditPlanPresent: Boolean(
        runtimePrepPreview.auditPlan.intentEvent &&
        runtimePrepPreview.auditPlan.committedEvent &&
        runtimePrepPreview.auditPlan.cancelledEvent
      )
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
    nextStep: acceptedForShadowSeamCandidate
      ? 'Keep runtime apply blocked, but this guarded pair-shaped seam candidate is now precise enough for a future two-record shadow-store implementation discussion.'
      : 'Repair the blocked supersede runtime-prep or seam-contract inputs before discussing any two-record shadow-store implementation.'
  };
}

module.exports = {
  SUPPORTED_SHADOW_SEAM_CANDIDATE_FAMILIES,
  normalizeMemorySupersedeShadowSeamCandidateInput: normalizeShadowSeamCandidateInput,
  planMemorySupersedeShadowSeamCandidate
};
