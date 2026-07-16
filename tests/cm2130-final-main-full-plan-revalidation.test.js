'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const revalidation = require('../src/core/Cm2130FinalMainFullPlanRevalidation');
const generator = require('../scripts/generate-cm2130-final-main-full-plan-revalidation');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('final main baseline revalidates the exact regular-merge chain and tracked evidence', () => {
  const options = generator.gitResolver();
  const artifact = revalidation.buildRevalidation(options);
  const result = revalidation.evaluateRevalidation(artifact, options);
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(artifact.payload.baseline.commit, revalidation.BASELINE_COMMIT);
  assert.equal(artifact.payload.baseline.tree, revalidation.BASELINE_TREE);
  assert.deepEqual(artifact.payload.mergeProof.map(item => item.pullRequest), [14, 15, 16, 17, 18, 19]);
  assert.equal(artifact.payload.mergeProof.every(item => item.regularMergeCommit && item.finalMainAncestor), true);
  assert.equal(artifact.payload.evidenceArtifacts.length, revalidation.EVIDENCE_PATHS.length);
  assert.equal(artifact.payload.statusSurfaceArtifacts.length, revalidation.STATUS_SYNC_PATHS.length);
});

test('revalidation accepts evidence without performing current status sync or claiming readiness', () => {
  const artifact = revalidation.buildRevalidation(generator.gitResolver());
  assert.equal(artifact.payload.revalidatedEvidence.historicalFullPlanApplicationApplied, true);
  assert.equal(artifact.payload.revalidatedEvidence.historicalBranchCasIndependentReviewPassed, true);
  assert.deepEqual(artifact.payload.currentState, {
    finalMainEvidenceRevalidated: true,
    fullPlanStatusSyncPerformed: false,
    fullPlanPackCompleted: false,
    statusSyncStillSeparate: true,
    readinessClaimed: false
  });
  assert.equal(Object.values(artifact.payload.currentSideEffects).every(value => value === 0), true);
  assert.equal(Object.values(artifact.payload.nonClaims).every(value => value === false), true);
});

test('merge, artifact, current-state, authority, side-effect, and readiness drift fail closed', () => {
  const options = generator.gitResolver();
  const prepared = revalidation.buildRevalidation(options);
  for (const mutate of [
    value => { value.payload.mergeProof[0].parents.pop(); },
    value => { value.payload.evidenceArtifacts[0].sha256 = '0'.repeat(64); },
    value => { value.payload.currentState.fullPlanPackCompleted = true; },
    value => { value.payload.currentAuthority.statusSyncAuthorized = true; },
    value => { value.payload.currentSideEffects.branchRefUpdates = 1; },
    value => { value.payload.nonClaims.productionReady = true; }
  ]) {
    const changed = clone(prepared);
    mutate(changed);
    changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
    assert.equal(revalidation.evaluateRevalidation(changed, options).accepted, false);
  }
});

test('baseline Git identity drift prevents artifact construction', () => {
  const base = generator.gitResolver();
  const options = {
    ...base,
    resolveCommit(commit) {
      const resolved = base.resolveCommit(commit);
      return commit === revalidation.BASELINE_COMMIT ? { ...resolved, tree: '0'.repeat(40) } : resolved;
    }
  };
  assert.throws(() => revalidation.buildRevalidation(options), /baseline\.gitIdentity/);
});

test('tracked artifact, when present, remains an exact machine-verifiable mirror', {
  skip: !fs.existsSync(revalidation.ARTIFACT_PATH)
}, () => {
  const artifact = JSON.parse(fs.readFileSync(revalidation.ARTIFACT_PATH, 'utf8'));
  const result = revalidation.evaluateRevalidation(artifact, generator.gitResolver());
  assert.equal(result.accepted, true, result.blockers.join(','));
});

test('generator accepts no output, execution, or baseline override arguments', () => {
  assert.deepEqual(generator.parseArgs([]), {});
  assert.throws(() => generator.parseArgs(['--execute']), /no_arguments/);
  assert.throws(() => generator.parseArgs(['--baseline', 'HEAD']), /no_arguments/);
  assert.throws(() => generator.parseArgs(['--output', '/tmp/cm2130.json']), /no_arguments/);
});

test('generator rejects unsafe Git context before repository reads or writes', () => {
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = '/tmp/cm2130-forbidden-git-dir';
  try {
    assert.throws(() => generator.main([]), /cm2122_unsafe_git_environment:GIT_DIR/);
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
});
