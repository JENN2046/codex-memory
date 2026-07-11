'use strict';

const { serializeCm2096DurableTombstoneMarker } = require('./Cm2096TombstonePayloadSerializer');
const { expectedCm2096LifecycleBinding } = require('./Cm2096MarkerAwareLifecycleProjection');

function prepareCm2096FrozenRollbackExecution(packet = {}, runtimeFacts = {}) {
  const marker = serializeCm2096DurableTombstoneMarker();
  const lifecycle = expectedCm2096LifecycleBinding();
  const blockers = [];
  if (packet.schemaVersion !== 2 || packet.taskId !== 'CM-2096') blockers.push('packet.identity');
  if (packet.semanticDecisionReference !== 'CM-2096-ER-20260711-SEMANTIC-PACKET-PASS-51F21F60-NO-EXECUTION') blockers.push('packet.semanticDecisionReference');
  if (packet.action !== 'tombstone_memory' || packet.exactApprovalAction !== 'live_bridge_tombstone_memory_proof') blockers.push('packet.action');
  if (packet.targetMemoryIdRef !== marker.targetMemoryIdRef || packet.targetRecordSha256 !== marker.targetRecordSha256) blockers.push('packet.target');
  if (packet.durableMarkerBytes !== marker.bytes || packet.durableMarkerSha256 !== marker.durableMarkerSha256) blockers.push('packet.marker');
  if (packet.markerAwareVerifySurface !== lifecycle.verifySurface) blockers.push('packet.verifySurface');
  if (packet.executionAuthorized !== false || packet.tombstoneExecutionAuthorized !== false || packet.verifyAuthorized !== false) blockers.push('packet.authority');
  if (packet.maxTombstoneWrites !== 1 || packet.maxVerifyOperations !== 1 || packet.maxRetries !== 0 || packet.maxSupersedeOperations !== 0 || packet.maxCompensationOperations !== 0) blockers.push('packet.limits');
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
