'use strict';

const crypto = require('node:crypto');

const DECISION_BYTES = 1325;
const DECISION_SHA256 = 'db9dd1cc6f884806e8ea0337e3d09765608fa0892ad7f29011d822805c1c0ccf';

function evaluateCm2094Phase8FinalExecutionReleaseDecision(decisionBytes) {
  const blockers = [];
  if (!Buffer.isBuffer(decisionBytes)) return { accepted: false, blockers: ['decision.bytes'], nativeWriteMayExecute: false };
  if (decisionBytes.length !== DECISION_BYTES) blockers.push('decision.byteLength');
  if (decisionBytes[0] === 0xef || decisionBytes[decisionBytes.length - 1] === 0x0a) blockers.push('decision.encoding');
  if (crypto.createHash('sha256').update(decisionBytes).digest('hex') !== DECISION_SHA256) blockers.push('decision.sha256');
  let decision = null;
  try { decision = JSON.parse(decisionBytes.toString('utf8')); } catch { blockers.push('decision.json'); }
  const exact = {
    decisionReference: 'CM-2094-ER-PHASE8-FINAL-EXECUTION-RELEASE-F1CF912C-B69CC85D',
    executionReleaseAuthorized: true,
    phase8NativeWriteAuthorized: true,
    token: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT',
    allowedAction: 'live_bridge_record_memory_proof',
    authorizationContentDecisionReference: 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7',
    authorizationContentSourceCommit: 'aecc431de4533e1c3a0e9f42948b217f835b4c7e',
    authorizationContentBlobOid: 'bc251e7a34152b41724f3c098fee12baefe0f787',
    authorizationContentPayloadSha256: '9fb37b29e18ee65225e8e2fcb9628260ba93afb5ced6c195388e390570daa5dc',
    executionPacketCommit: '66cfae232b6609bbede9debc6f897f74ed8551c0',
    executionManifestBlobOid: '549f157ed65d0675fccfb2c8b68698a31c4666f2',
    executionManifestSha256: '0786167ba860d869873fdc32dad167a411d7d85617e2c08b01c1d4604ba3131d',
    expectedContextHash: 'f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283',
    expectedAllowlistHash: 'b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20',
    payloadCanonicalSha256: '91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee',
    nonce: 'cm2093-phase8-record-memory-proof-001',
    receiptId: 'cm2093-phase8-native-write-receipt-001',
    authorizationUseCount: 1,
    expiresAt: '2026-07-15T18:00:00+08:00',
    approvedAt: '2026-07-11T13:29:13+08:00'
  };
  if (decision) for (const [field, expected] of Object.entries(exact)) if (decision[field] !== expected) blockers.push(`decision.${field}`);
  return {
    accepted: blockers.length === 0,
    blockers,
    decisionFrozenExactly: blockers.length === 0,
    phase8NativeWriteAuthorizationGranted: blockers.length === 0,
    nativeWriteMayExecute: false,
    machineIntakeStillRequired: true
  };
}

module.exports = { DECISION_BYTES, DECISION_SHA256, evaluateCm2094Phase8FinalExecutionReleaseDecision };
