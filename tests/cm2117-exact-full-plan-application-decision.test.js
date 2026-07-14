'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DECISION_MARKDOWN_PATH,
  DECISION_PATH,
  DECISION_HISTORICAL_IMMUTABLE_PATHS,
  DECISION_READINESS_FIELDS,
  FUTURE_APPLICATION_TARGETS,
  GATE_FREEZE,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  buildDecision,
  buildDecisionReference,
  buildPatchTargets,
  evaluateDecision,
  evaluateFrozenGate,
  expectedGateDiffEntries,
  expectedImplementationDiffEntries,
  fileProjection
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  BASELINE,
  PHASE2_APPLICATION_RECEIPT_PATH,
  sha256,
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  DECISION_REFERENCE: PHASE2_DECISION_REFERENCE,
  NONCE: PHASE2_NONCE,
  RECEIPT_ID: PHASE2_RECEIPT_ID,
  REGISTRY_REFERENCE: PHASE2_REGISTRY_REFERENCE
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const git = require('../scripts/cm2115-r2-git');
const {
  resolveDiffEntries: resolveRealDiffEntries
} = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const {
  main,
  parseArgs,
  renderMarkdown
} = require('../scripts/generate-cm2117-exact-full-plan-application-decision');
const { isCommitAncestor: realIsCommitAncestor } = require('../scripts/generate-cm2115-r2-self-review-decision');

const IMPLEMENTATION_COMMIT = '9'.repeat(40);
const IMPLEMENTATION_TREE = '8'.repeat(40);

function fakeArtifactContent(sourcePath) {
  return Buffer.from(`cm2117-artifact:${sourcePath}`);
}

function implementationArtifact(sourcePath) {
  return { path: sourcePath, blobOid: fileProjection(fakeArtifactContent(sourcePath)).blobOid };
}

function decisionImplementation() {
  return {
    commit: IMPLEMENTATION_COMMIT,
    tree: IMPLEMENTATION_TREE,
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(implementationArtifact)
  };
}

function baselineIdentity(sourcePath) {
  const actual = git.resolveGitFile(IMPLEMENTATION_PARENT_FREEZE.commit, sourcePath);
  return {
    ...actual,
    sourceCommit: IMPLEMENTATION_COMMIT,
    sourceTree: IMPLEMENTATION_TREE,
    content: Buffer.from(actual.content)
  };
}

function resolveFixtureDurableClaim(bindingHash) {
  const receiptIdentity = git.resolveGitFile(BASELINE.sourceCommit, PHASE2_APPLICATION_RECEIPT_PATH);
  const receipt = JSON.parse(receiptIdentity.content.toString('utf8'));
  return {
    schemaVersion: 1,
    registryReference: PHASE2_REGISTRY_REFERENCE,
    claimId: receipt.payload.registry.claimId,
    nonceHash: sha256(PHASE2_NONCE),
    receiptIdHash: sha256(PHASE2_RECEIPT_ID),
    bindingHash,
    decisionReference: PHASE2_DECISION_REFERENCE,
    authorizationUseCount: 1,
    authorizationReplayAllowed: false,
    patchInvocationCount: 1,
    state: 'CONSUMED_SUCCESS'
  };
}

