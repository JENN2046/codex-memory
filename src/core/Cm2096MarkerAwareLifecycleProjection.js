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

module.exports = { VERIFY_SURFACE, expectedCm2096LifecycleBinding, evaluateCm2096MarkerAwareProjectionShape };
