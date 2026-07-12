'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const decision = require('../src/core/Cm2121FullPlanStatusSyncContentDecision');
const generator = require('../scripts/generate-cm2121-full-plan-status-sync-content-decision');
const { resolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function prepared() {
  const options = resolverOptions();
  const applicationEvidence = decision.intakeApplication(options);
  assert.equal(applicationEvidence.accepted, true, applicationEvidence.blockers.join(','));
  const implementation = {
    commit: 'a'.repeat(40),
    tree: 'b'.repeat(40),
    parentCommit: decision.APPLICATION_COMMIT,
    parentTree: decision.APPLICATION_TREE,
    diffPaths: decision.IMPLEMENTATION_DIFF_PATHS,
    diffEntries: decision.IMPLEMENTATION_DIFF_ENTRIES,
    diffPathsSha256: sha256Canonical(decision.IMPLEMENTATION_DIFF_PATHS),
    diffEntriesSha256: sha256Canonical(decision.IMPLEMENTATION_DIFF_ENTRIES),
    artifacts: [
      { path: decision.IMPLEMENTATION_ARTIFACT_PATHS[0], blobOid: 'c'.repeat(40), bytes: 1, sha256: 'd'.repeat(64) },
      { path: decision.IMPLEMENTATION_ARTIFACT_PATHS[1], blobOid: 'e'.repeat(40), bytes: 1, sha256: 'f'.repeat(64) },
      { path: decision.IMPLEMENTATION_ARTIFACT_PATHS[2], blobOid: '1'.repeat(40), bytes: 1, sha256: '2'.repeat(64) }
    ]
  };
  const artifact = decision.buildDecision({ applicationEvidence, implementation });
  return { options, applicationEvidence, implementation, artifact };
}

test('exact status-sync application is Git-intaken and machine-bound', () => {
  const { applicationEvidence } = prepared();
  assert.equal(applicationEvidence.applicationMachineBound, true);
  assert.equal(decision.isMachineBoundApplication(applicationEvidence.application), true);
  assert.equal(Object.isFrozen(applicationEvidence.application), true);
  assert.equal(decision.isMachineBoundApplication(clone(applicationEvidence.application)), false);
});

test('content decision approves content while execution, ref update, and final release remain separate', () => {
  const { options, implementation, artifact } = prepared();
  const evaluation = decision.evaluateDecision(artifact, { implementation, ...options });
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
  assert.equal(evaluation.authorizationContentApproved, true);
  assert.equal(evaluation.statusSyncExecutionAuthorized, false);
  assert.equal(evaluation.finalExecutionReleasePresent, false);
  assert.equal(evaluation.finalExecutionReleaseAuthorized, false);
  assert.equal(evaluation.branchRefUpdateAuthorized, false);
  assert.equal(evaluation.statusSyncPerformed, false);
  assert.equal(evaluation.currentBranchStatusSynchronized, false);
  assert.equal(evaluation.readinessClaimed, false);
});

test('application, patch, execution, final release, branch ref, and readiness drift fail closed', () => {
  const { options, implementation, artifact } = prepared();
  for (const mutate of [
    value => { value.payload.application.commit = '0'.repeat(40); },
    value => { value.payload.exactContent.targets[0].after.sha256 = '0'.repeat(64); },
    value => { value.payload.exactContent.exactPaths.pop(); },
    value => { value.payload.authorizationContent.statusSyncExecutionAuthorized = true; },
    value => { value.payload.authorizationContent.callerSuppliedAcceptedBooleanAllowed = true; },
    value => { value.payload.authorizationContent.alternateOutputPathAllowed = true; },
    value => { value.payload.authorizationContent.finalExecutionReleasePresent = true; },
    value => { value.payload.authorizationContent.finalExecutionReleaseAuthorized = true; },
    value => { value.payload.authorizationContent.branchRefUpdateAuthorized = true; },
    value => { value.payload.authorizationContent.branchRefUpdateDecisionPresent = true; },
    value => { value.payload.futureExecutionBoundary.finalReleaseMayNotAuthorizeBranchRefUpdate = false; },
    value => { value.payload.futureExecutionBoundary.detachedStatusCommitMustBeDirectChildOfFinalReleaseSourceCommit = false; },
    value => { value.payload.futureExecutionBoundary.futureBranchRef = 'refs/heads/main'; },
    value => { value.payload.futureExecutionBoundary.forceBranchRefUpdateAllowed = true; },
    value => { value.payload.currentState.detachedStatusCommitCreated = true; },
    value => { value.payload.currentState.branchRefUpdated = true; },
    value => { value.payload.nonClaims.productionReady = true; },
    value => { value.payload.currentSideEffects.branchRefUpdates = 1; }
  ]) {
    const changed = clone(artifact);
    mutate(changed);
    changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
    assert.equal(decision.evaluateDecision(changed, { implementation, ...options }).accepted, false);
  }
});

test('ordinary caller object cannot substitute for machine-bound application evidence', () => {
  const { applicationEvidence, implementation } = prepared();
  assert.throws(() => decision.buildDecision({
    applicationEvidence: { ...applicationEvidence, application: clone(applicationEvidence.application) },
    implementation
  }), /machine_bound/);
});

test('content decision generator accepts no execution, ref, final release, or output arguments', () => {
  assert.deepEqual(generator.parseArgs([]), {});
  for (const argv of [['--execute'], ['--update-ref'], ['--final-release'], ['--output', '/tmp/x']]) {
    assert.throws(() => generator.parseArgs(argv), /no_arguments/);
  }
});
