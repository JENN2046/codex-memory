'use strict';

const crypto = require('node:crypto');

const DECISION_SOURCE_COMMIT = 'aecc431de4533e1c3a0e9f42948b217f835b4c7e';
const DECISION_BLOB_OID = 'bc251e7a34152b41724f3c098fee12baefe0f787';
const DECISION_BYTES = 1062;
const DECISION_SHA256 = '9fb37b29e18ee65225e8e2fcb9628260ba93afb5ced6c195388e390570daa5dc';
const DECISION_REFERENCE = 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7';
const DECISION_EXPIRES_AT = '2026-07-15T18:00:00+08:00';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function evaluateCm2093Phase8RegistryRootBootstrapDecision({
  decisionBytes,
  decisionSourceCommit,
  decisionBlobOid,
  now = new Date()
} = {}) {
  const blockers = [];
  if (!Buffer.isBuffer(decisionBytes)) {
    return { accepted: false, blockers: ['decision.bytes'], bootstrapMayExecute: false };
  }
  if (decisionSourceCommit !== DECISION_SOURCE_COMMIT) blockers.push('decision.sourceCommit');
  if (decisionBlobOid !== DECISION_BLOB_OID) blockers.push('decision.blobOid');
  if (decisionBytes.length !== DECISION_BYTES) blockers.push('decision.byteLength');
  if (sha256(decisionBytes) !== DECISION_SHA256) blockers.push('decision.sha256');
  let decision = null;
  try {
    decision = JSON.parse(decisionBytes.toString('utf8'));
  } catch (_error) {
    blockers.push('decision.json');
  }
  const exact = {
    decisionReference: DECISION_REFERENCE,
    authorizationContentApproved: true,
    registryRootBootstrapAuthorized: true,
    registryRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
    phase8NativeWriteAuthorized: false,
    nativeWriteMayExecute: false,
    finalExecutionReleaseReviewRequired: true,
    expectedFinalReleaseDecisionReference: 'CM-2094-ER-PHASE8-FINAL-EXECUTION-RELEASE-F1CF912C-B69CC85D',
    allowedAction: 'live_bridge_record_memory_proof',
    expectedContextHash: 'f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283',
    expectedAllowlistHash: 'b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20',
    payloadCanonicalSha256: '91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee',
    nonce: 'cm2093-phase8-record-memory-proof-001',
    receiptId: 'cm2093-phase8-native-write-receipt-001',
    authorizationUseCount: 1,
    expiresAt: DECISION_EXPIRES_AT,
    approvedAt: '2026-07-11T12:45:48+08:00'
  };
  if (decision) {
    for (const [field, expected] of Object.entries(exact)) {
      if (decision[field] !== expected) blockers.push(`decision.${field}`);
    }
  }
  const expiresAtMs = Date.parse(DECISION_EXPIRES_AT);
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs) || expiresAtMs <= nowMs) blockers.push('decision.expired');
  return {
    accepted: blockers.length === 0,
    blockers,
    bootstrapMayExecute: blockers.length === 0,
    decisionReference: blockers.length === 0 ? DECISION_REFERENCE : null
  };
}

module.exports = {
  DECISION_BLOB_OID,
  DECISION_BYTES,
  DECISION_EXPIRES_AT,
  DECISION_REFERENCE,
  DECISION_SHA256,
  DECISION_SOURCE_COMMIT,
  evaluateCm2093Phase8RegistryRootBootstrapDecision
};
