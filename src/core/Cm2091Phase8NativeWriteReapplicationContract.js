'use strict';

const { createRecordMarkdown } = require('./GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { sha256, sha256Canonical } = require('./Phase8OneShotNativeWriteExecutionGate');

const CONTRACT_NAME = 'Cm2091Phase8NativeWriteReapplicationContract';

function evaluateCm2091Phase8NativeWriteReapplication({ request, context, allowlist, payload } = {}) {
  const blockers = [];
  if (!request || !context || !allowlist || !payload) return failure(['missing_input']);
  for (const [field, expected] of Object.entries({schemaVersion: 1, taskId: 'CM-2091', priorDecisionReference: 'CM-2089-ER-20260711-FAIL-CLOSED-EXECUTION-BINDING-INCOMPLETE', phase8NativeWriteAuthorizationGranted: false, runtimeSourceCommit: '3ce0cc0fd842403de9aaf13d82c266a528d879d8', runtimeSourceTree: '0629b01a39d3ac66876b181829a0d623636f528c', payloadSourceCommit: '3ce0cc0fd842403de9aaf13d82c266a528d879d8', payloadBlobOid: 'cde8e314a118e52e4beb9181401ee0bc7cc1dc68', payloadBytes: 638, payloadFileSha256: '3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245', payloadCanonicalSha256: '91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee', contextCanonicalSha256: 'fc9deec9505fbadb52d76573434495358a65319b676dfa14e695b57a6884ceac', allowlistCanonicalSha256: '4a36b22c27c28e952ce1598da0f86025e1d561e624a404f1b91c7d3b8281cf0b', durableRecordBytes: 269, durableRecordSha256: '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828', toolName: 'record_memory', exactApprovalAction: 'live_bridge_record_memory_proof', expiresAt: '2026-07-12T18:00:00+08:00', nonce: 'cm2091-phase8-record-memory-proof-001', receiptId: 'cm2091-phase8-native-write-receipt-001', authorizationUseCount: 1, maxNativeWrites: 1, maxVerifyOperations: 1, maxRollbackOrCompensationOperations: 0, callerSuppliedAcceptedTrueAllowed: false, localFallbackWriteAllowed: false, automaticRetryAllowed: false, automaticRollbackAllowed: false, existingMemoryModificationAllowed: false, rawPrivateMemoryAccessAllowed: false})) if (request[field] !== expected) blockers.push(`request.${field}`);
  if (sha256Canonical(context) !== request.contextCanonicalSha256) blockers.push('context.canonicalSha256');
  if (sha256Canonical(allowlist) !== request.allowlistCanonicalSha256) blockers.push('allowlist.canonicalSha256');
  if (sha256Canonical(payload) !== request.payloadCanonicalSha256) blockers.push('payload.canonicalSha256');
  const durable = Buffer.from(createRecordMarkdown(payload), 'utf8');
  if (durable.length !== request.durableRecordBytes || sha256(durable) !== request.durableRecordSha256) blockers.push('durableRecord.binding');
  for (const field of ['authorizationClaims', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'realMemoryReads']) if (request.executionCounters?.[field] !== 0) blockers.push(`executionCounters.${field}`);
  return blockers.length ? failure(blockers) : {accepted: true, contractName: CONTRACT_NAME, blockers: [], reapplicationPrepared: true, oneShotMachineEnforced: true, authorizationGranted: false, nativeWriteExecuted: false, verifyExecuted: false, rollbackOrCompensationExecuted: false, nextGate: 'independent_phase8_exact_native_write_reapplication_review'};
}

function failure(blockers) {
  return {accepted: false, contractName: CONTRACT_NAME, blockers, reapplicationPrepared: false, oneShotMachineEnforced: false, authorizationGranted: false, nativeWriteExecuted: false, verifyExecuted: false, rollbackOrCompensationExecuted: false};
}

module.exports = { CONTRACT_NAME, evaluateCm2091Phase8NativeWriteReapplication };
