'use strict';

const CONTRACT_NAME = 'Cm2086LocalTagReceiptReviewContract';
const REVIEW_REFERENCE = 'CM-2085-ER-20260711-LOCAL-TAG-RECEIPT-PASS-BAF7ECCE';

function evaluateCm2086LocalTagReceiptReview(input) {
  const blockers = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return failure(['invalid_input']);
  }
  if (input.schemaVersion !== 1) blockers.push('schemaVersion');
  if (input.reviewReference !== REVIEW_REFERENCE) blockers.push('reviewReference');
  if (input.result !== 'PASS') blockers.push('result');

  const tag = input.localTag || {};
  for (const [field, expected] of Object.entries({
    name: 'v0.2.0-readonly-context-rc',
    exists: true,
    type: 'annotated',
    signed: false,
    objectOid: 'baf7eccee586979c08a6f63eead3c8e581d55e3c',
    peeledCommit: '170ee33963cd0a41565625b41418d12702dd221b',
    targetTree: 'c3e12feb3ab338f4eabaa3964483d2d8b1f43b33',
    annotation: 'codex-memory readonly-context RC candidate; not RC_READY; no release authorization'
  })) {
    if (tag[field] !== expected) blockers.push(`localTag.${field}`);
  }
  const receipt = input.receipt || {};
  if (receipt.commit !== 'ccf61fb531933517262a5f06482343a24f9120de') blockers.push('receipt.commit');
  if (receipt.payloadSha256 !== 'b6c2a597f109ca4a17f10dde88d505f81caf892ee607eb35b562693e77e7d3d0') blockers.push('receipt.payloadSha256');
  if (receipt.accepted !== true) blockers.push('receipt.accepted');

  const authorization = input.authorization || {};
  if (authorization.decisionReference !== 'CM-2084-ER-20260711-LOCAL-ANNOTATED-TAG-CREATE-C06836B4') blockers.push('authorization.decisionReference');
  if (authorization.useCount !== 1) blockers.push('authorization.useCount');
  if (authorization.consumed !== true) blockers.push('authorization.consumed');
  if (authorization.replayAllowed !== false) blockers.push('authorization.replayAllowed');

  const remoteActions = input.remoteActions || {};
  for (const field of [
    'tagPushAuthorized',
    'tagPushed',
    'branchPushAuthorized',
    'releaseAuthorized',
    'deployAuthorized',
    'cutoverAuthorized'
  ]) {
    if (remoteActions[field] !== false) blockers.push(`remoteActions.${field}`);
  }
  if (input.phase8NativeWriteAuthorizationGranted !== false) {
    blockers.push('phase8NativeWriteAuthorizationGranted');
  }

  return blockers.length > 0 ? failure(blockers) : {
    accepted: true,
    contractName: CONTRACT_NAME,
    blockers: [],
    localTagReceiptReviewPassed: true,
    tagPushAuthorized: false,
    tagPushed: false,
    remoteActionPerformed: false,
    phase8NativeWriteAuthorizationGranted: false,
    nextGate: 'request_separate_exact_tag_push_authorization'
  };
}

function failure(blockers) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    blockers,
    localTagReceiptReviewPassed: false,
    tagPushAuthorized: false,
    tagPushed: false,
    remoteActionPerformed: false,
    phase8NativeWriteAuthorizationGranted: false
  };
}

module.exports = {
  CONTRACT_NAME,
  REVIEW_REFERENCE,
  evaluateCm2086LocalTagReceiptReview
};
