'use strict';

const CONTRACT_NAME = 'Cm2088TagPushReceiptReviewContract';
const REVIEW_REFERENCE = 'CM-2087-ER-20260711-TAG-PUSH-RECEIPT-PASS-DF1E41DD';

function evaluateCm2088TagPushReceiptReview(input) {
  const blockers = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return failure(['invalid_input']);
  if (input.schemaVersion !== 1 || input.result !== 'PASS') blockers.push('review.result');
  if (input.reviewReference !== REVIEW_REFERENCE) blockers.push('review.reference');
  if (input.receiptCommit !== 'fc252418e068ac69bf87ea76458696f5fbfcc470') blockers.push('review.receiptCommit');
  const authorization = input.authorization || {};
  for (const [field, expected] of Object.entries({decisionReference: 'CM-2086-ER-20260711-EXACT-TAG-PUSH-BAF7ECCE', useCount: 1, consumed: true, replayAllowed: false})) {
    if (authorization[field] !== expected) blockers.push(`authorization.${field}`);
  }
  const push = input.push || {};
  for (const [field, expected] of Object.entries({resultCategory: 'pushed_new_tag', remote: 'origin', refspec: 'refs/tags/v0.2.0-readonly-context-rc:refs/tags/v0.2.0-readonly-context-rc', forceUsed: false, pushAllTagsUsed: false, branchRefPushed: false, otherTagPushed: false})) {
    if (push[field] !== expected) blockers.push(`push.${field}`);
  }
  const tag = input.tag || {};
  for (const [field, expected] of Object.entries({name: 'v0.2.0-readonly-context-rc', objectOid: 'baf7eccee586979c08a6f63eead3c8e581d55e3c', signed: false, annotation: 'codex-memory readonly-context RC candidate; not RC_READY; no release authorization', peeledCommit: '170ee33963cd0a41565625b41418d12702dd221b', targetTree: 'c3e12feb3ab338f4eabaa3964483d2d8b1f43b33'})) {
    if (tag[field] !== expected) blockers.push(`tag.${field}`);
  }
  const receipt = input.receipt || {};
  if (receipt.payloadSha256 !== 'df1e41dd0d6915b9b978c51a7d41614ed91a2f1873f22eb34131bb45035f626b' || receipt.accepted !== true) blockers.push('receipt');
  const remaining = input.remainingAuthorizations || {};
  for (const field of ['branchPushAuthorized', 'releaseCreationAuthorized', 'releasePublicationAuthorized', 'packagePublicationAuthorized', 'deployAuthorized', 'cutoverAuthorized', 'phase8NativeWriteAuthorized', 'readinessClaimAuthorized']) {
    if (remaining[field] !== false) blockers.push(`remainingAuthorizations.${field}`);
  }
  if (input.newRemoteActionAuthorized !== false) blockers.push('newRemoteActionAuthorized');
  return blockers.length ? failure(blockers) : {accepted: true, contractName: CONTRACT_NAME, blockers: [], exactTagPushReceiptAccepted: true, remoteTagDeliveryRecorded: true, authorizationConsumed: true, authorizationReplayAllowed: false, newRemoteActionAuthorized: false, phase8NativeWriteAuthorized: false, readinessClaimAuthorized: false};
}

function failure(blockers) {
  return {accepted: false, contractName: CONTRACT_NAME, blockers, exactTagPushReceiptAccepted: false, remoteTagDeliveryRecorded: false, authorizationConsumed: false, authorizationReplayAllowed: false, newRemoteActionAuthorized: false, phase8NativeWriteAuthorized: false, readinessClaimAuthorized: false};
}

module.exports = {CONTRACT_NAME, REVIEW_REFERENCE, evaluateCm2088TagPushReceiptReview};
