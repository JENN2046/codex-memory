'use strict';

const crypto = require('node:crypto');
const { buildCm2096TombstonePayload, serializeCm2096DurableTombstoneMarker } = require('./Cm2096TombstonePayloadSerializer');
const { expectedCm2096LifecycleBinding } = require('./Cm2096MarkerAwareLifecycleProjection');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function canonicalBinding(value) {
  const bytes = Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
  return { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

function prepareCm2096FrozenRollbackExecution(packet = {}, runtimeFacts = {}) {
  const marker = serializeCm2096DurableTombstoneMarker();
  const lifecycle = expectedCm2096LifecycleBinding();
  const blockers = [];
  if (packet.schemaVersion !== 2 || packet.taskId !== 'CM-2096') blockers.push('packet.identity');
  if (packet.packetType !== 'frozen_rollback_execution_packet_non_executing') blockers.push('packet.packetType');
  if (packet.routeDecisionReference !== 'CM-2096-ER-20260711-ROLLBACK-ROUTE-PASS-NO-EXECUTION-BB6EBB76') blockers.push('packet.routeDecisionReference');
  if (packet.semanticDecisionReference !== 'CM-2096-ER-20260711-SEMANTIC-PACKET-PASS-51F21F60-NO-EXECUTION') blockers.push('packet.semanticDecisionReference');
  if (packet.reviewedSemanticPacketCommit !== 'ffc07c504b388c06b816f021752e145c3a753a4f' || packet.reviewedSemanticPacketSha256 !== '51f21f60a1d0b2b9f6dc5cd759b1776f5d42f32266f37504047db1ad06860fdb') blockers.push('packet.reviewedSemanticPacket');
  if (packet.action !== 'tombstone_memory' || packet.exactApprovalAction !== 'live_bridge_tombstone_memory_proof') blockers.push('packet.action');
  if (packet.targetMemoryIdRef !== marker.targetMemoryIdRef || packet.targetRecordSha256 !== marker.targetRecordSha256) blockers.push('packet.target');
  const derivation = packet.targetReferenceDerivation || {};
  if (derivation.algorithm !== 'vcp-kb- + sha256(durable_markdown).slice(0,16)' || derivation.sourceRuntimeCommit !== '10b1ea49257c0aa2c26e50a2291142093589d938' || derivation.executionReceiptCommit !== marker.targetReceiptCommit || derivation.durableRecordBytes !== marker.targetRecordBytes || derivation.durableRecordSha256 !== marker.targetRecordSha256 || derivation.independentlyRecomputable !== true || derivation.rawPathDisclosed !== false) blockers.push('packet.targetReferenceDerivation');
  const payloadBinding = canonicalBinding(packet.tombstonePayload);
  if (JSON.stringify(packet.tombstonePayload) !== JSON.stringify(buildCm2096TombstonePayload()) || payloadBinding.bytes !== 331 || packet.tombstonePayloadCanonicalBytes !== payloadBinding.bytes || payloadBinding.sha256 !== '661e7eaf21cee1d31ebbaf81188fb65d4a1a0f5116ebd114aa37ca15a1251166' || packet.tombstonePayloadCanonicalSha256 !== payloadBinding.sha256) blockers.push('packet.tombstonePayload');
  if (packet.durableMarkerBytes !== marker.bytes || packet.durableMarkerSha256 !== marker.durableMarkerSha256) blockers.push('packet.marker');
  if (packet.expectedMarkerMemoryIdRef !== marker.markerMemoryIdRef || packet.durableMarkerSerializer?.usesActualShimCreateMutationMarkdown !== true || packet.durableMarkerSerializer?.mutationTool !== 'tombstone_memory') blockers.push('packet.markerSerializer');
  if (packet.markerAwareVerifySurface !== lifecycle.verifySurface) blockers.push('packet.verifySurface');
  const outcomes = packet.requiredVerifyOutcomes || {};
  if (outcomes.markerReceiptBindingMatched !== true || outcomes.originalRecordBytesUnchanged !== true || outcomes.originalRecordObservedBytes !== marker.targetRecordBytes || outcomes.originalRecordObservedSha256 !== marker.targetRecordSha256 || outcomes.effectiveLifecycleStatus !== 'tombstoned' || outcomes.governedRetrievalEffectiveTargetCount !== 0 || outcomes.selectedFieldsOnly !== true || outcomes.rawMemoryReturned !== false || outcomes.rawAuditReturned !== false || outcomes.otherRealMemoryRead !== false || outcomes.otherRealMemoryModified !== false || outcomes.localFallbackUsed !== false) blockers.push('packet.requiredVerifyOutcomes');
  if (packet.executionAuthorized !== false || packet.tombstoneExecutionAuthorized !== false || packet.verifyAuthorized !== false) blockers.push('packet.authority');
  if (packet.authorizationDecisionPresent !== false || packet.authorizationUseCount !== 1 || packet.nonce !== 'cm2096-tombstone-drill-001' || packet.receiptId !== 'cm2096-tombstone-drill-receipt-001' || packet.registryReference !== 'cm2096-isolated-tombstone-drill-registry-001') blockers.push('packet.futureOneShotBinding');
  if (packet.maxTombstoneWrites !== 1 || packet.maxVerifyOperations !== 1 || packet.maxRetries !== 0 || packet.maxSupersedeOperations !== 0 || packet.maxCompensationOperations !== 0) blockers.push('packet.limits');
  if (packet.nativeActionCount !== 0 || packet.verifyOperationCount !== 0 || packet.rollbackDrillPassed !== false || packet.failureRecoveryProofPassed !== false || packet.phase8Completed !== false || packet.fullPlanPackCompleted !== false || packet.readinessClaimed !== false) blockers.push('packet.currentState');
  if (runtimeFacts.clean !== true || runtimeFacts.commit !== packet.implementationCommit || runtimeFacts.tree !== packet.implementationTree) blockers.push('runtime.binding');
  return {
    packetAccepted: blockers.length === 0,
    blockers,
    readyForFutureAuthorizationReview: blockers.length === 0,
    executionAuthorized: false,
    tombstoneMemoryMayExecute: false,
    verifyMayExecute: false,
    nativeActionCount: 0,
    verifyOperationCount: 0,
    rollbackDrillPassed: false
  };
}

function executeCm2096Rollback() {
  throw new Error('cm2096_tombstone_execution_not_authorized');
}

module.exports = { prepareCm2096FrozenRollbackExecution, executeCm2096Rollback };
