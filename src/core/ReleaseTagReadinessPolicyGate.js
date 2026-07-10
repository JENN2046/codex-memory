'use strict';

const REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE = Object.freeze([
  'externalReviewEvidenceIntakePassed',
  'externalReviewEvidenceBundleContractPassed',
  'externalReviewEvidencePatchHardenedBundleBindingPassed',
  'externalReviewEvidenceApplicationPatchPreflightPassed'
]);

const MILESTONE_REQUIREMENTS = Object.freeze({
  readonly_context: Object.freeze({
    allowedSuffix: 'readonly-context-rc',
    requiredEvidence: Object.freeze([
      'phase1BlockersFixed',
      'testAllPassed',
      'gateCiPassed',
      'defaultReadOnlySurfacePassed',
      'nativeReadProofPassed',
      'fallbackDistinctionPassed',
      'prepareMemoryContextMvpPassed',
      'recallQualityBaselinePassed',
      'readmeNonClaimsPassed',
      'releaseNoteNonClaimsReviewed',
      ...REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE,
      'externalReviewPassed'
    ]),
    forbiddenCapabilityClaims: Object.freeze([
      'full_capability',
      'production_write',
      'native_write_production',
      'model_memory_complete'
    ])
  }),
  operator_full_surface: Object.freeze({
    allowedSuffix: 'operator-full-surface-rc',
    requiredEvidence: Object.freeze([
      'operatorOnlyFullSurfaceProofPassed',
      'exactApprovalEnforcementPassed',
      'auditReceiptPassed',
      'rollbackPosturePassed',
      'releaseNoteNonClaimsReviewed',
      ...REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE,
      'externalReviewPassed'
    ]),
    forbiddenCapabilityClaims: Object.freeze([
      'native_write_production',
      'model_memory_complete'
    ])
  }),
  native_write_proof: Object.freeze({
    allowedSuffix: 'native-write-proof-rc',
    requiredEvidence: Object.freeze([
      'operatorOnlyFullSurfaceProofPassed',
      'exactApprovalEnforcementPassed',
      'nativeSideEffectReceiptPassed',
      'auditReceiptPassed',
      'rollbackPosturePassed',
      'verifyWritePassed',
      'failureRecoveryProofPassed',
      'outputDisclosureBudgetPassed',
      'observationOrDogfoodReviewPassed',
      'releaseNoteNonClaimsReviewed',
      ...REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE,
      'externalReviewPassed'
    ]),
    forbiddenCapabilityClaims: Object.freeze([
      'model_memory_complete'
    ])
  })
});

const FORBIDDEN_TAG_FRAGMENTS = Object.freeze([
  'full-vcp-memory',
  'full-memory',
  'full-capability',
  'complete-realtime-memory',
  'complete-memory',
  'model-memory-complete',
  'production-write',
  'production-ready',
  'release-ready',
  'deploy-ready',
  'cutover-ready',
  'rc-ready',
  'rc_ready'
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'tagCreated',
  'tagPushed',
  'releaseCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'productionWriteClaimed',
  'fullCapabilityClaimed',
  'modelMemoryCompleteClaimed',
  'rcReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed',
  'providerApiCalled',
  'durableMutationPerformed',
  'nativeWriteExecuted',
  'publicMcpExpanded'
]);

const FORBIDDEN_INPUT_KEY_PATTERNS = Object.freeze([
  /raw/i,
  /secret/i,
  /token/i,
  /bearer/i,
  /private.*memory/i,
  /endpoint/i,
  /locator/i,
  /request.*body/i,
  /response.*body/i,
  /approval.*line/i
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sortedUnique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))].sort();
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMilestone(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function buildAllowedTagPattern(suffix) {
  return new RegExp(`^v\\d+\\.\\d+\\.\\d+-${suffix}$`);
}

function hasForbiddenInputKey(key) {
  return FORBIDDEN_INPUT_KEY_PATTERNS.some(pattern => pattern.test(String(key || '')));
}

function collectForbiddenInputPaths(value, path = []) {
  if (!isPlainObject(value)) {
    return [];
  }

  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (hasForbiddenInputKey(key)) {
      paths.push(nextPath.join('.'));
      continue;
    }
    paths.push(...collectForbiddenInputPaths(child, nextPath));
  }
  return sortedUnique(paths);
}

function collectEnabledStopFlags(value, path = []) {
  if (!isPlainObject(value)) {
    return [];
  }

  const flags = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (STOP_L4_FLAG_KEYS.includes(key) && child === true) {
      flags.push(nextPath.join('.'));
      continue;
    }
    flags.push(...collectEnabledStopFlags(child, nextPath));
  }
  return sortedUnique(flags);
}

function buildMissingEvidence(requirement, evidence = {}) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};
  return requirement.requiredEvidence
    .filter(field => safeEvidence[field] !== true);
}

function buildCapabilityClaimBlockers(requirement, releaseNotes = {}) {
  const safeReleaseNotes = isPlainObject(releaseNotes) ? releaseNotes : {};
  const capabilityClaims = sortedUnique(safeReleaseNotes.capabilityClaims);
  return requirement.forbiddenCapabilityClaims
    .filter(claim => capabilityClaims.includes(claim));
}

