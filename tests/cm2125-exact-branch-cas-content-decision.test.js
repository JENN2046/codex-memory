'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const decision = require('../src/core/Cm2125ExactBranchCasContentDecision');
const generator = require('../scripts/generate-cm2125-exact-branch-cas-content-decision');
const {
  gitBlobOid,
  sha256
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  resolverOptions
} = require('../scripts/generate-cm2116-exact-full-plan-application-gate');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function prepared() {
  const base = resolverOptions();
  const applicationEvidence = decision.intakeApplication(base);
  assert.equal(applicationEvidence.accepted, true, applicationEvidence.blockers.join(','));
  const contents = new Map(decision.IMPLEMENTATION_DIFF_PATHS.map(sourcePath => [
    sourcePath,
    Buffer.from(`cm2125 content decision fixture: ${sourcePath}\n`, 'utf8')
  ]));
  const implementation = {
    commit: 'a'.repeat(40),
    tree: 'b'.repeat(40),
    parentCommit: decision.APPLICATION_COMMIT,
    parentTree: decision.APPLICATION_TREE,
    diffPaths: decision.IMPLEMENTATION_DIFF_PATHS,
    diffEntries: decision.IMPLEMENTATION_DIFF_ENTRIES,
    diffPathsSha256: sha256Canonical(decision.IMPLEMENTATION_DIFF_PATHS),
    diffEntriesSha256: sha256Canonical(decision.IMPLEMENTATION_DIFF_ENTRIES),
    artifacts: decision.IMPLEMENTATION_DIFF_PATHS.map(sourcePath => {
      const content = contents.get(sourcePath);
      return {
        path: sourcePath,
        blobOid: gitBlobOid(content),
        bytes: content.length,
        sha256: sha256(content)
      };
    })
  };
  const options = {
    ...base,
    resolveCommitTree(commit) {
      if (commit === implementation.commit) return implementation.tree;
      return base.resolveCommitTree(commit);
    },
    resolveParentCommit(commit) {
      if (commit === implementation.commit) return decision.APPLICATION_COMMIT;
      return base.resolveParentCommit(commit);
    },
    resolveDiffPaths(fromCommit, toCommit) {
      if (fromCommit === decision.APPLICATION_COMMIT && toCommit === implementation.commit) {
        return [...decision.IMPLEMENTATION_DIFF_PATHS];
      }
      return base.resolveDiffPaths(fromCommit, toCommit);
    },
    resolveDiffEntries(fromCommit, toCommit) {
      if (fromCommit === decision.APPLICATION_COMMIT && toCommit === implementation.commit) {
        return decision.IMPLEMENTATION_DIFF_ENTRIES.map(item => ({ ...item }));
      }
      return base.resolveDiffEntries(fromCommit, toCommit);
    },
    resolveGitFile(commit, sourcePath) {
      if (commit === implementation.commit && contents.has(sourcePath)) {
        const content = contents.get(sourcePath);
        return {
          sourceCommit: implementation.commit,
          sourceTree: implementation.tree,
          sourcePath,
          gitMode: '100644',
          gitObjectType: 'blob',
          blobOid: gitBlobOid(content),
          bytes: content.length,
          sha256: sha256(content),
          content
        };
      }
      return base.resolveGitFile(commit, sourcePath);
    }
  };
  const artifact = decision.buildDecision({ applicationEvidence, implementation });
  return { applicationEvidence, implementation, options, artifact };
}

test('CM-2125 application is exact Git-intaken, deep-frozen, and machine-bound', () => {
  const { applicationEvidence } = prepared();
  assert.equal(applicationEvidence.applicationMachineBound, true);
  assert.equal(decision.isMachineBoundApplication(applicationEvidence.application), true);
  assert.equal(Object.isFrozen(applicationEvidence.application), true);
  assert.equal(decision.isMachineBoundApplication(clone(applicationEvidence.application)), false);
});

test('content decision approves only static content while execution and synchronization stay false', () => {
  const { implementation, options, artifact } = prepared();
  const evaluation = decision.evaluateDecision(artifact, { implementation, ...options });
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
  assert.equal(evaluation.authorizationContentApproved, true);
  assert.equal(evaluation.branchCasExecutionAuthorized, false);
  assert.equal(evaluation.branchRefUpdateAuthorized, false);
  assert.equal(evaluation.targetWorktreeIndexSynchronizationAuthorized, false);
  assert.equal(evaluation.targetWorktreeFileSynchronizationAuthorized, false);
  assert.equal(evaluation.branchRefUpdated, false);
  assert.equal(evaluation.currentBranchStatusSynchronized, false);
  assert.equal(evaluation.readinessClaimed, false);
  assert.equal(artifact.payload.exactCasContent.upstreamConsumedClaimIsEvidenceOnly, true);
  assert.equal(artifact.payload.exactCasContent.upstreamConsumedClaimMayBeReusedForBranchCas, false);
});

