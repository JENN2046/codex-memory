'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const decision = require('../src/core/Cm2121FullPlanStatusSyncContentDecision');
const generator = require('../scripts/generate-cm2121-full-plan-status-sync-content-decision');
const { resolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const frozenDecision = require('../docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_content_decision.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function prepared() {
  const options = resolverOptions();
  const applicationEvidence = decision.intakeApplication(options);
  assert.equal(applicationEvidence.accepted, true, applicationEvidence.blockers.join(','));
  const implementation = clone(frozenDecision.payload.decisionImplementation);
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

test('content decision rejects a caller-supplied implementation not present in Git', () => {
  const { options, applicationEvidence, implementation } = prepared();
  const missing = clone(implementation);
  missing.commit = 'a'.repeat(40);
  const artifact = decision.buildDecision({ applicationEvidence, implementation: missing });
  const evaluation = decision.evaluateDecision(artifact, { implementation: missing, ...options });
  assert.equal(evaluation.accepted, false);
  assert.ok(evaluation.blockers.includes('decision.implementationUnreadable'));
});

test('content decision binds the package.json changed by its implementation commit', () => {
  const { options, implementation, artifact } = prepared();
  const evaluation = decision.evaluateDecision(artifact, {
    implementation,
    ...options,
    resolveGitFile: (commit, sourcePath) => {
      const actual = options.resolveGitFile(commit, sourcePath);
      if (sourcePath !== 'package.json') return actual;
      return { ...actual, sha256: '0'.repeat(64) };
    }
  });
  assert.equal(evaluation.accepted, false);
  assert.ok(evaluation.blockers.includes('decision.implementationArtifact.package.json'));
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
