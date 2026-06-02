const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const PREVIEW_CONSISTENCY_VERSION = 'phase-g-governance-mutation-preview-consistency-v1';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeBoolean(value) {
  return value === true;
}

function auditPhasePresent(event, expectedPhase) {
  return isPlainObject(event) && event.audit_phase === expectedPhase;
}

function hasFailureSignal(event) {
  if (!isPlainObject(event)) {
    return false;
  }

  return auditPhasePresent(event, 'failed') ||
    normalizeString(event.status) === 'failed' ||
    normalizeString(event.outcome) === 'failed' ||
    normalizeString(event.audit_status) === 'failed' ||
    Boolean(normalizeString(event.failure_reason));
}

function summarizeTargeting(plan) {
  const invalidationChangedIds = cloneArray(plan.invalidationPlan?.changedMemoryIds)
    .map(normalizeString)
    .filter(Boolean);
  const projectedChangedIds = cloneArray(plan.projectionPreview?.projectedChangedMemoryIds)
    .map(normalizeString)
    .filter(Boolean);
  const changedMemoryIds = invalidationChangedIds.length > 0
    ? invalidationChangedIds
    : projectedChangedIds;

  return {
    changedMemoryIds,
    changedMemoryIdsPresent: changedMemoryIds.length > 0,
    targetCount: changedMemoryIds.length,
    singleTarget: changedMemoryIds.length === 1,
    pairTarget: changedMemoryIds.length === 2
  };
}

function summarizeLifecycleTransition(plan) {
  const shadow = isPlainObject(plan.shadowUpdatePlan) ? plan.shadowUpdatePlan : null;
  const oldRecord = isPlainObject(shadow?.oldRecord) ? shadow.oldRecord : null;
  const newRecord = isPlainObject(shadow?.newRecord) ? shadow.newRecord : null;

  if (oldRecord || newRecord) {
    return {
      shape: 'pair',
      present: Boolean(oldRecord && newRecord),
      records: [
        oldRecord ? {
          role: 'old',
          memoryId: normalizeString(oldRecord.memoryId),
          fromStatus: normalizeString(oldRecord.fromStatus),
          toStatus: normalizeString(oldRecord.toStatus)
        } : null,
        newRecord ? {
          role: 'new',
          memoryId: normalizeString(newRecord.memoryId),
          fromStatus: normalizeString(newRecord.fromStatus),
          toStatus: normalizeString(newRecord.toStatus)
        } : null
      ].filter(Boolean)
    };
  }

  if (shadow) {
    return {
      shape: 'single',
      present: Boolean(shadow.targetMemoryId && shadow.fromStatus && shadow.toStatus),
      records: [{
        role: 'target',
        memoryId: normalizeString(shadow.targetMemoryId),
        fromStatus: normalizeString(shadow.fromStatus),
        toStatus: normalizeString(shadow.toStatus)
      }]
    };
  }

  return {
    shape: 'missing',
    present: false,
    records: []
  };
}

function summarizeAuditPlan(plan) {
  const auditPlan = isPlainObject(plan.auditPlan) ? plan.auditPlan : {};
  const failedEvent = auditPlan.failedEvent || auditPlan.failureEvent || null;
  const intentPresent = auditPhasePresent(auditPlan.intentEvent, 'pending');
  const committedPresent = auditPhasePresent(auditPlan.committedEvent, 'committed');
  const cancelledPresent = auditPhasePresent(auditPlan.cancelledEvent, 'cancelled');
  const failedEventPresent = hasFailureSignal(failedEvent);
  const failureHandledByCancelledEvent = cancelledPresent && failedEventPresent === false;

  return {
    eventFamily: normalizeString(auditPlan.eventFamily),
    intentPresent,
    committedPresent,
    cancelledPresent,
    failedEventPresent,
    failureHandledByCancelledEvent,
    failureDurableAuditWritten: normalizeBoolean(auditPlan.failureDurableAuditWritten),
    distinguishesFailedFromCancelled: failureHandledByCancelledEvent || failedEventPresent,
    durableAuditWritten: normalizeBoolean(plan.durableAuditWritten),
    phasesComplete: intentPresent &&
      committedPresent &&
      cancelledPresent
  };
}

function summarizeProjectionPlan(plan) {
  return {
    shadowUpdatePlanPresent: isPlainObject(plan.shadowUpdatePlan),
    projectedRevisionTokenPresent: Boolean(normalizeString(plan.invalidationPlan?.projectedRevisionToken)),
    durableProjectionApplied: normalizeBoolean(plan.durableProjectionApplied)
  };
}

