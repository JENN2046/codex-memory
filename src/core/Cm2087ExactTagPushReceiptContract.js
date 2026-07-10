'use strict';

const crypto = require('node:crypto');

const CONTRACT_NAME = 'Cm2087ExactTagPushReceiptContract';
const DECISION_REFERENCE = 'CM-2086-ER-20260711-EXACT-TAG-PUSH-BAF7ECCE';
const TAG_OID = 'baf7eccee586979c08a6f63eead3c8e581d55e3c';
const TARGET_COMMIT = '170ee33963cd0a41565625b41418d12702dd221b';
const TARGET_TREE = 'c3e12feb3ab338f4eabaa3964483d2d8b1f43b33';
const REFSPEC = 'refs/tags/v0.2.0-readonly-context-rc:refs/tags/v0.2.0-readonly-context-rc';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex');
}

function evaluateCm2087ExactTagPushReceipt({ authorization, receipt } = {}) {
  const blockers = [];
  if (!authorization || !receipt) return failure(['missing_input']);
  if (authorization.decisionReference !== DECISION_REFERENCE) blockers.push('authorization.decisionReference');
  if (authorization.authorizationRequestCommit !== '2668e150ca084a0bb418a30cee117a23fba6c7a0') blockers.push('authorization.authorizationRequestCommit');
  const auth = authorization.authorization || {};
  if (auth.tagPushAuthorized !== true || auth.authorizationUseCount !== 1) blockers.push('authorization.tagPush');
  for (const field of ['branchPushAuthorized', 'releaseCreationAuthorized', 'releasePublicationAuthorized', 'packagePublicationAuthorized', 'deployAuthorized', 'cutoverAuthorized', 'phase8NativeWriteAuthorized', 'forceAllowed', 'pushAllTagsAllowed', 'followTagsAllowed', 'deleteRemoteRefAllowed', 'retargetAllowed']) {
    if (auth[field] !== false) blockers.push(`authorization.${field}`);
  }
  const binding = authorization.binding || {};
  for (const [field, expected] of Object.entries({remoteName: 'origin', remoteUrl: 'git@github.com:JENN2046/codex-memory.git', sourceRef: 'refs/tags/v0.2.0-readonly-context-rc', destinationRef: 'refs/tags/v0.2.0-readonly-context-rc', exactRefspec: REFSPEC, tagObjectOid: TAG_OID, tagSigned: false, tagAnnotation: 'codex-memory readonly-context RC candidate; not RC_READY; no release authorization', peeledCommit: TARGET_COMMIT, targetTree: TARGET_TREE, packetPayloadSha256: 'c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43', tagApprovalDecisionReference: 'CM-2083-ER-20260711-TAG-PACKET-PASS-C06836B4', tagCreationAuthorizationReference: 'CM-2084-ER-20260711-LOCAL-ANNOTATED-TAG-CREATE-C06836B4', localTagReceiptPayloadSha256: 'b6c2a597f109ca4a17f10dde88d505f81caf892ee607eb35b562693e77e7d3d0', receiptReviewReference: 'CM-2085-ER-20260711-LOCAL-TAG-RECEIPT-PASS-BAF7ECCE'})) {
    if (binding[field] !== expected) blockers.push(`authorization.binding.${field}`);
  }
  const status = authorization.executionStatus || {};
  if (status.authorizationConsumed !== true || status.authorizationReplayAllowed !== false || status.tagPushed !== true || status.ambiguousResult !== false) blockers.push('authorization.executionStatus');

  const payload = receipt.receiptPayload || {};
  if (payload.authorizationDecisionReference !== DECISION_REFERENCE || payload.authorizationUseCount !== 1 || payload.authorizationConsumed !== true || payload.authorizationReplayAllowed !== false) blockers.push('receipt.authorization');
  if (payload.pushResultCategory !== 'pushed_new_tag' || payload.refspec !== REFSPEC) blockers.push('receipt.pushResult');
  const remote = payload.remote || {};
  if (remote.name !== 'origin' || remote.url !== 'git@github.com:JENN2046/codex-memory.git' || remote.precheckRefAbsent !== true) blockers.push('receipt.remote');
  const tag = payload.tag || {};
  for (const [field, expected] of Object.entries({name: 'v0.2.0-readonly-context-rc', localObjectOid: TAG_OID, remoteObjectOid: TAG_OID, peeledCommit: TARGET_COMMIT, targetTree: TARGET_TREE, signed: false, annotation: 'codex-memory readonly-context RC candidate; not RC_READY; no release authorization'})) {
    if (tag[field] !== expected) blockers.push(`receipt.tag.${field}`);
  }
  const boundaries = payload.boundaries || {};
  for (const field of ['branchRefPushed', 'otherTagPushed', 'forceUpdatePerformed', 'releaseCreated', 'releasePublished', 'packagePublished', 'deploymentTriggered', 'cutoverPerformed', 'phase8NativeWriteAuthorized', 'nativeMemoryWritePerformed', 'realMemoryReadOrModified', 'defaultMcpExpanded', 'commitMemoryDeltaPublic', 'readinessClaimed', 'fullPlanPackCompletedClaimed']) {
    if (boundaries[field] !== false) blockers.push(`receipt.boundaries.${field}`);
  }
  if (receipt.receiptPayloadSha256 !== sha256Canonical(payload)) blockers.push('receipt.receiptPayloadSha256');
  return blockers.length ? failure(blockers) : {accepted: true, contractName: CONTRACT_NAME, blockers: [], tagPushed: true, authorizationConsumed: true, authorizationReplayAllowed: false, releaseAuthorized: false, phase8NativeWriteAuthorized: false, readinessClaimed: false, nextGate: 'independent_tag_push_receipt_review'};
}

function failure(blockers) {
  return {accepted: false, contractName: CONTRACT_NAME, blockers, tagPushed: false, authorizationConsumed: false, authorizationReplayAllowed: false, releaseAuthorized: false, phase8NativeWriteAuthorized: false, readinessClaimed: false};
}

module.exports = {CONTRACT_NAME, DECISION_REFERENCE, REFSPEC, TAG_OID, TARGET_COMMIT, TARGET_TREE, canonicalize, sha256Canonical, evaluateCm2087ExactTagPushReceipt};
