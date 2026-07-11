'use strict';

function evaluateCm2093Phase8RegistryRootBootstrapReceipt(receipt = {}) {
  const blockers = [];
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2093',
    result: 'accepted',
    decisionReference: 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7',
    decisionSourceCommit: 'aecc431de4533e1c3a0e9f42948b217f835b4c7e',
    decisionBlobOid: 'bc251e7a34152b41724f3c098fee12baefe0f787',
    decisionPayloadSha256: '9fb37b29e18ee65225e8e2fcb9628260ba93afb5ced6c195388e390570daa5dc',
    registryRootReference: 'codex-memory-phase8-governance-root',
    registryRootIdentityBytes: 216,
    registryRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
    registryRootIdentityExists: true,
    registryRootReinitializationAllowed: false,
    registryRootReplacementAllowed: false,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    bootstrapReceiptCreated: true,
    nativeExecutionReceiptCreated: false,
    nonceFileCount: 0,
    receiptFileCount: 0,
    claimFileCount: 0,
    writeInvocationFileCount: 0,
    nativeWritePerformed: false,
    verifyPerformed: false,
    rollbackOrCompensationPerformed: false,
    realMemoryReadPerformed: false,
    phase8NativeWriteAuthorizationGranted: false
  };
  for (const [field, expected] of Object.entries(exact)) if (receipt[field] !== expected) blockers.push(`receipt.${field}`);
  return {
    accepted: blockers.length === 0,
    blockers,
    bootstrapRecorded: blockers.length === 0,
    authorizationConsumed: receipt.authorizationConsumed === true,
    phase8NativeWriteAuthorizationGranted: false,
    nativeWriteMayExecute: false
  };
}

module.exports = { evaluateCm2093Phase8RegistryRootBootstrapReceipt };