test('application Git identity and implementation artifact drift fail closed', () => {
  const base = resolverOptions();
  const changedOptions = {
    ...base,
    resolveCommitTree(commit) {
      if (commit === decision.APPLICATION_COMMIT) return '0'.repeat(40);
      return base.resolveCommitTree(commit);
    }
  };
  assert.equal(decision.intakeApplication(changedOptions).accepted, false);

  const { implementation, options, artifact } = prepared();
  const changedImplementation = clone(implementation);
  changedImplementation.artifacts[0].sha256 = '0'.repeat(64);
  assert.equal(decision.evaluateDecision(artifact, {
    implementation: changedImplementation,
    ...options
  }).accepted, false);
});

test('CAS target, authority, state, side-effect, upstream-claim, and readiness drift fail closed', () => {
  const { implementation, options, artifact } = prepared();
  for (const mutate of [
    value => { value.payload.application.commit = '0'.repeat(40); },
    value => { value.payload.exactCasContent.target.targetRef = 'refs/heads/main'; },
    value => { value.payload.exactCasContent.target.expectedOld = '0'.repeat(40); },
    value => { value.payload.exactCasContent.target.newCommit = '0'.repeat(40); },
    value => { value.payload.exactCasContent.statusEntries.pop(); },
    value => { value.payload.exactCasContent.receiptEvidence.reviewCommit = '0'.repeat(40); },
    value => { value.payload.exactCasContent.upstreamConsumedClaimIsEvidenceOnly = false; },
    value => { value.payload.exactCasContent.upstreamConsumedClaimMayBeReusedForBranchCas = true; },
    value => { value.payload.authorizationContent.callerSuppliedAcceptedBooleanAllowed = true; },
    value => { value.payload.authorizationContent.callerSuppliedWorktreePathAllowed = true; },
    value => { value.payload.authorizationContent.contentDecisionMayExecute = true; },
    value => { value.payload.authorizationContent.branchCasClaimCreationAuthorized = true; },
    value => { value.payload.authorizationContent.executionReceiptCreationAuthorized = true; },
    value => { value.payload.authorizationContent.executionPacketPresent = true; },
    value => { value.payload.authorizationContent.executionPacketAuthorized = true; },
    value => { value.payload.authorizationContent.finalExecutionReleasePresent = true; },
    value => { value.payload.authorizationContent.finalExecutionReleaseAuthorized = true; },
    value => { value.payload.authorizationContent.branchCasExecutionAuthorized = true; },
    value => { value.payload.authorizationContent.branchRefUpdateAuthorized = true; },
    value => { value.payload.authorizationContent.targetWorktreeIndexSynchronizationAuthorized = true; },
    value => { value.payload.authorizationContent.targetWorktreeFileSynchronizationAuthorized = true; },
    value => { value.payload.currentAuthority.applicationExecuted = true; },
    value => { value.payload.currentAuthority.branchCasClaimCreated = true; },
    value => { value.payload.currentAuthority.branchRefUpdateAuthorized = true; },
    value => { value.payload.currentState.branchRefUpdated = true; },
    value => { value.payload.currentState.targetWorktreeIndexSynchronized = true; },
    value => { value.payload.currentState.targetWorktreeFilesSynchronized = true; },
    value => { value.payload.currentState.currentBranchStatusSynchronized = true; },
    value => { value.payload.currentSideEffects.branchRefUpdates = 1; },
    value => { value.payload.prohibitedAuthority.forceUpdateAuthorized = true; },
    value => { value.payload.nonClaims.productionReady = true; }
  ]) {
    const changed = clone(artifact);
    mutate(changed);
    changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
    const evaluation = decision.evaluateDecision(changed, { implementation, ...options });
    assert.equal(evaluation.accepted, false);
  }
});

test('ordinary objects and caller-declared accepted evidence cannot replace machine intake', () => {
  const { applicationEvidence, implementation } = prepared();
  assert.throws(() => decision.buildDecision({
    applicationEvidence: { ...applicationEvidence, application: clone(applicationEvidence.application) },
    implementation
  }), /machine_bound/);
  assert.throws(() => decision.buildDecision({
    applicationEvidence: { accepted: true, application: clone(applicationEvidence.application) },
    implementation
  }), /machine_bound/);
});

test('generator accepts no execution, ref, worktree, output, or final-release arguments', () => {
  assert.deepEqual(generator.parseArgs([]), {});
  for (const argv of [
    ['--execute'],
    ['--update-ref'],
    ['--status-sync'],
    ['--execution-packet'],
    ['--final-release'],
    ['--target-ref', 'refs/heads/main'],
    ['--worktree', '/tmp/x'],
    ['--output', '/tmp/x'],
    ['--json'],
    ['unexpected']
  ]) {
    assert.throws(() => generator.parseArgs(argv), /no_arguments/);
  }
});

test('Markdown renderer embeds the exact JSON without granting execution', () => {
  const { artifact } = prepared();
  const jsonText = decision.serializeArtifact(artifact);
  const markdown = generator.renderMarkdown(artifact, jsonText);
  assert.equal(markdown.includes(jsonText.trimEnd()), true);
  assert.equal(markdown.includes('does not authorize execution'), true);
  assert.equal(markdown.includes('current-branch status synchronization'), true);
});
