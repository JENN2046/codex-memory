'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  parseArgs,
  sha256Canonical,
  verifyFrozenEvidenceManifest
} = require('../scripts/verify-frozen-evidence-manifest');

function fixture() {
  const payload = {
    baseline: { commit: 'baseline', tree: 'baseline-tree' },
    mergeProof: [{
      pullRequest: 14,
      commit: 'merge-14',
      tree: 'merge-tree',
      parents: ['parent-a', 'parent-b'],
      subject: 'Merge pull request #14'
    }],
    evidenceArtifacts: [{ path: 'evidence.json', blobOid: 'blob-a', bytes: 10, sha256: 'hash-a' }],
    statusSurfaceArtifacts: [{ path: 'status.md', blobOid: 'blob-b', bytes: 20, sha256: 'hash-b' }]
  };
  return {
    schemaVersion: 1,
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
