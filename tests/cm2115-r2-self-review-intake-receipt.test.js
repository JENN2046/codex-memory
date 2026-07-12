'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const {
  INTAKE_IMPLEMENTATION_ARTIFACT_PATHS,
  INTAKE_IMPLEMENTATION_DIFF_PATHS,
  RECEIPT_PATH,
  SELF_REVIEW_DECISION_FREEZE,
  buildReceipt,
  buildReceiptReference,
  evaluateFrozenSelfReviewDecision,
  evaluateReceipt
} = require('../src/core/Cm2115R2SelfReviewDecisionIntakeReceiptContract');
const { sha256Canonical } = require('../src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract');
const git = require('../scripts/cm2115-r2-git');
const { isCommitAncestor: realIsCommitAncestor } = require('../scripts/generate-cm2115-r2-self-review-decision');
const {
  parseArgs,
  renderMarkdown
} = require('../scripts/generate-cm2115-r2-self-review-intake-receipt');
const { canonicalize } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

const IMPLEMENTATION_COMMIT = '9'.repeat(40);
const IMPLEMENTATION_TREE = '8'.repeat(40);

function fakeBlobOid(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function artifact(path) {
  return { path, blobOid: fakeBlobOid(`intake:${path}`) };
}

function intakeImplementation() {
  return {
    commit: IMPLEMENTATION_COMMIT,
    tree: IMPLEMENTATION_TREE,
    artifacts: INTAKE_IMPLEMENTATION_ARTIFACT_PATHS.map(artifact)
  };
}

function resolvers(overrides = {}) {
  const base = {
    resolveGitFile: (commit, sourcePath) => {
      if (commit === IMPLEMENTATION_COMMIT) {
        if (!INTAKE_IMPLEMENTATION_ARTIFACT_PATHS.includes(sourcePath)) throw new Error('fake_artifact_missing');
        const expected = artifact(sourcePath);
        return {
          sourceCommit: commit,
          sourceTree: IMPLEMENTATION_TREE,
          sourcePath,
          gitMode: '100644',
          gitObjectType: 'blob',
          blobOid: expected.blobOid,
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
      ? SELF_REVIEW_DECISION_FREEZE.commit
      : git.resolveParentCommit(commit),
    resolveDiffPaths: (fromCommit, toCommit) =>
      fromCommit === SELF_REVIEW_DECISION_FREEZE.commit && toCommit === IMPLEMENTATION_COMMIT
        ? [...INTAKE_IMPLEMENTATION_DIFF_PATHS]
        : git.resolveDiffPaths(fromCommit, toCommit),
    resolveGitPathState: git.resolveGitPathState,
    isCommitAncestor: (ancestor, descendant) => {
      if (ancestor === SELF_REVIEW_DECISION_FREEZE.commit && descendant === IMPLEMENTATION_COMMIT) return true;
      return realIsCommitAncestor(ancestor, descendant);
    }
  };
  return { ...base, ...overrides };
}

function validReceipt() {
  const frozenDecisionEvidence = evaluateFrozenSelfReviewDecision(resolvers());
  assert.equal(frozenDecisionEvidence.accepted, true, frozenDecisionEvidence.blockers.join(','));
  return buildReceipt({ intakeImplementation: intakeImplementation(), frozenDecisionEvidence });
}

function mutate(receipt, fn) {
  const copy = structuredClone(receipt);
  fn(copy);
  copy.canonicalPayloadSha256 = sha256Canonical(copy.payload);
  return copy;
}

test('frozen CM-2115-R2 self-review decision has exact Git identity and replays cleanly', () => {
  const evidence = evaluateFrozenSelfReviewDecision(resolvers());
  assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  assert.equal(evidence.decisionEvaluation.independentReviewPassed, true);
  assert.equal(evidence.decisionEvaluation.externalReviewPassed, false);
  assert.equal(evidence.decisionEvaluation.fullPlanPackCompleted, false);
  assert.equal(evidence.decisionEvaluation.readinessClaimed, false);
});

test('post-freeze intake receipt binds the decision and preserves the internal-only boundary', () => {
  const receipt = validReceipt();
  const result = evaluateReceipt(receipt, resolvers());
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.internalSelfReviewDecisionIntakeAccepted, true);
  assert.equal(result.independentReviewMode, 'repository_internal_separate_pass');
  assert.equal(result.independentExternalReviewPassed, false);
  assert.equal(result.externalReviewPerformedByThisIntake, false);
  assert.equal(result.historicalCm2080ExternalReviewPassedPreserved, true);
  assert.equal(result.fullPlanApplicationAuthorized, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(receipt.payload.receiptReference, buildReceiptReference(receipt.payload.intakeImplementation));
});

test('intake receipt rejects external-review, application, completion, readiness, or side-effect promotion', () => {
  const original = validReceipt();
  const mutations = [
    copy => { copy.payload.authorityBoundary.independentExternalReviewPassed = true; },
    copy => { copy.payload.authorityBoundary.selfReviewSatisfiesIndependentExternalReview = true; },
    copy => { copy.payload.authorityBoundary.externalReviewPerformedByThisIntake = true; },
    copy => { copy.payload.authorityBoundary.historicalCm2080ExternalReviewPassedPreserved = false; },
    copy => { copy.payload.authorityBoundary.fullPlanApplicationAuthorizedByThisReceipt = true; },
    copy => { copy.payload.authorityBoundary.fullPlanPackCompleted = true; },
    copy => { copy.payload.authorityBoundary.readinessClaimed = true; },
    copy => { copy.payload.sideEffects.nativeWrites = 1; }
  ];
  for (const change of mutations) {
    assert.equal(evaluateReceipt(mutate(original, change), resolvers()).accepted, false);
  }
});

test('intake receipt rejects missing resolvers, frozen decision drift, and implementation drift', () => {
  const receipt = validReceipt();
  assert.equal(evaluateReceipt(receipt, {}).accepted, false);
  assert.equal(evaluateReceipt(receipt, resolvers({
    resolveGitFile: (commit, sourcePath) => {
      const actual = resolvers().resolveGitFile(commit, sourcePath);
      if (commit === SELF_REVIEW_DECISION_FREEZE.commit && sourcePath === SELF_REVIEW_DECISION_FREEZE.json.path) {
        return { ...actual, blobOid: 'f'.repeat(40) };
      }
      return actual;
    }
  })).accepted, false);
  const implementationDrift = mutate(receipt, copy => {
    copy.payload.intakeImplementation.artifacts[0].blobOid = 'a'.repeat(40);
  });
  assert.equal(evaluateReceipt(implementationDrift, resolvers()).accepted, false);
  const referenceDrift = mutate(receipt, copy => {
    copy.payload.intakeImplementation.commit = 'a'.repeat(40);
  });
  assert.notEqual(referenceDrift.payload.receiptReference, buildReceiptReference(referenceDrift.payload.intakeImplementation));
  assert.equal(evaluateReceipt(referenceDrift, resolvers()).accepted, false);
  assert.equal(evaluateReceipt(receipt, resolvers({
    resolveParentCommit: commit => commit === IMPLEMENTATION_COMMIT
      ? '0'.repeat(40)
      : resolvers().resolveParentCommit(commit)
  })).accepted, false);
});

test('frozen decision intake fails closed on tree, parent, diff, byte, or Markdown identity drift', () => {
  const mutations = [
    {
      resolveCommitTree: commit => commit === SELF_REVIEW_DECISION_FREEZE.commit
        ? '0'.repeat(40)
        : resolvers().resolveCommitTree(commit)
    },
    {
      resolveParentCommit: commit => commit === SELF_REVIEW_DECISION_FREEZE.commit
        ? '0'.repeat(40)
        : resolvers().resolveParentCommit(commit)
    },
    {
      resolveDiffPaths: (fromCommit, toCommit) =>
        fromCommit === SELF_REVIEW_DECISION_FREEZE.parentCommit &&
          toCommit === SELF_REVIEW_DECISION_FREEZE.commit
          ? [...resolvers().resolveDiffPaths(fromCommit, toCommit), 'unexpected.txt']
          : resolvers().resolveDiffPaths(fromCommit, toCommit)
    },
    {
      resolveGitFile: (commit, sourcePath) => {
        const actual = resolvers().resolveGitFile(commit, sourcePath);
        if (commit === SELF_REVIEW_DECISION_FREEZE.commit &&
            sourcePath === SELF_REVIEW_DECISION_FREEZE.json.path) {
          return { ...actual, bytes: actual.bytes + 1 };
        }
        return actual;
      }
    },
    {
      resolveGitFile: (commit, sourcePath) => {
        const actual = resolvers().resolveGitFile(commit, sourcePath);
        if (commit === SELF_REVIEW_DECISION_FREEZE.commit &&
            sourcePath === SELF_REVIEW_DECISION_FREEZE.markdown.path) {
          return { ...actual, sha256: 'f'.repeat(64) };
        }
        return actual;
      }
    }
  ];
  for (const override of mutations) {
    assert.equal(evaluateFrozenSelfReviewDecision(resolvers(override)).accepted, false);
  }
});

test('intake generator has fixed outputs and exact Markdown mirror', () => {
  assert.deepEqual(parseArgs([]), { jsonSummary: false });
  assert.deepEqual(parseArgs(['--json']), { jsonSummary: true });
  assert.throws(() => parseArgs(['--output', '/tmp/x']), /no_output_or_other_arguments/);
  const receipt = validReceipt();
  const jsonText = `${JSON.stringify(canonicalize(receipt), null, 2)}\n`;
  const markdown = renderMarkdown(receipt, jsonText);
  assert.ok(markdown.includes('PASS_INTERNAL_SELF_REVIEW_DECISION_INTAKE_ONLY'));
  assert.ok(markdown.includes(jsonText.trimEnd()));
  assert.ok(RECEIPT_PATH.endsWith('cm2115_r2_internal_self_review_decision_intake_receipt.json'));
});
