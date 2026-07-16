'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertSafeGitEnvironment,
  parseArgs,
  sanitizedGitEnvironment,
  sha256Canonical,
  verifyFrozenEvidenceManifest
} = require('../scripts/verify-frozen-evidence-manifest');

function fixture() {
  const payload = {
    baseline: {
      commit: 'baseline',
      tree: 'baseline-tree',
      mergeCount: 1,
      mergeMethod: 'regular_merge_commit_only'
    },
    currentAuthority: {
      branchRefUpdateAuthorized: false,
      consumedAuthorizationReplayAuthorized: false,
      deployAuthorized: false,
      forcePushAuthorized: false,
      readinessClaimAuthorized: false,
      releaseAuthorized: false,
      revalidationOnly: true,
      statusSyncAuthorized: false
    },
    currentSideEffects: {
      applicationCommits: 0,
      branchRefUpdates: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      readinessClaims: 0,
      realMemoryReads: 0,
      receiptWrites: 0,
      remoteActions: 0,
      repositoryPatches: 0
    },
    currentState: {
      finalMainEvidenceRevalidated: true,
      fullPlanPackCompleted: false,
      fullPlanStatusSyncPerformed: false,
      readinessClaimed: false,
      statusSyncStillSeparate: true
    },
    mergeProof: [{
      pullRequest: 14,
      commit: 'merge-14',
      tree: 'merge-tree',
      parents: ['parent-a', 'parent-b'],
      subject: 'Merge pull request #14',
      regularMergeCommit: true,
      finalMainAncestor: true
    }],
    evidenceArtifacts: [{ path: 'evidence.json', blobOid: 'blob-a', bytes: 10, sha256: 'hash-a' }],
    statusSurfaceArtifacts: [{ path: 'status.md', blobOid: 'blob-b', bytes: 20, sha256: 'hash-b' }],
    revalidatedEvidence: {
      historicalBranchCasCompleted: true,
      historicalBranchCasIndependentReviewPassed: true,
      historicalBranchCasReceiptFreezePassed: true,
      historicalFullPlanApplicationApplied: true,
      historicalFullPlanApplicationAuthorizationConsumed: true,
      historicalFullPlanApplicationAuthorizationReplayAllowed: false,
      historicalFullPlanApplicationCommitBound: true,
      historicalReceiptReviewPassed: true
    },
    nonClaims: { productionReady: false, readinessClaimed: false },
    verdict: 'PASS_SYNTHETIC_READINESS_FALSE'
  };
  return {
    schemaVersion: 1,
    taskId: 'TEST-1',
    validationId: 'TEST-V-1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function resolver(overrides = {}) {
  return {
    resolveCommit(commit) {
      if (commit === 'baseline') return { commit, tree: 'baseline-tree', parents: [], subject: '' };
      return {
        commit,
        tree: 'merge-tree',
        parents: ['parent-a', 'parent-b'],
        subject: 'Merge pull request #14'
      };
    },
    resolveGitFile(_commit, sourcePath) {
      return sourcePath === 'evidence.json'
        ? { blobOid: 'blob-a', bytes: 10, sha256: 'hash-a' }
        : { blobOid: 'blob-b', bytes: 20, sha256: 'hash-b' };
    },
    isCommitAncestor: () => true,
    ...overrides
  };
}

test('generic frozen evidence verifier accepts manifest-bound Git identities', () => {
  const result = verifyFrozenEvidenceManifest(fixture(), resolver());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.mergeCount, 1);
  assert.equal(result.artifactCount, 2);
  assert.equal(result.repositoryWrites, 0);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.memoryReads, 0);
  assert.equal(result.memoryWrites, 0);
  assert.equal(result.readinessClaimed, false);
});

test('generic frozen evidence verifier rejects artifact drift', () => {
  const result = verifyFrozenEvidenceManifest(fixture(), resolver({
    resolveGitFile: () => ({ blobOid: 'drift', bytes: 10, sha256: 'hash-a' })
  }));

  assert.equal(result.accepted, false);
  assert.match(result.blockers.join('\n'), /artifact\.identity/);
  assert.equal(result.readinessClaimed, false);
});

test('generic frozen evidence verifier derives counters and rejects semantic drift', () => {
  const manifest = fixture();
  manifest.payload.currentSideEffects.providerCalls = 2;
  manifest.canonicalPayloadSha256 = sha256Canonical(manifest.payload);
  const counterDrift = verifyFrozenEvidenceManifest(manifest, resolver());
  assert.equal(counterDrift.providerCalls, 2);
  assert.equal(counterDrift.accepted, false);
  assert.ok(counterDrift.blockers.includes('sideEffects.providerCalls.must_be_zero_for_revalidation'));

  manifest.payload.currentAuthority.consumedAuthorizationReplayAuthorized = true;
  manifest.payload.currentState.readinessClaimed = true;
  manifest.payload.nonClaims.productionReady = true;
  manifest.payload.verdict = 'PASS_FORGED';
  manifest.canonicalPayloadSha256 = sha256Canonical(manifest.payload);
  const result = verifyFrozenEvidenceManifest(manifest, resolver());
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authority.consumedAuthorizationReplayAuthorized'));
  assert.ok(result.blockers.includes('state.readinessClaimed'));
  assert.ok(result.blockers.includes('nonClaims.must_all_be_false'));
  assert.ok(result.blockers.includes('verdict.must_end_readiness_false'));
});

test('generic frozen evidence verifier rejects dangerous Git environment and sanitizes benign input', () => {
  assert.throws(() => assertSafeGitEnvironment({ GIT_DIR: '/tmp/forged' }), /dangerous_git_env/);
  assert.deepEqual(sanitizedGitEnvironment({ PATH: '/bin', HOME: '/tmp' }), {
    PATH: '/bin', HOME: '/tmp', GIT_NO_REPLACE_OBJECTS: '1'
  });
});

test('generic frozen evidence verifier confines optional manifests to plan-pack JSON', () => {
  assert.deepEqual(
    parseArgs(['--manifest', 'docs/near-model-memory-plan-pack/review.json']),
    { manifestPath: 'docs/near-model-memory-plan-pack/review.json' }
  );
  assert.throws(
    () => parseArgs(['--manifest', 'state-private/review.json']),
    /must_be_plan_pack_json/
  );
  assert.throws(
    () => parseArgs(['--manifest', 'docs/near-model-memory-plan-pack/../private.json']),
    /must_be_plan_pack_json/
  );
});
