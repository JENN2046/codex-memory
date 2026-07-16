'use strict';

const crypto = require('node:crypto');

const CONTRACT_NAME = 'Cm2085LocalAnnotatedTagCreationReceiptContract';
const AUTHORIZATION_DECISION_REFERENCE =
  'CM-2084-ER-20260711-LOCAL-ANNOTATED-TAG-CREATE-C06836B4';
const TAG_APPROVAL_DECISION_REFERENCE =
  'CM-2083-ER-20260711-TAG-PACKET-PASS-C06836B4';
const TAG_NAME = 'v0.2.0-readonly-context-rc';
const TARGET_COMMIT = '170ee33963cd0a41565625b41418d12702dd221b';
const TARGET_TREE = 'c3e12feb3ab338f4eabaa3964483d2d8b1f43b33';
const TAG_OBJECT_OID = 'baf7eccee586979c08a6f63eead3c8e581d55e3c';
const TAG_MESSAGE =
  'codex-memory readonly-context RC candidate; not RC_READY; no release authorization';
const PACKET_SHA256 =
  'c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
  );
}

function sha256Canonical(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function evaluateCm2085LocalAnnotatedTagCreationReceipt({ authorization, receipt } = {}) {
  const blockers = [];
  if (!authorization || !receipt) return failure(['missing_input']);

  if (authorization.decisionReference !== AUTHORIZATION_DECISION_REFERENCE) {
    blockers.push('authorization.decisionReference');
  }
  const auth = authorization.authorization || {};
  if (auth.tagCreationAuthorized !== true) blockers.push('authorization.tagCreationAuthorized');
  for (const field of [
    'tagPushAuthorized',
    'branchPushAuthorized',
    'releaseCreationAuthorized',
    'releasePublicationAuthorized',
    'packagePublicationAuthorized',
    'deployAuthorized',
    'cutoverAuthorized',
    'phase8NativeWriteAuthorized',
    'tagSigningAuthorized'
  ]) {
    if (auth[field] !== false) blockers.push(`authorization.${field}`);
  }
  if (auth.authorizationUseCount !== 1) blockers.push('authorization.authorizationUseCount');
  const authorizationBinding = authorization.binding || {};
  for (const [field, expected] of Object.entries({
    candidateTag: TAG_NAME,
    tagType: 'annotated',
    targetCommit: TARGET_COMMIT,
    targetTree: TARGET_TREE,
    tagMessage: TAG_MESSAGE,
    packetPayloadSha256: PACKET_SHA256,
    tagApprovalDecisionReference: TAG_APPROVAL_DECISION_REFERENCE,
    authorizationRequestCommit: '486922d7d4619844624de831bcee43ddff9e5d78'
  })) {
    if (authorizationBinding[field] !== expected) blockers.push(`authorization.binding.${field}`);
  }
  const executionStatus = authorization.executionStatus || {};
  if (executionStatus.authorizationConsumed !== true) blockers.push('authorization.executionStatus.authorizationConsumed');
  if (executionStatus.authorizationReplayAllowed !== false) blockers.push('authorization.executionStatus.authorizationReplayAllowed');
  if (executionStatus.tagCreated !== true) blockers.push('authorization.executionStatus.tagCreated');
  if (executionStatus.tagPushed !== false) blockers.push('authorization.executionStatus.tagPushed');
  if (executionStatus.remoteActionPerformed !== false) blockers.push('authorization.executionStatus.remoteActionPerformed');

  const payload = receipt.receiptPayload || {};
  const tag = payload.tag || {};
  const binding = payload.binding || {};
  if (payload.authorizationDecisionReference !== AUTHORIZATION_DECISION_REFERENCE) {
    blockers.push('receipt.authorizationDecisionReference');
  }
  if (payload.authorizationUseCount !== 1 || payload.authorizationConsumed !== true) {
    blockers.push('receipt.authorizationConsumption');
  }
  for (const [field, expected] of Object.entries({
    name: TAG_NAME,
    objectType: 'tag',
    tagObjectOid: TAG_OBJECT_OID,
    signed: false,
    annotation: TAG_MESSAGE,
    peeledCommit: TARGET_COMMIT,
    targetTree: TARGET_TREE
  })) {
    if (tag[field] !== expected) blockers.push(`receipt.tag.${field}`);
  }
  if (binding.packetPayloadSha256 !== PACKET_SHA256) blockers.push('receipt.binding.packetPayloadSha256');
  if (binding.tagApprovalDecisionReference !== TAG_APPROVAL_DECISION_REFERENCE) {
    blockers.push('receipt.binding.tagApprovalDecisionReference');
  }
  for (const [field, value] of Object.entries(payload.boundaries || {})) {
    if (value !== false) blockers.push(`receipt.boundaries.${field}`);
  }
  if (receipt.receiptPayloadSha256 !== sha256Canonical(payload)) {
    blockers.push('receipt.receiptPayloadSha256');
  }

  return blockers.length > 0 ? failure(blockers) : {
    accepted: true,
    contractName: CONTRACT_NAME,
    blockers: [],
    tagCreated: true,
    tagPushed: false,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    remoteActionPerformed: false,
    readinessClaimed: false,
    nextGate: 'separate_exact_tag_push_authorization_if_requested'
  };
}

function failure(blockers) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    blockers,
    tagCreated: false,
    tagPushed: false,
    authorizationConsumed: false,
    authorizationReplayAllowed: false,
    remoteActionPerformed: false,
    readinessClaimed: false
  };
}

module.exports = {
  AUTHORIZATION_DECISION_REFERENCE,
  CONTRACT_NAME,
  PACKET_SHA256,
  TAG_APPROVAL_DECISION_REFERENCE,
  TAG_MESSAGE,
  TAG_NAME,
  TAG_OBJECT_OID,
  TARGET_COMMIT,
  TARGET_TREE,
  canonicalize,
  evaluateCm2085LocalAnnotatedTagCreationReceipt,
  sha256Canonical
};
