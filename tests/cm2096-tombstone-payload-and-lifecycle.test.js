'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  deriveVcpMemoryIdRefFromDurableSha256,
  buildCm2096TombstonePayload,
  serializeCm2096DurableTombstoneMarker
} = require('../src/core/Cm2096TombstonePayloadSerializer');
const {
  expectedCm2096LifecycleBinding,
  projectCm2096MarkerAwareLifecycle,
  filterCm2096EffectiveCandidateRefs,
  buildCm2096MarkerAwareVerifyObservation,
  evaluateCm2096MarkerAwareProjectionShape
} = require('../src/core/Cm2096MarkerAwareLifecycleProjection');

test('CM-2096 derives the safe CM-2094 target reference from the frozen durable SHA', () => {
  assert.equal(deriveVcpMemoryIdRefFromDurableSha256('4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828'), 'vcp-kb-4f863f52455147c6');
  assert.throws(() => deriveVcpMemoryIdRefFromDurableSha256('bad'), /invalid_durable_record_sha256/);
});

test('CM-2096 serializes the exact real shim tombstone Markdown', () => {
  const payload = buildCm2096TombstonePayload();
  const marker = serializeCm2096DurableTombstoneMarker(payload);
  assert.equal(payload.memory_id, 'vcp-kb-4f863f52455147c6');
  assert.equal(marker.bytes, 507);
  assert.equal(marker.durableMarkerSha256, '27a5e58649908bbc4f835d891149d028e71dcc5042dcb13daaa597bd4286263a');
  assert.equal(marker.markerMemoryIdRef, 'vcp-kb-27a5e58649908bbc');
  assert.match(marker.markdown, /^---\nsource: codex-memory-governed-native-mcp-shim\n/);
  assert.match(marker.markdown, /## memory_id\n\nvcp-kb-4f863f52455147c6\n/);
  assert.match(marker.markdown, /## tombstone_reason\n\nsynthetic_proof_record_rollback_drill\n$/);
});

test('CM-2096 serializer rejects any payload drift before runtime', () => {
  const payload = buildCm2096TombstonePayload();
  for (const drift of [
    { memory_id: 'vcp-kb-other' },
    { tombstone_reason: 'other' },
    { extra: true }
  ]) assert.throws(() => serializeCm2096DurableTombstoneMarker({ ...payload, ...drift }), /binding_mismatch/);
});

test('CM-2096 marker-aware projection shape requires exact suppression evidence but is not current proof', () => {
  const expected = expectedCm2096LifecycleBinding();
  const observation = {
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
  const result = evaluateCm2096MarkerAwareProjectionShape(observation);
  assert.equal(result.shapeAccepted, true, result.blockers.join(', '));
  assert.equal(result.acceptedAsRollbackEvidenceNow, false);
  assert.equal(result.rollbackDrillPassed, false);
  for (const drift of [
    { governedRetrievalEffectiveTargetCount: 1 },
    { originalRecordBytesUnchanged: false },
    { rawMemoryReturned: true },
    { retryPerformed: true },
    { markerReceiptBindingMatched: false }
  ]) assert.equal(evaluateCm2096MarkerAwareProjectionShape({ ...observation, ...drift }).shapeAccepted, false);
});

test('CM-2096 lifecycle layer derives tombstoned status from exact selected-field record and marker projections', () => {
  const expected = expectedCm2096LifecycleBinding();
  const targetRecordProjection = {
    memoryIdRef: expected.targetMemoryIdRef,
    durableBytes: expected.targetRecordBytes,
    durableSha256: expected.targetRecordSha256,
    rawContentIncluded: false
  };
  const tombstoneMarkerProjection = {
    toolName: 'tombstone_memory',
    targetMemoryIdRef: expected.targetMemoryIdRef,
    markerMemoryIdRef: expected.markerMemoryIdRef,
    durableBytes: expected.durableMarkerBytes,
    durableSha256: expected.durableMarkerSha256,
    receiptBindingMatched: true,
    mutationMarkerOnly: true,
    rawContentIncluded: false
  };
  const lifecycle = projectCm2096MarkerAwareLifecycle({ targetRecordProjection, tombstoneMarkerProjection });
  assert.equal(lifecycle.accepted, true, lifecycle.blockers.join(', '));
  assert.equal(lifecycle.effectiveLifecycleStatus, 'tombstoned');
  assert.equal(lifecycle.effectiveMemoryEligible, false);
  assert.deepEqual(filterCm2096EffectiveCandidateRefs([expected.targetMemoryIdRef, 'vcp-kb-aaaaaaaaaaaaaaaa'], lifecycle), ['vcp-kb-aaaaaaaaaaaaaaaa']);
  const built = buildCm2096MarkerAwareVerifyObservation({
    targetRecordProjection,
    tombstoneMarkerProjection,
    candidateMemoryIdRefs: [expected.targetMemoryIdRef, 'vcp-kb-aaaaaaaaaaaaaaaa']
  });
  assert.equal(built.accepted, true);
  assert.equal(evaluateCm2096MarkerAwareProjectionShape(built.observation).shapeAccepted, true);
});

test('CM-2096 lifecycle layer rejects unrelated markers and unverified filtering', () => {
  const expected = expectedCm2096LifecycleBinding();
  const target = { memoryIdRef: expected.targetMemoryIdRef, durableBytes: 269, durableSha256: expected.targetRecordSha256, rawContentIncluded: false };
  const marker = { toolName: 'tombstone_memory', targetMemoryIdRef: 'vcp-kb-bbbbbbbbbbbbbbbb', markerMemoryIdRef: expected.markerMemoryIdRef, durableBytes: 507, durableSha256: expected.durableMarkerSha256, receiptBindingMatched: true, mutationMarkerOnly: true, rawContentIncluded: false };
  const lifecycle = projectCm2096MarkerAwareLifecycle({ targetRecordProjection: target, tombstoneMarkerProjection: marker });
  assert.equal(lifecycle.accepted, false);
  assert.throws(() => filterCm2096EffectiveCandidateRefs([expected.targetMemoryIdRef], lifecycle), /not_verified/);
  assert.throws(() => filterCm2096EffectiveCandidateRefs(['raw candidate content'], { ...lifecycle, accepted: true, effectiveLifecycleStatus: 'tombstoned', effectiveMemoryEligible: false }), /invalid_selected_field/);
});
