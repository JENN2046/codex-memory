'use strict';

const { createRecordMarkdown } = require('./GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { sha256, sha256Canonical } = require('./Phase8OneShotNativeWriteExecutionGate');

function evaluateCm2092Phase8AuthorizationDecisionIssuanceRequest({ request, contextBytes, allowlistBytes, payloadBytes } = {}) {
  const blockers = [];
  if (!request || !Buffer.isBuffer(contextBytes) || !Buffer.isBuffer(allowlistBytes) || !Buffer.isBuffer(payloadBytes)) {
    return { accepted: false, blockers: ['missing_input'] };
  }
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2092',
    priorDecisionReference: 'CM-2091-ER-20260711-FAIL-CLOSED-ONE-SHOT-AND-VERIFY-CORRELATION-INCOMPLETE',
    externalReviewPassed: true,
    externalReviewEvidenceBundleAppliedToCompletionAudit: true,
    tagApprovalPacketPassed: true,
    phase8NativeWriteAuthorizationGranted: false,
    authorizationContentIssuanceRequested: true,
    nativeWriteMayExecuteFromThisRequest: false,
    finalExecutionReleaseReviewRequired: true,
    runtimeSourceCommit: 'e1785994f599f2ef4c4bcf891bbf1e2b34f0630c',
    runtimeSourceTree: 'c6205686a8e9bbc4171eaea516567336ad70cf42',
    payloadSourceCommit: 'e1785994f599f2ef4c4bcf891bbf1e2b34f0630c',
    payloadBlobOid: 'cde8e314a118e52e4beb9181401ee0bc7cc1dc68',
    payloadBytes: 638,
    payloadFileSha256: '3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245',
    payloadCanonicalSha256: '91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee',
    contextBytes: 1912,
    contextFileSha256: '36627db68b06be364dd9d21399b4913c671bc8268ed7bc103147528c3e5428e9',
    contextCanonicalSha256: '75832f193a1a414ccabcd508fa8dc7d3f8d5afb3f7360184734c21d2647229fc',
    allowlistBytes: 768,
    allowlistFileSha256: '548802ab8ff9344fbd3578f1562543fb17254f2a58964b0dd580a590ccc2da78',
    allowlistCanonicalSha256: 'b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20',
    durableRecordBytes: 269,
    durableRecordSha256: '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828',
    toolName: 'record_memory',
    exactApprovalAction: 'live_bridge_record_memory_proof',
    decisionToken: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT',
    expiresAt: '2026-07-14T18:00:00+08:00',
    nonce: 'cm2092-phase8-record-memory-proof-001',
    receiptId: 'cm2092-phase8-native-write-receipt-001',
    authorizationUseCount: 1,
    authorizationRegistryReference: 'cm2092-phase8-one-shot-registry',
    maxNativeWrites: 1,
    maxVerifyOperations: 1,
    maxRollbackOrCompensationOperations: 0,
    callerSuppliedAcceptedTrueAllowed: false,
    callbackInjectionAllowed: false,
    registryPathInjectionAllowed: false,
    localFallbackWriteAllowed: false,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    existingMemoryModificationAllowed: false,
    rawPrivateMemoryAccessAllowed: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (request[field] !== expected) blockers.push(`request.${field}`);
  }
  let context;
  let allowlist;
  let payload;
  try { context = JSON.parse(contextBytes); } catch { blockers.push('context.invalidJson'); }
  try { allowlist = JSON.parse(allowlistBytes); } catch { blockers.push('allowlist.invalidJson'); }
  try { payload = JSON.parse(payloadBytes); } catch { blockers.push('payload.invalidJson'); }
  if (contextBytes.length !== request.contextBytes || sha256(contextBytes) !== request.contextFileSha256 || (context && sha256Canonical(context) !== request.contextCanonicalSha256)) blockers.push('context.binding');
  if (allowlistBytes.length !== request.allowlistBytes || sha256(allowlistBytes) !== request.allowlistFileSha256 || (allowlist && sha256Canonical(allowlist) !== request.allowlistCanonicalSha256)) blockers.push('allowlist.binding');
  if (payloadBytes.length !== request.payloadBytes || sha256(payloadBytes) !== request.payloadFileSha256 || (payload && sha256Canonical(payload) !== request.payloadCanonicalSha256)) blockers.push('payload.binding');
  if (payload) {
    const durableBytes = Buffer.from(createRecordMarkdown(payload));
    if (durableBytes.length !== request.durableRecordBytes || sha256(durableBytes) !== request.durableRecordSha256) blockers.push('durableRecord.binding');
  }
  const counters = request.executionCounters || {};
  for (const field of ['authorizationClaims', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'realMemoryReads']) {
    if (counters[field] !== 0) blockers.push(`executionCounters.${field}`);
  }
  return {
    accepted: blockers.length === 0,
    blockers,
    status: blockers.length === 0 ? 'phase8_authorization_decision_content_ready_for_independent_issuance_review' : 'blocked',
    phase8NativeWriteAuthorizationGranted: false,
    nativeWriteMayExecute: false,
    finalExecutionReleaseReviewRequired: true
  };
}

module.exports = { evaluateCm2092Phase8AuthorizationDecisionIssuanceRequest };