function resolvers(overrides = {}) {
  const base = {
    resolveGitFile: (commit, sourcePath) => {
      if (commit === IMPLEMENTATION_COMMIT) {
        if (IMPLEMENTATION_ARTIFACT_PATHS.includes(sourcePath)) {
          const content = fakeArtifactContent(sourcePath);
          const projection = fileProjection(content);
          return {
            sourceCommit: commit,
            sourceTree: IMPLEMENTATION_TREE,
            sourcePath,
            gitMode: '100644',
            gitObjectType: 'blob',
            ...projection,
            content
          };
        }
        if (FUTURE_APPLICATION_TARGETS.some(item => item.path === sourcePath && item.operation === 'modify')) {
          return baselineIdentity(sourcePath);
        }
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
        ? [...IMPLEMENTATION_DIFF_PATHS]
        : git.resolveDiffPaths(parent, commit),
    resolveDiffEntries: (parent, commit) =>
      parent === IMPLEMENTATION_PARENT_FREEZE.commit && commit === IMPLEMENTATION_COMMIT
        ? expectedImplementationDiffEntries()
        : resolveRealDiffEntries(parent, commit),
    resolveGitPathState: (commit, sourcePath) => {
      if (commit === IMPLEMENTATION_COMMIT &&
          FUTURE_APPLICATION_TARGETS.some(item => item.path === sourcePath && item.operation === 'add')) {
        return { sourceCommit: commit, sourcePath, exists: false };
      }
      return git.resolveGitPathState(commit, sourcePath);
    },
    resolveDurableClaim: resolveFixtureDurableClaim,
    isCommitAncestor: (ancestor, descendant) => {
      if (ancestor === GATE_FREEZE.commit && descendant === IMPLEMENTATION_COMMIT) return true;
      return realIsCommitAncestor(ancestor, descendant);
    }
  };
  return { ...base, ...overrides };
}

function validDecision() {
  const options = resolvers();
  const gateEvidence = evaluateFrozenGate(options);
  assert.equal(gateEvidence.accepted, true, gateEvidence.blockers.join(','));
  const implementation = decisionImplementation();
  const decisionReference = buildDecisionReference(implementation);
  const targets = buildPatchTargets({
    baselineCommit: IMPLEMENTATION_COMMIT,
    baselineTree: IMPLEMENTATION_TREE,
    decisionReference,
    resolveGitFile: options.resolveGitFile,
    resolveGitPathState: options.resolveGitPathState
  });
  return buildDecision({
    decisionImplementation: implementation,
    gateEvidence,
    baselineCommit: IMPLEMENTATION_COMMIT,
    baselineTree: IMPLEMENTATION_TREE,
    targets
  });
}

function mutate(decision, change) {
  const copy = structuredClone(decision);
  change(copy);
  copy.canonicalPayloadSha256 = sha256Canonical(copy.payload);
  return copy;
}

test('CM-2117 replays the full frozen CM-2116-R1 gate and its nested 7187 intake', () => {
  const evidence = evaluateFrozenGate(resolvers());
  assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  assert.equal(evidence.gate.canonicalPayloadSha256, GATE_FREEZE.canonicalPayloadSha256);
  assert.equal(evidence.gate.payload.upstreamSelfReviewIntake.commit, '7187e5205806a7038a5cfaff8de46ac89ff953f3');
  assert.deepEqual(expectedGateDiffEntries().map(item => item.status), ['A', 'A']);
});

test('CM-2117 frozen replay does not depend on a live governance claim', () => {
  const liveResolver = git.resolveDurableClaim;
  git.resolveDurableClaim = () => { throw new Error('live_governance_claim_must_not_be_read'); };
  try {
    const evidence = evaluateFrozenGate(resolvers());
    assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  } finally {
    git.resolveDurableClaim = liveResolver;
  }
});

test('CM-2117 freezes five exact targets while keeping execution and completion closed', () => {
  const decision = validDecision();
  const result = evaluateDecision(decision, resolvers());
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.authorizationContentApproved, true);
  assert.equal(result.applicationExecutionAuthorized, false);
  assert.equal(result.finalExecutionReleaseRequired, true);
  assert.equal(result.applicationExecuted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.deepEqual(decision.payload.patchPlan.allowedTargets, FUTURE_APPLICATION_TARGETS);
  assert.equal(decision.payload.patchPlan.targets.length, 5);
  assert.equal(decision.payload.patchPlan.targets.at(-1).before, null);
  assert.ok(DECISION_HISTORICAL_IMMUTABLE_PATHS.includes(GATE_FREEZE.json.path));
  assert.ok(DECISION_HISTORICAL_IMMUTABLE_PATHS.includes(DECISION_PATH));
  assert.equal(new Set(DECISION_HISTORICAL_IMMUTABLE_PATHS).size, DECISION_HISTORICAL_IMMUTABLE_PATHS.length);
  assert.equal(decision.payload.patchPlan.executionReceiptIncludedInApplicationCommit, false);
  assert.equal(decision.payload.patchPlan.genericReceiptPathExceptionAllowed, false);
  assert.equal(decision.payload.allowedStateAfterBoundApplication.readiness.completeRealtimeMemory, false);
  assert.equal(decision.payload.nonClaims.completeRealtimeMemory, false);
});

test('decision rejects hidden authority, premature execution, completion, readiness, and side effects', () => {
  const decision = validDecision();
  const cases = [
    mutate(decision, copy => { copy.payload.hiddenApplicationAuthority = true; }),
    mutate(decision, copy => { copy.payload.authorizationContent.applicationExecutionAuthorized = true; }),
    mutate(decision, copy => { copy.payload.currentState.fullPlanPackCompleted = true; }),
    mutate(decision, copy => { copy.payload.nonClaims.releaseReadyClaimed = true; }),
    mutate(decision, copy => { copy.payload.currentSideEffects.repositoryPatches = 1; }),
    mutate(decision, copy => { copy.payload.decisionImplementation.hiddenAccepted = true; })
  ];
  for (const candidate of cases) {
    assert.equal(evaluateDecision(candidate, resolvers()).accepted, false);
  }
});

test('decision rejects gate lineage, A/A status, parent absence, blob, and payload drift', () => {
  const base = resolvers();
  assert.equal(evaluateFrozenGate(resolvers({
    resolveCommitTree: commit => commit === GATE_FREEZE.commit ? 'a'.repeat(40) : base.resolveCommitTree(commit)
  })).accepted, false);
  assert.equal(evaluateFrozenGate(resolvers({
    resolveDiffEntries: (parent, commit) => parent === GATE_FREEZE.parentCommit && commit === GATE_FREEZE.commit
      ? expectedGateDiffEntries().map(item => ({ ...item, status: 'M' }))
      : base.resolveDiffEntries(parent, commit)
  })).accepted, false);
  assert.equal(evaluateFrozenGate(resolvers({
    resolveGitPathState: (commit, sourcePath) => commit === GATE_FREEZE.parentCommit && sourcePath === GATE_FREEZE.json.path
      ? { sourceCommit: commit, sourcePath, exists: true }
      : base.resolveGitPathState(commit, sourcePath)
  })).accepted, false);
  assert.equal(evaluateFrozenGate(resolvers({
    resolveGitFile: (commit, sourcePath) => {
      const actual = base.resolveGitFile(commit, sourcePath);
      return commit === GATE_FREEZE.commit && sourcePath === GATE_FREEZE.json.path
        ? { ...actual, bytes: actual.bytes + 1 }
        : actual;
    }
  })).accepted, false);
});

test('decision rejects baseline, target order, before/after projection, and extra readiness drift', () => {
  const decision = validDecision();
  const cases = [
    mutate(decision, copy => { copy.payload.patchPlan.sourceBaselineTree = 'a'.repeat(40); }),
    mutate(decision, copy => { copy.payload.patchPlan.targets.reverse(); }),
    mutate(decision, copy => { copy.payload.patchPlan.targets[0].before.sha256 = 'b'.repeat(64); }),
    mutate(decision, copy => { copy.payload.patchPlan.targets[0].after.blobOid = 'c'.repeat(40); }),
    mutate(decision, copy => { copy.payload.patchPlan.allowedTargets.push({ path: 'STATUS.md', operation: 'modify' }); }),
    mutate(decision, copy => { copy.payload.allowedStateAfterBoundApplication.readiness.unknownReady = false; })
  ];
  for (const candidate of cases) {
    assert.equal(evaluateDecision(candidate, resolvers()).accepted, false);
  }
});

test('decision generator has fixed outputs and exact Markdown mirror', () => {
  assert.deepEqual(parseArgs([]), { jsonSummary: false });
  assert.deepEqual(parseArgs(['--json']), { jsonSummary: true });
  assert.throws(() => parseArgs(['--output', '/tmp/other.json']), /no_output_or_other_arguments_allowed/);
  const decision = validDecision();
  const jsonText = `${JSON.stringify(decision, null, 2)}\n`;
  const markdown = renderMarkdown(decision, jsonText);
  assert.ok(markdown.includes('PASS_CONTENT_DECISION_ONLY'));
  assert.ok(markdown.includes(jsonText.trimEnd()));
  assert.ok(DECISION_PATH.endsWith('cm2117_exact_full_plan_application_decision.json'));
  assert.ok(DECISION_MARKDOWN_PATH.endsWith('cm2117_exact_full_plan_application_decision.md'));
  assert.equal(new Set(DECISION_READINESS_FIELDS).size, DECISION_READINESS_FIELDS.length);
});

test('decision generator rejects unsafe Git environment before its first Git read', () => {
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = '/tmp/cm2117-forbidden-git-dir';
  try {
    assert.throws(() => main([]), /cm2118_unsafe_git_environment:GIT_DIR/);
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
});
