'use strict';

const { sha256Canonical } = require('./Phase8OneShotNativeWriteExecutionGate');

function evaluateCm2094Phase8FrozenExecutionManifest(manifest = {}) {
  const blockers = [];
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2094',
    manifestPurpose: 'phase8_exact_one_shot_native_write_final_release_review_only',
    manifestDoesNotAuthorizeExecution: true,
    phase8NativeWriteAuthorizationGranted: false,
    nativeWriteMayExecuteBeforeFinalRelease: false,
    expectedFinalReleaseDecisionReference: 'CM-2094-ER-PHASE8-FINAL-EXECUTION-RELEASE-F1CF912C-B69CC85D',
    bootstrapReceiptReviewReference: 'CM-2093-ER-20260711-REGISTRY-ROOT-BOOTSTRAP-RECEIPT-PASS-BDD96776',
    bootstrapReceiptCommit: 'ff63ac21496f9898dace38bea1715ca322eceaf0',
    bootstrapReceiptTree: '0f1ff8f19ed43a856fa4e1940a33dca441429fc8',
    bootstrapReceiptJsonBlobOid: '14c8dbe2e46e0b5e6d889a7afdf930848537c4b7',
    bootstrapReceiptJsonSha256: 'bdd9677697296f43880bb8b634896758f79b58654f97903f3bd035b0de3b049b',
    bootstrapAuthorizationConsumed: true,
    bootstrapAuthorizationReplayAllowed: false,
    runtimeSourceCommit: '10b1ea49257c0aa2c26e50a2291142093589d938',
    runtimeSourceTree: 'f4273910483c096ff03d3c33f01c59187a2f6e2b',
    decisionReference: 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7',
    decisionSourceCommit: 'aecc431de4533e1c3a0e9f42948b217f835b4c7e',
    decisionPath: 'docs/near-model-memory-plan-pack/phase8_content_decision_cm2093.json',
    payloadSourceCommit: '10b1ea49257c0aa2c26e50a2291142093589d938',
    payloadPath: 'docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.json',
    payloadBlobOid: 'cde8e314a118e52e4beb9181401ee0bc7cc1dc68',
    payloadBytes: 638,
    payloadFileSha256: '3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245',
    payloadCanonicalSha256: '91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee',
    durableRecordBytes: 269,
    durableRecordSha256: '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828',
    contextCanonicalSha256: 'f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283',
    allowlistCanonicalSha256: 'b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20',
    registryRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
    expectedScopeFingerprint: '156df3fc92eac7b54c8ac17abc1b9c7c13e02da4cbbc5d42a18a3a5bb1317d66',
    rollbackPlanReference: 'cm2089-phase8-rollback-plan',
    maxNativeWrites: 1,
    maxVerifyOperations: 1,
    maxRollbackOrCompensationOperations: 0,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    existingMemoryModificationAllowed: false,
    realMemoryReadAllowed: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (manifest[field] !== expected) blockers.push(`manifest.${field}`);
  }
  const { manifestPayloadSha256, ...payload } = manifest;
  if (sha256Canonical(payload) !== manifestPayloadSha256) blockers.push('manifest.manifestPayloadSha256');
  for (const field of ['authorizationClaims', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'realMemoryReads']) {
    if (manifest.executionCounters?.[field] !== 0) blockers.push(`manifest.executionCounters.${field}`);
  }
  return {
    accepted: blockers.length === 0,
    blockers,
    finalReleaseReviewMayBegin: blockers.length === 0,
    phase8NativeWriteAuthorizationGranted: false,
    nativeWriteMayExecute: false,
    nonceMayBeClaimed: false
  };
}

module.exports = { evaluateCm2094Phase8FrozenExecutionManifest };
