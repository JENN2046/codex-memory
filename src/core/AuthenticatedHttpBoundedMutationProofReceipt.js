'use strict';

const RECEIPT_SCHEMA_VERSION = 'authenticated-http-bounded-mutation-proof-receipt-v1';

const SUPPRESSIBLE_PROJECTION_FAMILIES = Object.freeze([
  'sqlite_memory_chunks',
  'vector_index',
  'embedding_cache',
  'candidate_cache',
  'reconcile_queue',
  'degraded_payload'
]);

const REPLACEMENT_RETAINED_PROJECTION_FAMILIES = Object.freeze([
  'sqlite_memory_chunks',
  'vector_index',
  'embedding_cache',
  'candidate_cache',
  'degraded_payload'
]);

const FORBIDDEN_RECEIPT_PATTERNS = Object.freeze([
  /https?:\/\//i,
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /Authorization/i,
  /\/tmp\/|\\AppData\\|\\Users\\/i,
  /Synthetic temp-local chunk/i,
  /sk-[A-Za-z0-9_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /BEGIN (RSA|OPENSSH|PRIVATE)/i
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function bucketCount(value) {
  const count = normalizeCount(value);
  if (count === null) return 'unknown';
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  if (count === 3) return 'three';
  return 'gt_three';
}

function bucketCounts(counts = {}) {
  const safeCounts = isPlainObject(counts) ? counts : {};
  return Object.fromEntries(Object.keys(safeCounts)
    .sort()
    .map(key => [key, bucketCount(safeCounts[key])]));
}

function countsEqual(left = {}, right = {}) {
  const leftKeys = Object.keys(isPlainObject(left) ? left : {}).sort();
  const rightKeys = Object.keys(isPlainObject(right) ? right : {}).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) return false;
    return normalizeCount(left[key]) === normalizeCount(right[key]);
  });
}

function allCountsZero(counts = {}, families = SUPPRESSIBLE_PROJECTION_FAMILIES) {
  const safeCounts = isPlainObject(counts) ? counts : {};
  return families.every(family => normalizeCount(safeCounts[family]) === 0);
}

function retainedReplacementCountsValid(counts = {}) {
  const safeCounts = isPlainObject(counts) ? counts : {};
  return REPLACEMENT_RETAINED_PROJECTION_FAMILIES.every(family => {
    const count = normalizeCount(safeCounts[family]);
    return count !== null && count > 0;
  });
}

function publicPathRejected(publicResult = {}) {
  return publicResult?.decision === 'rejected' &&
    publicResult?.dryRun === true &&
    publicResult?.mutated === false &&
    publicResult?.reasonCode === 'public_dry_run_low_disclosure' &&
    publicResult?.confirmGate?.confirmRequested === true &&
    publicResult?.confirmGate?.confirmAccepted === false &&
    publicResult?.confirmGate?.confirmedMutationAllowed === false &&
    publicResult?.policy?.durableMutationPerformed === false &&
    publicResult?.policy?.rawStoreScanned === false &&
    publicResult?.policy?.providerCalled === false &&
    publicResult?.policy?.readinessClaimed === false &&
    publicResult?.approvalRequired === true;
}

function internalPathAccepted(internalResult = {}) {
  return internalResult?.mutated === true &&
    internalResult?.projectionCleanupStatus === 'accepted' &&
    Array.isArray(internalResult?.projectionCleanupReport?.residualProjectionFamilies) &&
    internalResult.projectionCleanupReport.residualProjectionFamilies.length === 0;
}

function containsForbiddenReceiptMaterial(value) {
  const serialized = JSON.stringify(value);
  return FORBIDDEN_RECEIPT_PATTERNS.some(pattern => pattern.test(serialized));
}

function collectBlockers(input = {}) {
  const blockers = [];
  const mutationFamily = normalizeString(input.mutationFamily);
  const beforePublicCounts = input.beforePublicCounts;
  const afterPublicCounts = input.afterPublicCounts;
  const afterInternalCounts = input.afterInternalCounts;
  const replacementBeforePublicCounts = input.replacementBeforePublicCounts;
  const replacementAfterPublicCounts = input.replacementAfterPublicCounts;
  const replacementAfterInternalCounts = input.replacementAfterInternalCounts;
  const publicToolName = normalizeString(input.publicToolName);

  if (!['tombstone_memory', 'supersede_memory'].includes(mutationFamily)) {
    blockers.push('unsupported_mutation_family');
  }
  if (publicToolName && publicToolName !== mutationFamily) {
    blockers.push('public_tool_name_mutation_family_mismatch');
  }
  if (input.authenticatedHttpRuntimeObserved !== true) {
    blockers.push('authenticated_http_runtime_not_observed');
  }
  if (input.tempLocalOnly !== true || input.syntheticOnly !== true) {
    blockers.push('non_temp_local_or_non_synthetic_evidence');
  }
  if (input.publicConfirmedMutationAttempted !== true) {
    blockers.push('public_confirmed_mutation_attempt_missing');
  }
  if (!publicPathRejected(input.publicResult)) {
    blockers.push('public_path_not_rejected_low_disclosure');
  }
  if (!countsEqual(beforePublicCounts, afterPublicCounts)) {
    blockers.push('public_path_changed_projection_counts');
  }
  if (mutationFamily === 'supersede_memory') {
    if (!isPlainObject(replacementBeforePublicCounts) || !isPlainObject(replacementAfterPublicCounts)) {
      blockers.push('replacement_public_projection_counts_missing');
    } else if (!countsEqual(replacementBeforePublicCounts, replacementAfterPublicCounts)) {
      blockers.push('public_path_changed_replacement_projection_counts');
    }
  }
  if (!internalPathAccepted(input.internalResult)) {
    blockers.push('internal_bounded_cleanup_not_accepted');
  }
  if (!allCountsZero(afterInternalCounts)) {
    blockers.push('target_projection_residuals_present_after_internal_cleanup');
  }
  if (mutationFamily === 'supersede_memory' && !retainedReplacementCountsValid(replacementAfterInternalCounts)) {
    blockers.push('replacement_projection_retention_not_proven');
  }
  if (input.rawContentOutput === true || input.endpointOrLocatorOutput === true || input.secretOutput === true) {
    blockers.push('raw_endpoint_or_secret_output_claimed');
  }
  if (input.readinessClaimed === true || input.releaseClaimed === true || input.rcReadyClaimed === true) {
    blockers.push('readiness_or_release_overclaim');
  }

  return [...new Set(blockers)];
}

