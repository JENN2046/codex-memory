'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE,
  evaluateReleaseTagReadinessPolicyGate
} = require('../src/core/ReleaseTagReadinessPolicyGate');

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

function releaseNotes(extra = {}) {
  return {
    nonClaimsReviewed: true,
    capabilityClaims: [],
    ...extra
  };
}

test('CM2016 accepts readonly-context rc tag approval packet only with full evidence', () => {
  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence: readonlyContextEvidence(),
    releaseNotes: releaseNotes()
  });

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.status, 'release_tag_readiness_policy_accepted');
  assert.equal(result.candidate.allowedSuffix, 'readonly-context-rc');
  assert.deepEqual(result.externalReviewEvidenceChain.requiredEvidence, REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE);
  assert.equal(result.externalReviewEvidenceChain.accepted, true);
  assert.equal(result.readiness.tagApprovalPacketAccepted, true);
  assert.equal(result.readiness.releaseReadyClaimed, false);
  assert.equal(result.readiness.rcReadyClaimed, false);
  assert.equal(result.readiness.fullCapabilityClaimed, false);
  assert.equal(result.sideEffects.tagCreated, false);
  assert.equal(result.sideEffects.tagPushed, false);
  assert.equal(result.sideEffects.releaseCreated, false);
  assert.equal(result.sideEffects.deploymentTriggered, false);
  assert.equal(result.nextGate, 'separate_operator_tag_approval_required_before_any_git_tag_or_release_action');
});

test('CM2048 rejects tag approval packet when hardened external review chain evidence is missing', () => {
  const evidence = readonlyContextEvidence();
  evidence.externalReviewEvidencePatchHardenedBundleBindingPassed = false;
  evidence.externalReviewEvidenceApplicationPatchPreflightPassed = false;

  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence,
    releaseNotes: releaseNotes()
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'release_tag_readiness_policy_rejected');
  assert.ok(result.blockers.includes(
    'missing_evidence_externalReviewEvidencePatchHardenedBundleBindingPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_evidence_externalReviewEvidenceApplicationPatchPreflightPassed'
  ));
  assert.deepEqual(result.externalReviewEvidenceChain.missingEvidence, [
    'externalReviewEvidencePatchHardenedBundleBindingPassed',
    'externalReviewEvidenceApplicationPatchPreflightPassed'
  ]);
  assert.equal(result.externalReviewEvidenceChain.accepted, false);
  assert.equal(result.readiness.tagApprovalPacketAccepted, false);
  assert.equal(result.sideEffects.tagCreated, false);
  assert.equal(result.sideEffects.releasePublished, false);
});

test('CM2016 rejects readonly-context tag when required evidence is missing', () => {
  const evidence = readonlyContextEvidence();
  evidence.externalReviewPassed = false;
  evidence.gateCiPassed = false;

  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence,
    releaseNotes: releaseNotes()
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'release_tag_readiness_policy_rejected');
  assert.ok(result.blockers.includes('missing_evidence_externalReviewPassed'));
  assert.ok(result.blockers.includes('missing_evidence_gateCiPassed'));
  assert.equal(result.readiness.tagApprovalPacketAccepted, false);
});

test('CM2016 rejects forbidden full or production tag names', () => {
  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v1-full-vcp-memory-production-write-ready',
    milestone: 'readonly_context',
    evidence: readonlyContextEvidence(),
    releaseNotes: releaseNotes()
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('forbidden_tag_fragment_full-vcp-memory'));
  assert.ok(result.blockers.includes('forbidden_tag_fragment_production-write'));
  assert.ok(result.blockers.includes('candidate_tag_must_match_readonly-context-rc'));
});

test('CM2016 rejects release note full capability claims for readonly-context', () => {
  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence: readonlyContextEvidence(),
    releaseNotes: releaseNotes({
      capabilityClaims: ['full_capability', 'production_write']
    })
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('forbidden_release_note_claim_full_capability'));
  assert.ok(result.blockers.includes('forbidden_release_note_claim_production_write'));
});

test('CM2016 normalizes case and hyphen variants before capability claim checks', () => {
  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence: readonlyContextEvidence(),
    releaseNotes: releaseNotes({
      capabilityClaims: ['Full-Capability', 'PRODUCTION-WRITE']
    })
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('forbidden_release_note_claim_full_capability'));
  assert.ok(result.blockers.includes('forbidden_release_note_claim_production_write'));
  assert.deepEqual(result.nonClaims.requestedCapabilityClaims, ['full_capability', 'production_write']);
});

