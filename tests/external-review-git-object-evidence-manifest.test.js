'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const manifest = require('../docs/near-model-memory-plan-pack/external_review_git_object_evidence_manifest.json');
const {
  sha256,
  stableCanonicalJson
} = require('../src/core/NearModelMemoryPlanPackCanonicalReviewBundleContract');

const root = path.resolve(__dirname, '..');

function git(args, encoding = null) {
  return execFileSync('git', args, {
    cwd: root,
    encoding,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

test('CM2080 evidence commit and tree are reachable from the registered repository object database', () => {
  assert.equal(git(['rev-parse', `${manifest.evidenceCommit}^{commit}`], 'utf8').trim(), manifest.evidenceCommit);
  assert.equal(git(['rev-parse', `${manifest.evidenceCommit}^{tree}`], 'utf8').trim(), manifest.evidenceTree);
});

test('CM2080 independently verifies every evidence blob OID byte length and SHA-256', () => {
  assert.equal(manifest.objects.length, 6);
  for (const object of manifest.objects) {
    const objectRef = `${manifest.evidenceCommit}:${object.path}`;
    const oid = git(['rev-parse', objectRef], 'utf8').trim();
    const body = git(['cat-file', 'blob', objectRef]);
    assert.equal(object.gitObjectRef, objectRef);
    assert.equal(oid, object.blobOid, object.path);
    assert.equal(body.length, object.byteLength, object.path);
    assert.equal(digest(body), object.sha256, object.path);
  }
});

test('CM2080 recomputes canonical payload SHA-256 from the evidence commit bundle object', () => {
  const bundlePath = 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_v2.json';
  const body = git(['cat-file', 'blob', `${manifest.evidenceCommit}:${bundlePath}`]);
  const bundle = JSON.parse(body.toString('utf8'));
  assert.equal(bundle.canonicalPayloadSha256, manifest.canonicalPayloadSha256);
  assert.equal(sha256(stableCanonicalJson(bundle.payload)), manifest.canonicalPayloadSha256);
});

test('CM2080 keeps all independent decisions false and preserves safety boundaries', () => {
  assert.deepEqual(manifest.effectiveDecisions, {
    externalReviewPassed: false,
    externalReviewEvidenceBundleAppliedToCompletionAudit: false,
    tagApprovalPacketPassed: false,
    phase8NativeWriteAuthorizationGranted: false
  });
  assert.equal(manifest.rawPrivateMemoryAccessed, false);
  assert.equal(manifest.nativeMemoryWritePerformed, false);
  assert.equal(manifest.remoteActionPerformed, false);
  assert.equal(manifest.readinessClaimed, false);
});