function buildAuthenticatedHttpBoundedMutationProofReceipt(input = {}) {
  const mutationFamily = normalizeString(input.mutationFamily);
  const blockers = collectBlockers(input);
  const accepted = blockers.length === 0;
  const receipt = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    receiptType: 'authenticated_http_bounded_mutation_proof',
    accepted,
    decision: accepted
      ? 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_ACCEPTED_NOT_READY'
      : 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_BLOCKED',
    mutationFamily,
    publicToolName: normalizeString(input.publicToolName),
    targetCategory: mutationFamily === 'supersede_memory' ? 'pair_target' : 'single_target',
    disclosure: {
      lowDisclosure: true,
      rawContentIncluded: false,
      rawResponseIncluded: false,
      rawErrorIncluded: false,
      endpointOrLocatorIncluded: false,
      pathIncluded: false,
      memoryIdIncluded: false,
      secretIncluded: false,
      tokenIncluded: false
    },
    publicHttpBoundary: {
      authenticatedHttpRuntimeObserved: input.authenticatedHttpRuntimeObserved === true,
      publicConfirmedMutationAttempted: input.publicConfirmedMutationAttempted === true,
      publicPathRejected: publicPathRejected(input.publicResult),
      publicMutationPerformed: normalizeBoolean(input.publicResult?.mutated),
      approvalRequired: input.publicResult?.approvalRequired === true,
      countsChanged: !countsEqual(input.beforePublicCounts, input.afterPublicCounts),
      replacementCountsChanged: mutationFamily === 'supersede_memory'
        ? !countsEqual(input.replacementBeforePublicCounts, input.replacementAfterPublicCounts)
        : null
    },
    internalRuntimeBoundary: {
      internalBoundedPathObserved: internalPathAccepted(input.internalResult),
      internalMutationPerformed: normalizeBoolean(input.internalResult?.mutated),
      projectionCleanupAccepted: input.internalResult?.projectionCleanupStatus === 'accepted',
      residualProjectionFamiliesBucket: bucketCount(input.internalResult?.projectionCleanupReport?.residualProjectionFamilies?.length),
      targetProjectionResidualsCleared: allCountsZero(input.afterInternalCounts),
      replacementProjectionRetained: mutationFamily === 'supersede_memory'
        ? retainedReplacementCountsValid(input.replacementAfterInternalCounts)
        : null
    },
    projectionBuckets: {
      beforePublic: bucketCounts(input.beforePublicCounts),
      afterPublic: bucketCounts(input.afterPublicCounts),
      replacementBeforePublic: mutationFamily === 'supersede_memory'
        ? bucketCounts(input.replacementBeforePublicCounts)
        : null,
      replacementAfterPublic: mutationFamily === 'supersede_memory'
        ? bucketCounts(input.replacementAfterPublicCounts)
        : null,
      afterInternal: bucketCounts(input.afterInternalCounts),
      replacementAfterInternal: mutationFamily === 'supersede_memory'
        ? bucketCounts(input.replacementAfterInternalCounts)
        : null
    },
    safety: {
      tempLocalOnly: input.tempLocalOnly === true,
      syntheticOnly: input.syntheticOnly === true,
      providerCalls: 0,
      publicMcpExpansion: false,
      durablePrivateMemoryWrite: false,
      rawStoreScan: false,
      readinessClaimed: false,
      releaseClaimed: false,
      rcReadyClaimed: false
    },
    blockers
  };

  if (containsForbiddenReceiptMaterial(receipt)) {
    return {
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      receiptType: 'authenticated_http_bounded_mutation_proof',
      accepted: false,
      decision: 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_BLOCKED',
      mutationFamily,
      publicToolName: normalizeString(input.publicToolName),
      disclosure: {
        lowDisclosure: true,
        rawContentIncluded: false,
        rawResponseIncluded: false,
        rawErrorIncluded: false,
        endpointOrLocatorIncluded: false,
        pathIncluded: false,
        memoryIdIncluded: false,
        secretIncluded: false,
        tokenIncluded: false
      },
      blockers: [...new Set([...blockers, 'receipt_contains_forbidden_material'])]
    };
  }

  return receipt;
}

module.exports = {
  RECEIPT_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationProofReceipt,
  collectBlockers
};