function evaluateReleaseTagReadinessPolicyGate({
  candidateTag = '',
  milestone = '',
  evidence = {},
  releaseNotes = {},
  request = {}
} = {}) {
  const normalizedTag = normalizeString(candidateTag);
  const normalizedMilestone = normalizeMilestone(milestone);
  const requirement = MILESTONE_REQUIREMENTS[normalizedMilestone];
  const blockers = [];
  const stopReasons = [];

  if (!requirement) {
    blockers.push('unsupported_milestone');
  }

  const lowerTag = normalizedTag.toLowerCase();
  for (const fragment of FORBIDDEN_TAG_FRAGMENTS) {
    if (lowerTag.includes(fragment)) {
      blockers.push(`forbidden_tag_fragment_${fragment}`);
    }
  }

  if (requirement) {
    const allowedPattern = buildAllowedTagPattern(requirement.allowedSuffix);
    if (!allowedPattern.test(normalizedTag)) {
      blockers.push(`candidate_tag_must_match_${requirement.allowedSuffix}`);
    }

    for (const field of buildMissingEvidence(requirement, evidence)) {
      blockers.push(`missing_evidence_${field}`);
    }

    for (const claim of buildCapabilityClaimBlockers(requirement, releaseNotes)) {
      blockers.push(`forbidden_release_note_claim_${claim}`);
    }
  }

  if (isPlainObject(releaseNotes) && releaseNotes.nonClaimsReviewed !== true) {
    blockers.push('release_note_non_claims_review_missing');
  }

  const forbiddenInputPaths = sortedUnique([
    ...collectForbiddenInputPaths(evidence, ['evidence']),
    ...collectForbiddenInputPaths(releaseNotes, ['releaseNotes']),
    ...collectForbiddenInputPaths(request, ['request'])
  ]);
  const enabledStopFlags = sortedUnique([
    ...collectEnabledStopFlags(evidence, ['evidence']),
    ...collectEnabledStopFlags(releaseNotes, ['releaseNotes']),
    ...collectEnabledStopFlags(request, ['request'])
  ]);

  for (const path of forbiddenInputPaths) {
    stopReasons.push(`forbidden_input_field_${path}`);
  }
  for (const path of enabledStopFlags) {
    stopReasons.push(`stop_l4_flag_${path}`);
  }

  const stopped = stopReasons.length > 0;
  const accepted = !stopped && blockers.length === 0;
  const missingExternalReviewChainEvidence = buildMissingEvidence({
    requiredEvidence: REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE
  }, evidence);

  return {
    schemaVersion: 'release_tag_readiness_policy_gate_v1',
    accepted,
    status: stopped
      ? 'release_tag_readiness_stop_l4'
      : accepted
        ? 'release_tag_readiness_policy_accepted'
        : 'release_tag_readiness_policy_rejected',
    candidate: {
      tag: normalizedTag,
      milestone: normalizedMilestone,
      allowedSuffix: requirement ? requirement.allowedSuffix : null,
      allowedPattern: requirement ? `^v<major>.<minor>.<patch>-${requirement.allowedSuffix}$` : null
    },
    blockers: sortedUnique(blockers),
    stopReasons: sortedUnique(stopReasons),
    requiredEvidence: requirement ? [...requirement.requiredEvidence] : [],
    externalReviewEvidenceChain: {
      requiredEvidence: [...REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE],
      missingEvidence: missingExternalReviewChainEvidence,
      accepted: missingExternalReviewChainEvidence.length === 0
    },
    forbiddenTagFragments: [...FORBIDDEN_TAG_FRAGMENTS],
    nonClaims: {
      releaseNoteNonClaimsReviewed: isPlainObject(releaseNotes) && releaseNotes.nonClaimsReviewed === true,
      forbiddenCapabilityClaims: requirement ? [...requirement.forbiddenCapabilityClaims] : [],
      requestedCapabilityClaims: sortedUnique(isPlainObject(releaseNotes) ? releaseNotes.capabilityClaims : [])
    },
    sideEffects: {
      tagCreated: false,
      tagPushed: false,
      releaseCreated: false,
      releasePublished: false,
      deploymentTriggered: false,
      cutoverPerformed: false,
      providerApiCalled: false,
      durableMutationPerformed: false,
      nativeWriteExecuted: false,
      publicMcpExpanded: false
    },
    readiness: {
      tagApprovalPacketAccepted: accepted,
      releaseReadyClaimed: false,
      deployReadyClaimed: false,
      cutoverReadyClaimed: false,
      rcReadyClaimed: false,
      fullCapabilityClaimed: false
    },
    nextGate: accepted
      ? 'separate_operator_tag_approval_required_before_any_git_tag_or_release_action'
      : stopped
        ? 'stop_before_tag_release_deploy_or_readiness_boundary'
        : 'repair_evidence_or_release_note_non_claims_before_tag_approval_packet'
  };
}

module.exports = {
  FORBIDDEN_TAG_FRAGMENTS,
  MILESTONE_REQUIREMENTS,
  REQUIRED_EXTERNAL_REVIEW_CHAIN_EVIDENCE,
  evaluateReleaseTagReadinessPolicyGate
};
