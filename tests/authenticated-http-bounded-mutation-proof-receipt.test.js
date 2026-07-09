'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  RECEIPT_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationProofReceipt,
  collectBlockers
} = require('../src/core/AuthenticatedHttpBoundedMutationProofReceipt');

function publicRejectedResult() {
  return {
    decision: 'rejected',
    dryRun: true,
    mutated: false,
    reasonCode: 'public_dry_run_low_disclosure',
    confirmGate: {
      confirmRequested: true,
      confirmAccepted: false,
      confirmedMutationAllowed: false
    },
    policy: {
      durableMutationPerformed: false,
      rawStoreScanned: false,
      providerCalled: false,
      readinessClaimed: false
    },
    approvalRequired: true
  };
}

function internalAcceptedResult() {
  return {
    decision: 'tombstoned',
    mutated: true,
    projectionCleanupStatus: 'accepted',
    projectionCleanupReport: {
      residualProjectionFamilies: []
    }
  };
}

function beforeCounts() {
  return {
    diary_record: 1,
    sqlite_shadow_record: 1,
    sqlite_memory_chunks: 3,
    vector_index: 1,
    embedding_cache: 3,
    candidate_cache: 1,
    write_audit: 3,
    recall_audit: 1,
    reconcile_queue: 2,
    degraded_payload: 1
  };
}

function afterCleanupCounts() {
  return {
    diary_record: 1,
    sqlite_shadow_record: 1,
    sqlite_memory_chunks: 0,
    vector_index: 0,
    embedding_cache: 0,
    candidate_cache: 0,
    write_audit: 4,
    recall_audit: 2,
    reconcile_queue: 0,
    degraded_payload: 0
  };
}

function replacementCounts() {
  return {
    diary_record: 1,
    sqlite_shadow_record: 1,
    sqlite_memory_chunks: 3,
    vector_index: 1,
    embedding_cache: 3,
    candidate_cache: 1,
    write_audit: 3,
    recall_audit: 1,
    reconcile_queue: 2,
    degraded_payload: 1
  };
}

function acceptedInput(overrides = {}) {
  const counts = beforeCounts();
  return {
    mutationFamily: 'tombstone_memory',
    publicToolName: 'tombstone_memory',
    authenticatedHttpRuntimeObserved: true,
    tempLocalOnly: true,
    syntheticOnly: true,
    publicConfirmedMutationAttempted: true,
    publicResult: publicRejectedResult(),
    beforePublicCounts: counts,
    afterPublicCounts: counts,
    internalResult: internalAcceptedResult(),
    afterInternalCounts: afterCleanupCounts(),
    ...overrides
  };
}

test('authenticated HTTP bounded mutation proof receipt accepts low-disclosure tombstone evidence', () => {
  const receipt = buildAuthenticatedHttpBoundedMutationProofReceipt(acceptedInput());

  assert.equal(receipt.schemaVersion, RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_ACCEPTED_NOT_READY');
  assert.equal(receipt.disclosure.memoryIdIncluded, false);
  assert.equal(receipt.disclosure.endpointOrLocatorIncluded, false);
  assert.equal(receipt.disclosure.rawContentIncluded, false);
  assert.equal(receipt.publicHttpBoundary.countsChanged, false);
  assert.equal(receipt.internalRuntimeBoundary.targetProjectionResidualsCleared, true);
  assert.equal(receipt.projectionBuckets.beforePublic.embedding_cache, 'three');
  assert.equal(receipt.projectionBuckets.afterInternal.embedding_cache, 'zero');
  assert.equal(receipt.safety.readinessClaimed, false);
  assert.deepEqual(receipt.blockers, []);
});

test('authenticated HTTP bounded mutation proof receipt fails closed for unsafe or incomplete evidence', () => {
  assert.deepEqual(
    collectBlockers(acceptedInput({
      afterPublicCounts: {
        ...beforeCounts(),
        candidate_cache: 0
      }
    })),
    ['public_path_changed_projection_counts']
  );

  assert.ok(collectBlockers(acceptedInput({
    publicResult: {
      ...publicRejectedResult(),
      mutated: true
    }
  })).includes('public_path_not_rejected_low_disclosure'));

  assert.ok(collectBlockers(acceptedInput({
    readinessClaimed: true
  })).includes('readiness_or_release_overclaim'));

  const blockedSupersede = buildAuthenticatedHttpBoundedMutationProofReceipt(acceptedInput({
    mutationFamily: 'supersede_memory',
    publicToolName: 'supersede_memory',
    replacementAfterInternalCounts: {
      ...replacementCounts(),
      embedding_cache: 0
    }
  }));
  assert.equal(blockedSupersede.accepted, false);
  assert.ok(blockedSupersede.blockers.includes('replacement_projection_retention_not_proven'));
});