test('CM2016 requires release note non-claims review even when evidence object says reviewed', () => {
  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence: readonlyContextEvidence(),
    releaseNotes: {
      nonClaimsReviewed: false,
      capabilityClaims: []
    }
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('release_note_non_claims_review_missing'));
});

test('CM2016 rejects missing or non-object release notes instead of skipping non-claims review', () => {
  const inputs = [
    {},
    { releaseNotes: null },
    { releaseNotes: [] },
    { releaseNotes: 'non-claims reviewed' },
    { releaseNotes: true }
  ];

  for (const input of inputs) {
    const result = evaluateReleaseTagReadinessPolicyGate({
      candidateTag: 'v0.2.0-readonly-context-rc',
      milestone: 'readonly_context',
      evidence: readonlyContextEvidence(),
      ...input
    });

    assert.equal(result.accepted, false);
    assert.equal(result.status, 'release_tag_readiness_policy_rejected');
    assert.ok(result.blockers.includes('release_note_non_claims_review_missing'));
    assert.equal(result.nonClaims.releaseNoteNonClaimsReviewed, false);
    assert.equal(result.readiness.tagApprovalPacketAccepted, false);
    assert.equal(result.sideEffects.tagCreated, false);
  }
});

test('CM2016 supports operator and native proof tag naming without calling release ready', () => {
  const operatorResult = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.3.0-operator-full-surface-rc',
    milestone: 'operator_full_surface',
    evidence: {
      operatorOnlyFullSurfaceProofPassed: true,
      exactApprovalEnforcementPassed: true,
      auditReceiptPassed: true,
      rollbackPosturePassed: true,
      releaseNoteNonClaimsReviewed: true,
      externalReviewEvidenceIntakePassed: true,
      externalReviewEvidenceBundleContractPassed: true,
      externalReviewEvidencePatchHardenedBundleBindingPassed: true,
      externalReviewEvidenceApplicationPatchPreflightPassed: true,
      externalReviewPassed: true
    },
    releaseNotes: releaseNotes()
  });
  const nativeResult = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.4.0-native-write-proof-rc',
    milestone: 'native_write_proof',
    evidence: {
      operatorOnlyFullSurfaceProofPassed: true,
      exactApprovalEnforcementPassed: true,
      nativeSideEffectReceiptPassed: true,
      auditReceiptPassed: true,
      rollbackPosturePassed: true,
      verifyWritePassed: true,
      failureRecoveryProofPassed: true,
      outputDisclosureBudgetPassed: true,
      observationOrDogfoodReviewPassed: true,
      releaseNoteNonClaimsReviewed: true,
      externalReviewEvidenceIntakePassed: true,
      externalReviewEvidenceBundleContractPassed: true,
      externalReviewEvidencePatchHardenedBundleBindingPassed: true,
      externalReviewEvidenceApplicationPatchPreflightPassed: true,
      externalReviewPassed: true
    },
    releaseNotes: releaseNotes()
  });

  assert.equal(operatorResult.accepted, true);
  assert.equal(operatorResult.readiness.releaseReadyClaimed, false);
  assert.equal(nativeResult.accepted, true);
  assert.equal(nativeResult.readiness.releaseReadyClaimed, false);
});

test('CM2016 stops L4 when actual tag release deploy or readiness action is claimed', () => {
  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence: readonlyContextEvidence(),
    releaseNotes: releaseNotes(),
    request: {
      tagCreated: true,
      releasePublished: true,
      readinessClaimed: true,
      rcReadyClaimed: true
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'release_tag_readiness_stop_l4');
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.tagCreated'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.releasePublished'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.rcReadyClaimed'));
  assert.equal(result.sideEffects.tagCreated, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.readiness.rcReadyClaimed, false);
  assert.equal(result.nextGate, 'stop_before_tag_release_deploy_or_readiness_boundary');
});

test('CM2016 rejects raw or secret-shaped evidence by path only', () => {
  const result = evaluateReleaseTagReadinessPolicyGate({
    candidateTag: 'v0.2.0-readonly-context-rc',
    milestone: 'readonly_context',
    evidence: {
      ...readonlyContextEvidence(),
      rawResponseBody: 'ECHO_GUARD_A'
    },
    releaseNotes: releaseNotes({
      reviewerToken: 'ECHO_GUARD_B'
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'release_tag_readiness_stop_l4');
  assert.ok(result.stopReasons.includes('forbidden_input_field_evidence.rawResponseBody'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_releaseNotes.reviewerToken'));
  assert.equal(serialized.includes('ECHO_GUARD_A'), false);
  assert.equal(serialized.includes('ECHO_GUARD_B'), false);
});
