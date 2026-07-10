'use strict';

const crypto = require('node:crypto');
const {
  evaluateReleaseTagReadinessPolicyGate
} = require('./ReleaseTagReadinessPolicyGate');

const CONTRACT_NAME = 'Cm2083TagApprovalPacketContract';
const CANDIDATE_TAG = 'v0.2.0-readonly-context-rc';
const TARGET_COMMIT = '170ee33963cd0a41565625b41418d12702dd221b';
const TARGET_TREE = 'c3e12feb3ab338f4eabaa3964483d2d8b1f43b33';
const RELEASE_NOTES_REF =
  'docs/near-model-memory-plan-pack/tag_candidate_release_notes_cm2083.md';
const RELEASE_NOTES_SHA256 =
  'e429fe2a5cc537b2e168c531b79666b1cb5b1ec5bd5aaef26ec4cbab3ec5d90e';
const CANONICAL_PAYLOAD_SHA256 =
  '2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2';
const APPLICATION_RECEIPT_SHA256 =
  'b74dd9ad7077754e98aaff266d62bd1a25223eb392d35108e5926a9eca16cfeb';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
  );
}

function sha256Canonical(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function readonlyContextEvidence() {
  return {
    phase1BlockersFixed: true,
    testAllPassed: true,
    gateCiPassed: true,
    defaultReadOnlySurfacePassed: true,
    nativeReadProofPassed: true,
    fallbackDistinctionPassed: true,
    prepareMemoryContextMvpPassed: true,
    recallQualityBaselinePassed: true,
    readmeNonClaimsPassed: true,
    releaseNoteNonClaimsReviewed: true,
    externalReviewEvidenceIntakePassed: true,
    externalReviewEvidenceBundleContractPassed: true,
    externalReviewEvidencePatchHardenedBundleBindingPassed: true,
    externalReviewEvidenceApplicationPatchPreflightPassed: true,
    externalReviewPassed: true
  };
}

function buildCm2083TagApprovalPacket() {
  const evidence = readonlyContextEvidence();
  const policyResult = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: CANDIDATE_TAG,
    milestone: 'readonly_context',
    evidence,
    releaseNotes: {
      nonClaimsReviewed: true,
      capabilityClaims: []
    },
    request: {
      tagCreated: false,
      tagPushed: false,
      releasePublished: false,
      deploymentTriggered: false,
      cutoverPerformed: false,
      rcReadyClaimed: false
    }
  });

  if (!policyResult.accepted) {
    return {
      accepted: false,
      contractName: CONTRACT_NAME,
      blockers: policyResult.blockers,
      stopReasons: policyResult.stopReasons,
      tagApprovalPacketPassed: false,
      tagCreated: false,
      tagPushed: false
    };
  }

  const packetPayload = {
    schemaVersion: 1,
    taskId: 'CM-2083',
    packetStatus: 'ready_for_independent_tag_approval_review',
    candidate: {
      tag: CANDIDATE_TAG,
      milestone: 'readonly_context',
      targetCommit: TARGET_COMMIT,
      targetTree: TARGET_TREE,
      sourceBranch: 'codex/near-model-memory-frozen-replay-v2'
    },
    bindings: {
      externalReviewDecisionReference:
        'CM-2080-ER-20260711-PASS-F440C1BD-2215BB33',
      completionAuditApplicationDecisionReference:
        'CM-2081-ER-20260711-APPROVE-COMPLETION-AUDIT-2215BB33',
      applicationRequestCommit: '88d11e94dc238145ba9317589cebda52f73910e1',
      completionAuditApplicationCommit: TARGET_COMMIT,
      canonicalPayloadSha256: CANONICAL_PAYLOAD_SHA256,
      completionAuditApplicationReceiptPayloadSha256: APPLICATION_RECEIPT_SHA256
    },
    releaseNotes: {
      sourceRef: RELEASE_NOTES_REF,
      bytes: 1582,
      sha256: RELEASE_NOTES_SHA256,
      nonClaimsReviewed: true,
      capabilityClaims: []
    },
    evidence,
    currentDecisions: {
      externalReviewPassed: true,
      externalReviewEvidenceBundleAppliedToCompletionAudit: true,
      tagApprovalPacketPassed: false,
      phase8NativeWriteAuthorizationGranted: false
    },
    requestedDecision: {
      externalReviewPassed: true,
      externalReviewEvidenceBundleAppliedToCompletionAudit: true,
      tagApprovalPacketPassed: true,
      phase8NativeWriteAuthorizationGranted: false
    },
    localPolicyGate: {
      status: policyResult.status,
      policyShapeAccepted: true,
      externalReviewEvidenceChainAccepted: policyResult.externalReviewEvidenceChain.accepted,
      tagApprovalPacketPassedByLocalPolicy: false,
      releaseReadyClaimed: false,
      rcReadyClaimed: false
    },
    executionBoundaries: {
      independentTagApprovalDecisionRequired: true,
      packetApprovalDoesNotAuthorizeTagCreation: true,
      packetApprovalDoesNotAuthorizeTagPush: true,
      separateExactTagCreationAuthorizationRequired: true,
      separateExactTagPushAuthorizationRequired: true,
      tagCreated: false,
      tagPushed: false,
      releasePublished: false,
      deploymentTriggered: false,
      cutoverPerformed: false,
      phase8NativeWriteAuthorized: false,
      nativeMemoryWritePerformed: false,
      realMemoryReadOrModified: false,
      defaultMcpExpanded: false,
      commitMemoryDeltaPublic: false,
      readinessClaimed: false,
      fullPlanPackCompletedClaimed: false
    }
  };

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    blockers: [],
    packetPayload,
    packetPayloadSha256: sha256Canonical(packetPayload),
    tagApprovalPacketPreparedForIndependentReview: true,
    tagApprovalPacketPassed: false,
    tagCreated: false,
    tagPushed: false,
    nextGate: 'independent_tag_approval_packet_review'
  };
}

module.exports = {
  APPLICATION_RECEIPT_SHA256,
  CANDIDATE_TAG,
  CANONICAL_PAYLOAD_SHA256,
  CONTRACT_NAME,
  RELEASE_NOTES_REF,
  RELEASE_NOTES_SHA256,
  TARGET_COMMIT,
  TARGET_TREE,
  buildCm2083TagApprovalPacket,
  canonicalize,
  readonlyContextEvidence,
  sha256Canonical
};
