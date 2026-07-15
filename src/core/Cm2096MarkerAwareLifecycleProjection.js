'use strict';

const {
  CM2094_RECEIPT_COMMIT,
  CM2094_RECORD_BYTES,
  CM2094_RECORD_SHA256,
  serializeCm2096DurableTombstoneMarker
} = require('./Cm2096TombstonePayloadSerializer');

const VERIFY_SURFACE = 'cm2096_marker_aware_effective_visibility_projection';

function expectedCm2096LifecycleBinding() {
  const marker = serializeCm2096DurableTombstoneMarker();
  return Object.freeze({
    verifySurface: VERIFY_SURFACE,
    targetMemoryIdRef: marker.targetMemoryIdRef,
    targetReceiptCommit: CM2094_RECEIPT_COMMIT,
    targetRecordBytes: CM2094_RECORD_BYTES,
    targetRecordSha256: CM2094_RECORD_SHA256,
    durableMarkerBytes: marker.bytes,
    durableMarkerSha256: marker.durableMarkerSha256,
    markerMemoryIdRef: marker.markerMemoryIdRef
  });
}

function projectCm2096MarkerAwareLifecycle({ targetRecordProjection, tombstoneMarkerProjection } = {}) {
  const expected = expectedCm2096LifecycleBinding();
  const blockers = [];
  if (targetRecordProjection?.memoryIdRef !== expected.targetMemoryIdRef ||
      targetRecordProjection?.durableBytes !== expected.targetRecordBytes ||
      targetRecordProjection?.durableSha256 !== expected.targetRecordSha256 ||
      targetRecordProjection?.rawContentIncluded !== false) blockers.push('targetRecordProjection');
  if (tombstoneMarkerProjection?.toolName !== 'tombstone_memory' ||
      tombstoneMarkerProjection?.targetMemoryIdRef !== expected.targetMemoryIdRef ||
      tombstoneMarkerProjection?.markerMemoryIdRef !== expected.markerMemoryIdRef ||
      tombstoneMarkerProjection?.durableBytes !== expected.durableMarkerBytes ||
      tombstoneMarkerProjection?.durableSha256 !== expected.durableMarkerSha256 ||
      tombstoneMarkerProjection?.receiptBindingMatched !== true ||
      tombstoneMarkerProjection?.mutationMarkerOnly !== true ||
      tombstoneMarkerProjection?.rawContentIncluded !== false) blockers.push('tombstoneMarkerProjection');
  return Object.freeze({
    accepted: blockers.length === 0,
    blockers,
    targetMemoryIdRef: expected.targetMemoryIdRef,
    effectiveLifecycleStatus: blockers.length === 0 ? 'tombstoned' : 'unverified',
    originalRecordBytesUnchanged: blockers.length === 0,
    effectiveMemoryEligible: blockers.length !== 0,
    selectedFieldsOnly: true,
    rawMemoryReturned: false,
    rawAuditReturned: false
  });
}

function filterCm2096EffectiveCandidateRefs(candidateMemoryIdRefs, lifecycleProjection = {}) {
  if (!Array.isArray(candidateMemoryIdRefs) || candidateMemoryIdRefs.some(ref => typeof ref !== 'string' || !/^vcp-kb-[a-f0-9]{16}$/.test(ref))) {
    throw new Error('invalid_selected_field_candidate_refs');
  }
  if (lifecycleProjection.accepted !== true || lifecycleProjection.effectiveLifecycleStatus !== 'tombstoned' || lifecycleProjection.effectiveMemoryEligible !== false) {
    throw new Error('cm2096_lifecycle_projection_not_verified');
  }
  return Object.freeze(candidateMemoryIdRefs.filter(ref => ref !== lifecycleProjection.targetMemoryIdRef));
}

function buildCm2096MarkerAwareVerifyObservation({ targetRecordProjection, tombstoneMarkerProjection, candidateMemoryIdRefs } = {}) {
  const expected = expectedCm2096LifecycleBinding();
  const lifecycle = projectCm2096MarkerAwareLifecycle({ targetRecordProjection, tombstoneMarkerProjection });
  if (lifecycle.accepted !== true) return { accepted: false, blockers: lifecycle.blockers };
  const effective = filterCm2096EffectiveCandidateRefs(candidateMemoryIdRefs, lifecycle);
  return {
    accepted: true,
    observation: {
      schemaVersion: 1,
      verifySurface: expected.verifySurface,
      targetMemoryIdRef: expected.targetMemoryIdRef,
      targetReceiptCommit: expected.targetReceiptCommit,
      targetRecordBytes: expected.targetRecordBytes,
      targetRecordSha256: expected.targetRecordSha256,
      durableMarkerBytes: expected.durableMarkerBytes,
      durableMarkerSha256: expected.durableMarkerSha256,
      markerMemoryIdRef: expected.markerMemoryIdRef,
      markerReceiptBindingMatched: true,
      originalRecordBytesUnchanged: lifecycle.originalRecordBytesUnchanged,
      originalRecordObservedBytes: expected.targetRecordBytes,
      originalRecordObservedSha256: expected.targetRecordSha256,
      effectiveLifecycleStatus: lifecycle.effectiveLifecycleStatus,
      governedRetrievalEffectiveTargetCount: effective.filter(ref => ref === expected.targetMemoryIdRef).length,
      selectedFieldsOnly: true,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      otherRealMemoryRead: false,
      otherRealMemoryModified: false,
      localFallbackUsed: false,
      supersedePerformed: false,
      compensationPerformed: false,
      retryPerformed: false
    }
  };
}

function evaluateCm2096MarkerAwareProjectionShape(observation = {}) {
  const expected = expectedCm2096LifecycleBinding();
  const blockers = [];
  const exact = {
    schemaVersion: 1,
    verifySurface: VERIFY_SURFACE,
    targetMemoryIdRef: expected.targetMemoryIdRef,
    targetReceiptCommit: expected.targetReceiptCommit,
    targetRecordBytes: expected.targetRecordBytes,
    targetRecordSha256: expected.targetRecordSha256,
    durableMarkerBytes: expected.durableMarkerBytes,
    durableMarkerSha256: expected.durableMarkerSha256,
    markerMemoryIdRef: expected.markerMemoryIdRef,
    markerReceiptBindingMatched: true,
    originalRecordBytesUnchanged: true,
    originalRecordObservedBytes: expected.targetRecordBytes,
    originalRecordObservedSha256: expected.targetRecordSha256,
    effectiveLifecycleStatus: 'tombstoned',
    governedRetrievalEffectiveTargetCount: 0,
    selectedFieldsOnly: true,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    localFallbackUsed: false,
    supersedePerformed: false,
    compensationPerformed: false,
    retryPerformed: false
  };
  for (const [field, value] of Object.entries(exact)) if (observation[field] !== value) blockers.push(`observation.${field}`);
  for (const field of Object.keys(observation)) if (!Object.hasOwn(exact, field)) blockers.push(`observation.${field}`);
  return {
    shapeAccepted: blockers.length === 0,
    blockers,
    acceptedAsRollbackEvidenceNow: false,
    executionAuthorized: false,
    rollbackDrillPassed: false
  };
}

module.exports = {
  VERIFY_SURFACE,
  expectedCm2096LifecycleBinding,
  projectCm2096MarkerAwareLifecycle,
  filterCm2096EffectiveCandidateRefs,
  buildCm2096MarkerAwareVerifyObservation,
  evaluateCm2096MarkerAwareProjectionShape
};
