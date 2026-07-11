'use strict';

const crypto = require('node:crypto');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function markerBinding(marker) {
  const bytes = Buffer.from(JSON.stringify(canonicalize(marker)), 'utf8');
  return { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

function evaluateCm2096RollbackSemanticPacket(packet = {}) {
  const blockers = [];
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2096',
    routeDecisionReference: 'CM-2096-ER-20260711-ROLLBACK-ROUTE-PASS-NO-EXECUTION-BB6EBB76',
    packetType: 'rollback_semantic_and_execution_packet_non_executing',
    action: 'tombstone_memory',
    exactApprovalAction: 'live_bridge_tombstone_memory_proof',
    targetKind: 'cm2094_synthetic_proof_record_only'
  };
  for (const [field, expected] of Object.entries(exact)) if (packet[field] !== expected) blockers.push(`packet.${field}`);
  if (packet.targetBinding?.executionReceiptCommit !== '91c20ce4c9b85966ef2da6b7c37563ebbce0f365') blockers.push('packet.targetBinding.executionReceiptCommit');
  if (packet.targetBinding?.durableRecordBytes !== 269) blockers.push('packet.targetBinding.durableRecordBytes');
  if (packet.targetBinding?.durableRecordSha256 !== '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828') blockers.push('packet.targetBinding.durableRecordSha256');
  if (packet.targetBinding?.rawPathDisclosed !== false) blockers.push('packet.targetBinding.rawPathDisclosed');
  const binding = markerBinding(packet.markerCanonicalObject);
  if (binding.bytes !== 301 || packet.markerCanonicalBytes !== binding.bytes) blockers.push('packet.markerCanonicalBytes');
  if (binding.sha256 !== '0407cbcfffce19c8b015f1d18c10735ebe3c45b348e62ec8b1e6e76de509e467' || packet.markerCanonicalSha256 !== binding.sha256) blockers.push('packet.markerCanonicalSha256');
  const semantics = packet.rollbackSemantics || {};
  if (semantics.model !== 'append_only_logical_tombstone' || semantics.appendOnly !== true || semantics.originalRecordPreserved !== true || semantics.tombstoneMarkerRequired !== true || semantics.effectiveVisibilitySuppressionRequired !== true || semantics.physicalDeleteForbidden !== true || semantics.inPlaceOverwriteForbidden !== true || semantics.supersedeSelected !== false) blockers.push('packet.rollbackSemantics');
  const verify = packet.markerAwareVerifyDesign || {};
  if (verify.surface !== 'cm2096_marker_aware_effective_visibility_projection' || verify.implementationFrozen !== false || verify.selectedFieldsOnly !== true || verify.rawMemoryReturned !== false || verify.rawAuditReturned !== false) blockers.push('packet.markerAwareVerifyDesign');
  const outcomes = verify.requiredOutcomes || {};
  if (outcomes.markerPersistedExactHash !== true || outcomes.originalRecordBytesUnchanged !== true || outcomes.effectiveLifecycleStatus !== 'tombstoned' || outcomes.governedRetrievalReturnsTargetAsEffectiveMemory !== false || outcomes.otherRealMemoryRead !== false || outcomes.otherRealMemoryModified !== false) blockers.push('packet.markerAwareVerifyDesign.requiredOutcomes');
  for (const field of ['executionAuthorized', 'tombstoneExecutionAuthorized', 'verifyAuthorized', 'rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8Completed']) if (packet[field] !== false) blockers.push(`packet.${field}`);
  for (const field of ['nativeActionCount', 'verifyOperationCount', 'realMemoryReadCount', 'existingRealMemoryModificationCount']) if (packet[field] !== 0) blockers.push(`packet.${field}`);
  return { accepted: blockers.length === 0, blockers, semanticPacketPrepared: blockers.length === 0, executionAuthorized: false, rollbackDrillPassed: false };
}

module.exports = { canonicalize, markerBinding, evaluateCm2096RollbackSemanticPacket };
