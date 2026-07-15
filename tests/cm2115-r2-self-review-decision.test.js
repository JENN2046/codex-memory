'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const {
  DECISION_PATH,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_LINEAGE_DIFF_PATHS,
  REVIEW_REQUEST_DIFF_PATHS,
  REVIEW_REQUEST_FREEZE,
  buildDecision,
  buildDecisionReference,
  evaluateDecision,
  evaluateFrozenReviewRequest,
  sha256Canonical
} = require('../src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract');
const git = require('../scripts/cm2115-r2-git');
const {
  resolveFrozenPhase2DurableClaim
} = require('../src/cli/cm2115-canonical-full-plan-evidence-snapshot');
const {
  isCommitAncestor: realIsCommitAncestor,
  parseArgs,
  renderMarkdown,
  resolverOptions
} = require('../scripts/generate-cm2115-r2-self-review-decision');
const { canonicalize } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

const IMPLEMENTATION_COMMIT = '9'.repeat(40);
const IMPLEMENTATION_TREE = '8'.repeat(40);

function fakeBlobOid(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function implementationArtifact(path) {
  return { path, blobOid: fakeBlobOid(`self-review:${path}`) };
}

function reviewImplementation() {
  return {
    commit: IMPLEMENTATION_COMMIT,
    tree: IMPLEMENTATION_TREE,
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(implementationArtifact)
  };
}

function resolvers(overrides = {}) {
  const base = {
    resolveGitFile: (commit, sourcePath) => {
      if (commit === IMPLEMENTATION_COMMIT) {
        const artifact = implementationArtifact(sourcePath);
        if (!IMPLEMENTATION_ARTIFACT_PATHS.includes(sourcePath)) throw new Error('fake_artifact_missing');
        return {
          sourceCommit: commit,
          sourceTree: IMPLEMENTATION_TREE,
          sourcePath,
          gitMode: '100644',
          gitObjectType: 'blob',
          blobOid: artifact.blobOid,
          bytes: 1,
          sha256: '7'.repeat(64),
          content: Buffer.from('x')
        };
      }
      return git.resolveGitFile(commit, sourcePath);
    },
    resolveCommitTree: commit => commit === IMPLEMENTATION_COMMIT
      ? IMPLEMENTATION_TREE
      : git.resolveCommitTree(commit),
    resolveParentCommit: commit => commit === IMPLEMENTATION_COMMIT
      ? '7'.repeat(40)
      : git.resolveParentCommit(commit),
    resolveDiffPaths: (parent, commit) => {
      if (commit !== IMPLEMENTATION_COMMIT) return git.resolveDiffPaths(parent, commit);
      return parent === REVIEW_REQUEST_FREEZE.commit
        ? [...IMPLEMENTATION_LINEAGE_DIFF_PATHS]
        : [...IMPLEMENTATION_DIFF_PATHS];
    },
    resolveGitPathState: git.resolveGitPathState,
    resolveDurableClaim: resolveFrozenPhase2DurableClaim,
    isCommitAncestor: (ancestor, descendant) => {
      if (ancestor === REVIEW_REQUEST_FREEZE.commit && descendant === IMPLEMENTATION_COMMIT) return true;
      return realIsCommitAncestor(ancestor, descendant);
    }
  };
  return { ...base, ...overrides };
}

function validDecision() {
  const reviewEvidence = evaluateFrozenReviewRequest(resolvers());
  assert.equal(reviewEvidence.accepted, true, reviewEvidence.blockers.join(','));
  return buildDecision({ reviewImplementation: reviewImplementation(), reviewEvidence });
}

function mutate(decision, fn) {
  const copy = structuredClone(decision);
  fn(copy);
  copy.canonicalPayloadSha256 = sha256Canonical(copy.payload);
  return copy;
}

test('CM-2115-R2 internal self-review independently revalidates the frozen snapshot request', () => {
  const evidence = evaluateFrozenReviewRequest(resolvers());
  assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  assert.equal(evidence.requestEvaluation.snapshotContractAccepted, true);
  assert.equal(evidence.requestEvaluation.readyToSubmitForIndependentReview, true);
  assert.equal(evidence.requestEvaluation.fullPlanPackCompleted, false);
  assert.equal(evidence.requestEvaluation.readinessClaimed, false);
});

test('self-review rejects leading or trailing claims outside the canonical review-request Markdown', () => {
  for (const mutateBytes of [
    content => Buffer.concat([Buffer.from('STALE CLAIM: applicationAuthorized=true\n'), content]),
    content => Buffer.concat([content, Buffer.from('\nTRAILING CLAIM: readiness=true\n')])
  ]) {
    const base = resolvers();
    const evidence = evaluateFrozenReviewRequest({
      ...base,
      resolveGitFile: (commit, sourcePath) => {
        const actual = base.resolveGitFile(commit, sourcePath);
        return commit === REVIEW_REQUEST_FREEZE.commit && sourcePath === REVIEW_REQUEST_FREEZE.markdown.path
          ? { ...actual, content: mutateBytes(actual.content) }
          : actual;
      }
    });
    assert.equal(evidence.accepted, false);
    assert.ok(evidence.blockers.includes('selfReview.reviewRequestMarkdownMirror'));
  }
});

test('self-review generation replays the frozen Phase 2 claim without local governance state', () => {
  const options = resolverOptions();
  assert.equal(options.resolveDurableClaim, resolveFrozenPhase2DurableClaim);
  assert.notEqual(options.resolveDurableClaim, git.resolveDurableClaim);
  const bindingHash = '8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc';
  assert.equal(options.resolveDurableClaim(bindingHash).bindingHash, bindingHash);
});

test('CM-2115-R2 self-review decision passes only as an internal separate review', () => {
  const decision = validDecision();
  const result = evaluateDecision(decision, resolvers());
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.internalSelfReviewPassed, true);
  assert.equal(result.independentReviewPassed, true);
  assert.equal(result.independentReviewMode, 'repository_internal_separate_pass');
  assert.equal(result.externalReviewPassed, false);
  assert.equal(result.separateFullPlanApplicationMayBePrepared, true);
  assert.equal(result.fullPlanApplicationAuthorized, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(
    decision.payload.decisionReference,
    buildDecisionReference(decision.payload.reviewImplementation)
  );
});

test('self-review cannot impersonate external review or self-authorize completion', () => {
  const original = validDecision();
  const mutations = [
    copy => { copy.payload.reviewMode.externalReviewerClaimed = true; },
    copy => { copy.payload.reviewMode.externalReviewPerformed = true; },
    copy => { copy.payload.decisionBoundary.externalReviewPassed = true; },
    copy => { copy.payload.decisionBoundary.independentExternalReviewPassed = true; },
    copy => { copy.payload.decisionBoundary.selfReviewSatisfiesIndependentExternalReview = true; },
    copy => { copy.payload.decisionBoundary.fullPlanApplicationAuthorizedByThisDecision = true; },
    copy => { copy.payload.decisionBoundary.fullPlanPackCompleted = true; },
    copy => { copy.payload.currentState.readinessClaimed = true; },
    copy => { copy.payload.sideEffects.remoteActions = 1; }
  ];
  for (const change of mutations) {
    assert.equal(evaluateDecision(mutate(original, change), resolvers()).accepted, false);
  }
});

test('self-review rejects frozen request, resolver, implementation, or payload drift', () => {
  const decision = validDecision();
  assert.equal(evaluateDecision(decision, {}).accepted, false);
  assert.equal(evaluateDecision(decision, resolvers({
    resolveGitFile: (commit, sourcePath) => {
      const actual = resolvers().resolveGitFile(commit, sourcePath);
      if (commit === REVIEW_REQUEST_FREEZE.commit && sourcePath === REVIEW_REQUEST_FREEZE.json.path) {
        return { ...actual, sha256: 'f'.repeat(64) };
      }
      return actual;
    }
  })).accepted, false);
  assert.equal(evaluateDecision(decision, resolvers({
    resolveParentCommit: commit => commit === REVIEW_REQUEST_FREEZE.commit
      ? '0'.repeat(40)
      : resolvers().resolveParentCommit(commit)
  })).accepted, false);
  assert.equal(evaluateDecision(decision, resolvers({
    resolveDiffPaths: (parent, commit) => commit === REVIEW_REQUEST_FREEZE.commit
      ? [...REVIEW_REQUEST_DIFF_PATHS, 'docs/near-model-memory-plan-pack/unreviewed.md']
      : resolvers().resolveDiffPaths(parent, commit)
  })).accepted, false);
  assert.equal(evaluateDecision(decision, resolvers({
    resolveCommitTree: commit => commit === IMPLEMENTATION_COMMIT ? '0'.repeat(40) : git.resolveCommitTree(commit)
  })).accepted, false);
  assert.equal(evaluateDecision(decision, resolvers({
    resolveDiffPaths: (parent, commit) => parent === REVIEW_REQUEST_FREEZE.commit && commit === IMPLEMENTATION_COMMIT
      ? [...IMPLEMENTATION_LINEAGE_DIFF_PATHS, 'src/core/UnreviewedIntermediateDependency.js']
      : resolvers().resolveDiffPaths(parent, commit)
  })).accepted, false);
  assert.equal(evaluateDecision(decision, resolvers({
    resolveDiffPaths: (parent, commit) => commit === IMPLEMENTATION_COMMIT
      ? [...IMPLEMENTATION_ARTIFACT_PATHS, 'src/core/Unreviewed.js']
      : git.resolveDiffPaths(parent, commit)
  })).accepted, false);
  const drift = mutate(decision, copy => {
    copy.payload.reviewImplementation.artifacts[0].blobOid = 'a'.repeat(40);
  });
  assert.equal(evaluateDecision(drift, resolvers()).accepted, false);
  for (const change of [
    copy => { copy.payload.reviewImplementation.unauthorizedReadinessClaim = false; },
    copy => { copy.payload.reviewImplementation.artifacts[0].unauthorizedReadinessClaim = false; }
  ]) {
    assert.equal(evaluateDecision(mutate(decision, change), resolvers()).accepted, false);
  }
  const resigned = mutate(decision, copy => {
    copy.payload.reviewImplementation.commit = 'a'.repeat(40);
  });
  assert.notEqual(
    resigned.payload.decisionReference,
    buildDecisionReference(resigned.payload.reviewImplementation)
  );
  assert.equal(evaluateDecision(resigned, resolvers()).accepted, false);
});

test('self-review generator has fixed outputs and Markdown preserves exact JSON', () => {
  assert.deepEqual(parseArgs([]), { jsonSummary: false });
  assert.deepEqual(parseArgs(['--json']), { jsonSummary: true });
  assert.throws(() => parseArgs(['--output-json', '/tmp/x']), /no_output_or_other_arguments/);
  const decision = validDecision();
  const jsonText = `${JSON.stringify(canonicalize(decision), null, 2)}\n`;
  const markdown = renderMarkdown(decision, jsonText);
  assert.ok(markdown.includes('PASS_INTERNAL_SELF_REVIEW_ONLY'));
  assert.ok(markdown.includes(jsonText.trimEnd()));
  assert.ok(DECISION_PATH.endsWith('cm2115_r2_internal_self_review_decision.json'));
});
