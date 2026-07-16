'use strict';

const CONTRACT_NAME = 'Cm2084TagApprovalDecisionContract';
const DECISION_REFERENCE = 'CM-2083-ER-20260711-TAG-PACKET-PASS-C06836B4';

const EXPECTED_BINDING = Object.freeze({
  packetCommit: '842c28cf4f844f4395027d070d3193c1c85a3cec',
  readonlyReviewCommit: '8a769a465202d0dd6e3159e56a5a2a3ba5b2f855',
  candidateTag: 'v0.2.0-readonly-context-rc',
  targetCommit: '170ee33963cd0a41565625b41418d12702dd221b',
  targetTree: 'c3e12feb3ab338f4eabaa3964483d2d8b1f43b33',
  packetPayloadSha256: 'c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43',
  releaseNotesSha256: 'e429fe2a5cc537b2e168c531b79666b1cb5b1ec5bd5aaef26ec4cbab3ec5d90e',
  completionAuditApplicationReceiptSha256:
    'b74dd9ad7077754e98aaff266d62bd1a25223eb392d35108e5926a9eca16cfeb',
  canonicalPayloadSha256: '2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2'
});

const EXPECTED_PRESERVED_BOUNDARIES = Object.freeze({
  candidateNameAcceptedOnly: true,
  packetContentAccepted: true,
  tagCreated: false,
  tagPushed: false,
  phase8NativeWriteAuthorized: false,
  defaultMcpExpanded: false,
  commitMemoryDeltaPublic: false,
  releaseOrReadinessClaimAuthorized: false,
  fullPlanPackCompletedClaimed: false
});

function evaluateCm2084TagApprovalDecision(input) {
  const blockers = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return failure(['invalid_input']);
  }
  if (input.schemaVersion !== 1) blockers.push('schemaVersion');
  if (input.decisionReference !== DECISION_REFERENCE) blockers.push('decisionReference');
  for (const [field, expected] of Object.entries(EXPECTED_BINDING)) {
    if (!input.binding || input.binding[field] !== expected) blockers.push(`binding.${field}`);
  }
  const decisions = input.decisions || {};
  for (const field of [
    'externalReviewPassed',
    'externalReviewEvidenceBundleAppliedToCompletionAudit',
    'tagApprovalPacketPassed'
  ]) {
    if (decisions[field] !== true) blockers.push(`decisions.${field}`);
  }
  if (decisions.phase8NativeWriteAuthorizationGranted !== false) {
    blockers.push('decisions.phase8NativeWriteAuthorizationGranted');
  }
  for (const [field, value] of Object.entries(input.actionAuthorizations || {})) {
    if (value !== false) blockers.push(`actionAuthorizations.${field}`);
  }
  for (const field of [
    'tagCreationAuthorized',
    'tagPushAuthorized',
    'releaseCreationAuthorized',
    'releasePublicationAuthorized',
    'deployAuthorized',
    'cutoverAuthorized'
  ]) {
    if (!input.actionAuthorizations || input.actionAuthorizations[field] !== false) {
      blockers.push(`actionAuthorizations.${field}`);
    }
  }
  for (const [field, expected] of Object.entries(EXPECTED_PRESERVED_BOUNDARIES)) {
    if (!input.preservedBoundaries || input.preservedBoundaries[field] !== expected) {
      blockers.push(`preservedBoundaries.${field}`);
    }
  }

  return blockers.length > 0 ? failure([...new Set(blockers)]) : {
    accepted: true,
    contractName: CONTRACT_NAME,
    blockers: [],
    tagApprovalPacketPassed: true,
    phase8NativeWriteAuthorizationGranted: false,
    tagCreationAuthorized: false,
    tagPushAuthorized: false,
    tagCreated: false,
    tagPushed: false,
    nextGate: 'request_separate_exact_local_tag_creation_authorization'
  };
}

function failure(blockers) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    blockers,
    tagApprovalPacketPassed: false,
    phase8NativeWriteAuthorizationGranted: false,
    tagCreationAuthorized: false,
    tagPushAuthorized: false,
    tagCreated: false,
    tagPushed: false
  };
}

module.exports = {
  CONTRACT_NAME,
  DECISION_REFERENCE,
  EXPECTED_BINDING,
  EXPECTED_PRESERVED_BOUNDARIES,
  evaluateCm2084TagApprovalDecision
};
