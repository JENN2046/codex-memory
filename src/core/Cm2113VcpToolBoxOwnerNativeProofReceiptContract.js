'use strict';

function hasExactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

const IMPLEMENTATION_FIELDS = Object.freeze(['commit', 'tree']);
const GIT_IDENTITY_FIELDS = Object.freeze(['sourceCommit', 'blobOid', 'bytes', 'sha256']);
const EXECUTION_RECEIPT_FIELDS = Object.freeze(['finalState', 'bytes', 'sha256']);
const TRANSPORT_RECEIPT_FIELDS = Object.freeze(['bytes', 'sha256']);
const OWNER_RUNTIME_FIELDS = Object.freeze([
  'memoryIntelligenceOwner', 'component', 'sourceCommit', 'sourceTree', 'communication',
  'pluginBlobMatched', 'manifestBlobMatched', 'dependencyBindingMatched', 'providerCalled'
]);
const TRANSPORT_FIELDS = Object.freeze([
  'outer', 'outerProcessBoundary', 'contentLengthFramesSent', 'contentLengthFramesReceived',
  'exposedToolNames', 'recordMemoryCallCount', 'directApplicationCallByClient', 'inner',
  'innerAuthorizationMatched', 'ownerRuntime', 'endpointDisclosed', 'tokenMaterialDisclosed'
]);
const STORE_FIELDS = Object.freeze([
  'reference', 'instanceId', 'identitySha256', 'identityPresentBeforeFirstNativeWrite',
  'identityMatchedBeforeAndAfter', 'syntheticOnly', 'recordCount', 'durableBytes',
  'durableSha256', 'rawMemoryReturned', 'rawPathDisclosed'
]);
const AUTHORIZATION_FIELDS = Object.freeze([
  'attempt', 'useCount', 'consumed', 'replayAllowed', 'nativeWriteCalls', 'verifyOperations',
  'verifyAccepted', 'localFallbackUsed', 'automaticRetryPerformed', 'rollbackOrCompensationPerformed'
]);
const PRIOR_ATTEMPT_FIELDS = Object.freeze([
  'attempt', 'finalState', 'authorizationConsumed', 'authorizationReplayAllowed',
  'durableRecordCountObserved', 'preserved'
]);

function evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(receipt = {}) {
  const blockers = [];
  if (!hasExactKeys(receipt, [
    'schemaVersion', 'taskId', 'receiptType', 'result', 'implementation',
    'executionPacketGitIdentity', 'contentDecisionGitIdentity', 'finalReleaseDecisionGitIdentity',
    'bootstrapReceiptGitIdentity', 'executionReceipt', 'transportReceipt', 'ownerRuntime',
    'transport', 'store', 'authorization', 'priorAttempt', 'completionEvidence', 'nonClaims',
    'phase8Completed', 'completionAuditReapplicationRequired'
  ])) blockers.push('receipt.fields');
  if (receipt.schemaVersion !== 1 || receipt.taskId !== 'CM-2113' || receipt.receiptType !== 'vcptoolbox_owner_native_proof_receipt' || receipt.result !== 'PASS') blockers.push('receipt.identity');
  if (!hasExactKeys(receipt.implementation, IMPLEMENTATION_FIELDS) ||
      !/^[a-f0-9]{40}$/.test(receipt.implementation?.commit || '') ||
      !/^[a-f0-9]{40}$/.test(receipt.implementation?.tree || '')) blockers.push('receipt.implementation');
  for (const field of ['executionPacketGitIdentity', 'contentDecisionGitIdentity', 'finalReleaseDecisionGitIdentity', 'bootstrapReceiptGitIdentity']) {
    const identity = receipt[field];
    if (!hasExactKeys(identity, GIT_IDENTITY_FIELDS) ||
        !/^[a-f0-9]{40}$/.test(identity?.sourceCommit || '') || !/^[a-f0-9]{40}$/.test(identity?.blobOid || '') ||
        !Number.isInteger(identity?.bytes) || identity.bytes <= 0 ||
        !/^[a-f0-9]{64}$/.test(identity?.sha256 || '')) blockers.push(`receipt.${field}`);
  }
  if (!hasExactKeys(receipt.executionReceipt, EXECUTION_RECEIPT_FIELDS) || receipt.executionReceipt?.finalState !== 'CONSUMED_SUCCESS' || receipt.executionReceipt?.bytes !== 2160 || receipt.executionReceipt?.sha256 !== '805f93f5f414194e754c14064ee8fa3875b61c351ffff0b206dcf56c61ac3685') blockers.push('receipt.executionReceipt');
  if (!hasExactKeys(receipt.transportReceipt, TRANSPORT_RECEIPT_FIELDS) || receipt.transportReceipt?.bytes !== 1847 || receipt.transportReceipt?.sha256 !== '5d429bd9004b19df31e247e147394879aeb2362b78241bd9757c45e25ca39b58') blockers.push('receipt.transportReceipt');
  if (!hasExactKeys(receipt.ownerRuntime, OWNER_RUNTIME_FIELDS) || receipt.ownerRuntime?.memoryIntelligenceOwner !== 'VCPToolBox' || receipt.ownerRuntime?.component !== 'DailyNote' || receipt.ownerRuntime?.communication !== 'stdio' || receipt.ownerRuntime?.pluginBlobMatched !== true || receipt.ownerRuntime?.manifestBlobMatched !== true || receipt.ownerRuntime?.dependencyBindingMatched !== true || receipt.ownerRuntime?.providerCalled !== false) blockers.push('receipt.ownerRuntime');
  if (!hasExactKeys(receipt.transport, TRANSPORT_FIELDS) || receipt.transport?.outer !== 'stdio_mcp' || receipt.transport?.outerProcessBoundary !== true || receipt.transport?.contentLengthFramesSent !== 3 || receipt.transport?.contentLengthFramesReceived !== 3 || JSON.stringify(receipt.transport?.exposedToolNames) !== JSON.stringify(['record_memory']) || receipt.transport?.recordMemoryCallCount !== 1 || receipt.transport?.directApplicationCallByClient !== false || receipt.transport?.inner !== 'local_http_transport' || receipt.transport?.innerAuthorizationMatched !== true || receipt.transport?.ownerRuntime !== 'stdio' || receipt.transport?.endpointDisclosed !== false || receipt.transport?.tokenMaterialDisclosed !== false) blockers.push('receipt.transport');
  if (!hasExactKeys(receipt.store, STORE_FIELDS) || receipt.store?.identitySha256 !== '0294fc5c92dbcfc535057cf8c8e77901e5223c83b906b26dba8e29bf659cfaab' || receipt.store?.identityPresentBeforeFirstNativeWrite !== true || receipt.store?.identityMatchedBeforeAndAfter !== true || receipt.store?.syntheticOnly !== true || receipt.store?.recordCount !== 1 || receipt.store?.durableBytes !== 357 || receipt.store?.durableSha256 !== 'f8f845371e1eebf2dbce80e6bc0b86ed656f95712b409ac8fabc24a4cf393e50' || receipt.store?.rawMemoryReturned !== false || receipt.store?.rawPathDisclosed !== false) blockers.push('receipt.store');
  if (!hasExactKeys(receipt.authorization, AUTHORIZATION_FIELDS) || receipt.authorization?.attempt !== 2 || receipt.authorization?.useCount !== 1 || receipt.authorization?.consumed !== true || receipt.authorization?.replayAllowed !== false || receipt.authorization?.nativeWriteCalls !== 1 || receipt.authorization?.verifyOperations !== 1 || receipt.authorization?.verifyAccepted !== true || receipt.authorization?.localFallbackUsed !== false || receipt.authorization?.automaticRetryPerformed !== false || receipt.authorization?.rollbackOrCompensationPerformed !== false) blockers.push('receipt.authorization');
  if (!hasExactKeys(receipt.priorAttempt, PRIOR_ATTEMPT_FIELDS) || receipt.priorAttempt?.attempt !== 1 || receipt.priorAttempt?.finalState !== 'CONSUMED_AMBIGUOUS_POST_COMMIT' || receipt.priorAttempt?.authorizationConsumed !== true || receipt.priorAttempt?.authorizationReplayAllowed !== false || receipt.priorAttempt?.durableRecordCountObserved !== 0 || receipt.priorAttempt?.preserved !== true) blockers.push('receipt.priorAttempt');
  const completionEvidenceFields = ['vcpToolBoxOwnedRuntimeWritePassed', 'actualTransportBindingPassed', 'stableTargetStoreIdentityPassed'];
  if (!hasExactKeys(receipt.completionEvidence, completionEvidenceFields)) blockers.push('receipt.completionEvidence.fields');
  for (const field of completionEvidenceFields) if (receipt.completionEvidence?.[field] !== true) blockers.push(`receipt.completionEvidence.${field}`);
  const nonClaimFields = ['derivedIndexProofAccepted', 'productionProviderProofAccepted', 'productionReady', 'releaseReady', 'rcReady', 'completeV8', 'fullPlanPackCompleted', 'readinessClaimed'];
  if (JSON.stringify(Object.keys(receipt.nonClaims || {}).sort()) !== JSON.stringify([...nonClaimFields].sort())) blockers.push('receipt.nonClaims.fields');
  for (const field of nonClaimFields) if (receipt.nonClaims?.[field] !== false) blockers.push(`receipt.nonClaims.${field}`);
  if (receipt.phase8Completed !== false || receipt.completionAuditReapplicationRequired !== true) blockers.push('receipt.completionBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    vcpToolBoxOwnedRuntimeWritePassed: blockers.length === 0,
    actualTransportBindingPassed: blockers.length === 0,
    stableTargetStoreIdentityPassed: blockers.length === 0,
    phase8Completed: false,
    additionalNativeWriteAuthorized: false
  };
}

module.exports = { evaluateCm2113VcpToolBoxOwnerNativeProofReceipt };