function summarizeSafety(plan) {
  const safety = isPlainObject(plan.safety) ? plan.safety : {};
  return {
    noSideEffects: safety.noSideEffects === true,
    readsFiles: safety.readsFiles === true,
    executesCommands: safety.executesCommands === true,
    startsServices: safety.startsServices === true,
    callsProviders: safety.callsProviders === true,
    mutatesDurableState: safety.mutatesDurableState === true,
    scansRealMemory: safety.scansRealMemory === true,
    publicMcpExpanded: normalizeBoolean(plan.publicMcpExpanded),
    readinessClaimed: false
  };
}

function summarizeGovernanceMutationPreviewConsistency(plan = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};
  const targeting = summarizeTargeting(safePlan);
  const lifecycleTransition = summarizeLifecycleTransition(safePlan);
  const auditPlan = summarizeAuditPlan(safePlan);
  const projectionPlan = summarizeProjectionPlan(safePlan);
  const safety = summarizeSafety(safePlan);
  const blockingFindings = cloneArray(safePlan.blockers?.blockingFindings)
    .map(normalizeString)
    .filter(Boolean);

  const noApplyInvariant =
    safePlan.executionApproved === false &&
    safePlan.runtimeIntegrated === false &&
    safePlan.mutated === false &&
    safePlan.durableAuditWritten === false &&
    safePlan.durableProjectionApplied === false &&
    safePlan.publicMcpExpanded === false &&
    safePlan.realMemoryScanned === false &&
    safety.noSideEffects === true &&
    safety.readsFiles === false &&
    safety.executesCommands === false &&
    safety.startsServices === false &&
    safety.callsProviders === false &&
    safety.mutatesDurableState === false &&
    safety.scansRealMemory === false;

  const requiredShapePresent =
    Boolean(normalizeString(safePlan.mutationFamily)) &&
    targeting.changedMemoryIdsPresent &&
    lifecycleTransition.present &&
    auditPlan.phasesComplete &&
    auditPlan.distinguishesFailedFromCancelled &&
    auditPlan.failureDurableAuditWritten === false &&
    projectionPlan.shadowUpdatePlanPresent &&
    projectionPlan.projectedRevisionTokenPresent;

  return {
    previewConsistencyVersion: PREVIEW_CONSISTENCY_VERSION,
    sourceMode: normalizeString(safePlan.sourceMode) || 'explicit_input',
    acceptedForPreviewConsistency: requiredShapePresent && noApplyInvariant,
    decision: normalizeString(safePlan.decision) || 'NOT_READY_BLOCKED',
    mutationFamily: normalizeString(safePlan.mutationFamily),
    runtimeCandidateFamily: normalizeString(safePlan.runtimeCandidateFamily),
    noApplyInvariant,
    executionApproved: false,
    runtimeIntegrated: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    publicMcpExpanded: false,
    realMemoryScanned: false,
    targeting,
    lifecycleTransition,
    auditPlan,
    projectionPlan,
    invalidationPlan: {
      changedMemoryIds: targeting.changedMemoryIds,
      projectedRevisionTokenPresent: projectionPlan.projectedRevisionTokenPresent
    },
    approval: {
      approvalStatus: normalizeString(safePlan.approvalStatus) || 'BLOCKED_PENDING_APPROVAL',
      exactApprovalRequiredForApply: true,
      executionApprovalConsumed: false
    },
    safety,
    blockers: {
      blockingFindings,
      missingRequiredPreviewShape: requiredShapePresent ? [] : [
        !normalizeString(safePlan.mutationFamily) ? 'mutation_family_missing' : null,
        !targeting.changedMemoryIdsPresent ? 'changed_memory_ids_missing' : null,
        !lifecycleTransition.present ? 'lifecycle_transition_missing' : null,
        !auditPlan.phasesComplete ? 'audit_phases_incomplete' : null,
        !auditPlan.distinguishesFailedFromCancelled ? 'audit_failure_distinction_missing' : null,
        auditPlan.failureDurableAuditWritten ? 'audit_failure_durable_write_not_allowed' : null,
        !projectionPlan.shadowUpdatePlanPresent ? 'shadow_update_plan_missing' : null,
        !projectionPlan.projectedRevisionTokenPresent ? 'projected_revision_token_missing' : null
      ].filter(Boolean)
    }
  };
}

module.exports = {
  PREVIEW_CONSISTENCY_VERSION,
  summarizeGovernanceMutationPreviewConsistency
};
