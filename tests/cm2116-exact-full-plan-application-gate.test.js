'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const {
  FUTURE_APPLICATION_TARGETS,
  GATE_IMPLEMENTATION_ARTIFACT_PATHS,
  GATE_IMPLEMENTATION_DIFF_PATHS,
  GATE_PATH,
  IMPLEMENTATION_PARENT_FREEZE,
  SELF_REVIEW_INTAKE_FREEZE,
  buildGate,
  buildGateReference,
  evaluateFrozenSelfReviewIntake,
  evaluateGate,
  expectedIntakeDiffEntries,
  expectedIntakeDiffPaths
} = require('../src/core/Cm2116ExactFullPlanApplicationGate');
const { sha256Canonical } = require('../src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract');
const { canonicalize } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const git = require('../scripts/cm2115-r2-git');
const { isCommitAncestor: realIsCommitAncestor } = require('../scripts/generate-cm2115-r2-self-review-decision');
const {
  parseArgs,
  renderMarkdown,
  resolverOptions
} = require('../scripts/generate-cm2116-exact-full-plan-application-gate');

const IMPLEMENTATION_COMMIT = '9'.repeat(40);
const IMPLEMENTATION_TREE = '8'.repeat(40);

function fakeBlobOid(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function artifact(path) {
  return { path, blobOid: fakeBlobOid(`cm2116:${path}`) };
}

function gateImplementation() {
  return {
    commit: IMPLEMENTATION_COMMIT,
    tree: IMPLEMENTATION_TREE,
    artifacts: GATE_IMPLEMENTATION_ARTIFACT_PATHS.map(artifact)
  };
}

function resolvers(overrides = {}) {
  const base = {
    resolveGitFile: (commit, sourcePath) => {
      if (commit === IMPLEMENTATION_COMMIT) {
        if (!GATE_IMPLEMENTATION_ARTIFACT_PATHS.includes(sourcePath)) throw new Error('fake_artifact_missing');
        return {
          sourceCommit: commit,
          sourceTree: IMPLEMENTATION_TREE,
          sourcePath,
          gitMode: '100644',
          gitObjectType: 'blob',
          blobOid: artifact(sourcePath).blobOid,
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
      ? IMPLEMENTATION_PARENT_FREEZE.commit
      : git.resolveParentCommit(commit),
    resolveDiffPaths: (parent, commit) =>
      parent === IMPLEMENTATION_PARENT_FREEZE.commit && commit === IMPLEMENTATION_COMMIT
        ? [...GATE_IMPLEMENTATION_DIFF_PATHS]
        : git.resolveDiffPaths(parent, commit),
    resolveDiffEntries: (parent, commit) =>
      parent === SELF_REVIEW_INTAKE_FREEZE.parentCommit && commit === SELF_REVIEW_INTAKE_FREEZE.commit
        ? expectedIntakeDiffEntries()
        : [],
    resolveGitPathState: git.resolveGitPathState,
    resolveDurableClaim: git.resolveDurableClaim,
    isCommitAncestor: (ancestor, descendant) => {
      if (ancestor === SELF_REVIEW_INTAKE_FREEZE.commit && descendant === IMPLEMENTATION_COMMIT) return true;
      return realIsCommitAncestor(ancestor, descendant);
    }
  };
  return { ...base, ...overrides };
}

function validGate() {
  const intakeEvidence = evaluateFrozenSelfReviewIntake(resolvers());
  assert.equal(intakeEvidence.accepted, true, intakeEvidence.blockers.join(','));
  return buildGate({ gateImplementation: gateImplementation(), intakeEvidence });
}

function mutate(gate, change) {
  const copy = structuredClone(gate);
  change(copy);
  copy.canonicalPayloadSha256 = sha256Canonical(copy.payload);
  return copy;
}

test('CM-2116 replays the exact 7187 intake commit, A/A diff, both blobs, and nested receipt', () => {
  const evidence = evaluateFrozenSelfReviewIntake(resolvers());
  assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  assert.deepEqual(expectedIntakeDiffPaths(), [
    SELF_REVIEW_INTAKE_FREEZE.json.path,
    SELF_REVIEW_INTAKE_FREEZE.markdown.path
  ].sort());
  assert.equal(evidence.receiptEvaluation.independentReviewPassed, true);
  assert.equal(evidence.receiptEvaluation.independentExternalReviewPassed, false);
  assert.equal(evidence.receiptEvaluation.fullPlanPackCompleted, false);
});

test('CM-2116 exact gate prepares only a separate application decision', () => {
  const gate = validGate();
  const result = evaluateGate(gate, resolvers());
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.gatePrepared, true);
  assert.equal(result.readyForSeparateExactApplicationDecision, true);
  assert.equal(result.applicationAuthorized, false);
  assert.equal(result.applicationExecuted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(gate.payload.gateReference, buildGateReference(gate.payload.gateImplementation));
  assert.deepEqual(gate.payload.exactFutureApplicationScope.allowedTargets, FUTURE_APPLICATION_TARGETS);
});

test('gate rejects bare promotion of authority, application, completion, readiness, or side effects', () => {
  const original = validGate();
  const changes = [
    copy => { copy.payload.currentState.independentExternalReviewPassed = true; },
    copy => { copy.payload.currentState.fullPlanApplicationAuthorized = true; },
    copy => { copy.payload.currentState.fullPlanApplicationExecuted = true; },
    copy => { copy.payload.currentState.fullPlanPackCompleted = true; },
    copy => { copy.payload.currentState.readinessClaimed = true; },
    copy => { copy.payload.gateDecision.applicationAuthorizedByThisGate = true; },
    copy => { copy.payload.gateDecision.fullPlanPackCompletedByThisGate = true; },
    copy => { copy.payload.nonClaims.productionReady = true; },
    copy => { copy.payload.sideEffects.repositoryPatches = 1; }
  ];
  for (const change of changes) assert.equal(evaluateGate(mutate(original, change), resolvers()).accepted, false);
});

test('gate rejects receipt tree, parent, diff status, parent-presence, blob, byte, and hash drift', () => {
  const cases = [
    { resolveCommitTree: commit => commit === SELF_REVIEW_INTAKE_FREEZE.commit ? '0'.repeat(40) : resolvers().resolveCommitTree(commit) },
    { resolveParentCommit: commit => commit === SELF_REVIEW_INTAKE_FREEZE.commit ? '0'.repeat(40) : resolvers().resolveParentCommit(commit) },
    { resolveDiffPaths: (parent, commit) => parent === SELF_REVIEW_INTAKE_FREEZE.parentCommit && commit === SELF_REVIEW_INTAKE_FREEZE.commit ? [SELF_REVIEW_INTAKE_FREEZE.json.path] : resolvers().resolveDiffPaths(parent, commit) },
    { resolveDiffEntries: () => expectedIntakeDiffEntries().map((entry, index) => index === 0 ? { ...entry, status: 'M' } : entry) },
    { resolveGitPathState: (commit, path) => commit === SELF_REVIEW_INTAKE_FREEZE.parentCommit && path === SELF_REVIEW_INTAKE_FREEZE.json.path ? { sourceCommit: commit, sourcePath: path, exists: true } : git.resolveGitPathState(commit, path) },
    { resolveGitFile: (commit, path) => { const actual = resolvers().resolveGitFile(commit, path); return commit === SELF_REVIEW_INTAKE_FREEZE.commit && path === SELF_REVIEW_INTAKE_FREEZE.json.path ? { ...actual, blobOid: 'f'.repeat(40) } : actual; } },
    { resolveGitFile: (commit, path) => { const actual = resolvers().resolveGitFile(commit, path); return commit === SELF_REVIEW_INTAKE_FREEZE.commit && path === SELF_REVIEW_INTAKE_FREEZE.json.path ? { ...actual, bytes: actual.bytes + 1 } : actual; } },
    { resolveGitFile: (commit, path) => { const actual = resolvers().resolveGitFile(commit, path); return commit === SELF_REVIEW_INTAKE_FREEZE.commit && path === SELF_REVIEW_INTAKE_FREEZE.markdown.path ? { ...actual, sha256: 'f'.repeat(64) } : actual; } }
  ];
  for (const override of cases) {
    assert.equal(evaluateFrozenSelfReviewIntake(resolvers(override)).accepted, false);
  }
});

test('gate rejects missing resolvers, implementation drift, extra patch paths, and readiness-boundary drift', () => {
  const gate = validGate();
  assert.equal(evaluateGate(gate, {}).accepted, false);
  assert.equal(evaluateGate(gate, resolvers({
    resolveParentCommit: commit => commit === IMPLEMENTATION_COMMIT
      ? '0'.repeat(40)
      : resolvers().resolveParentCommit(commit)
  })).accepted, false);
  const artifactDrift = mutate(gate, copy => {
    copy.payload.gateImplementation.artifacts[0].blobOid = 'a'.repeat(40);
  });
  assert.equal(evaluateGate(artifactDrift, resolvers()).accepted, false);
  const hiddenImplementationAuthority = mutate(gate, copy => {
    copy.payload.gateImplementation.applicationAuthorized = true;
  });
  assert.equal(evaluateGate(hiddenImplementationAuthority, resolvers()).accepted, false);
  const hiddenArtifactAuthority = mutate(gate, copy => {
    copy.payload.gateImplementation.artifacts[0].unexpectedBareBoolean = true;
  });
  assert.equal(evaluateGate(hiddenArtifactAuthority, resolvers()).accepted, false);
  const extraTarget = mutate(gate, copy => {
    copy.payload.exactFutureApplicationScope.allowedTargets.push({ path: 'STATUS.md', operation: 'modify' });
  });
  assert.equal(evaluateGate(extraTarget, resolvers()).accepted, false);
  const readinessDrift = mutate(gate, copy => {
    copy.payload.exactFutureApplicationScope.readinessFieldsMustRemainFalse.pop();
  });
  assert.equal(evaluateGate(readinessDrift, resolvers()).accepted, false);
  const claimedReadiness = mutate(gate, copy => {
    copy.payload.nonClaims.releaseReadyClaimed = true;
  });
  assert.equal(evaluateGate(claimedReadiness, resolvers()).accepted, false);
});

test('gate generator fixes output paths and Markdown is an exact JSON mirror', () => {
  assert.deepEqual(parseArgs([]), { jsonSummary: false });
  assert.deepEqual(parseArgs(['--json']), { jsonSummary: true });
  assert.throws(() => parseArgs(['--output', '/tmp/x']), /no_output_or_other_arguments/);
  const gate = validGate();
  const jsonText = `${JSON.stringify(canonicalize(gate), null, 2)}\n`;
  const markdown = renderMarkdown(gate, jsonText);
  assert.ok(markdown.includes('PASS_GATE_PREPARED_ONLY'));
  assert.ok(markdown.includes(jsonText.trimEnd()));
  assert.ok(GATE_PATH.endsWith('cm2116_r1_exact_full_plan_application_gate.json'));
});

test('gate resolver factory rejects Git repository and object overrides', () => {
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_OBJECT_DIRECTORY', 'GIT_INDEX_FILE']) {
    const previous = process.env[key];
    process.env[key] = '/tmp/alternate-git-state';
    try {
      assert.throws(() => resolverOptions(), /unsafe_git_environment/);
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
});
