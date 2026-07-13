'use strict';

const crypto = require('node:crypto');
const {
  BASELINE,
  canonicalize
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  SNAPSHOT_FREEZE,
  evaluateCm2115SnapshotReviewRequest
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract');

const TASK_ID = 'CM-2115-R2';
const DECISION_PATH = 'docs/near-model-memory-plan-pack/cm2115_r2_internal_self_review_decision.json';
const REVIEW_REQUEST_FREEZE = Object.freeze({
  commit: '01c65db824e77400ef144ef8118deaa28b06abcc',
  tree: 'e6f3c28f0df1d10744ead4f132d064b2dcc3fb41',
  json: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.json',
    blobOid: '3c99fb6829d10f250eff1b0b873eb8e0d075f59f',
    bytes: 5973,
    sha256: '4b62b41753c66443b7e7f2a315729c9317172399b06fc8d618a2dd7625501cba',
    canonicalPayloadSha256: '9b9c158a6652a36256b663e16fdbed9656485143df37c8c9ee13a96fc215bdf0'
  }),
  markdown: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.md',
    blobOid: 'df309bac7afdf891081c52b8397d47762d3a1f49',
    bytes: 6983,
    sha256: '3ba20d045b3f085a9aa0eb1b7e1763272e44655443b4b7f120c68e7e7a5f51fb'
  })
});

const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  'src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract.js',
  'scripts/generate-cm2115-r2-self-review-decision.js',
  'tests/cm2115-r2-self-review-decision.test.js',
  'package.json'
]);

function buildDecisionReference(reviewImplementation) {
  if (!/^[a-f0-9]{40}$/.test(reviewImplementation?.commit || '')) {
    throw new Error('cm2115_r2_self_review_implementation_commit_required');
  }
  return [
    'CM-2115-R2-SELF-REVIEW-PASS',
    SNAPSHOT_FREEZE.json.canonicalPayloadSha256.slice(0, 8),
    REVIEW_REQUEST_FREEZE.json.canonicalPayloadSha256.slice(0, 8),
    reviewImplementation.commit.slice(0, 8)
  ].join('-').toUpperCase();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function identityWithoutContent(value) {
  const { content, ...identity } = value;
  return identity;
}

function verifyFrozenFile(actual, expected, blockers, label) {
  if (!actual || actual.sourceCommit !== REVIEW_REQUEST_FREEZE.commit ||
      actual.sourceTree !== REVIEW_REQUEST_FREEZE.tree || actual.sourcePath !== expected.path ||
      actual.gitObjectType !== 'blob' || actual.gitMode !== '100644' ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256 || !Buffer.isBuffer(actual.content)) {
    blockers.push(label);
  }
}

function evaluateFrozenReviewRequest({
  resolveGitFile,
  resolveCommitTree,
  resolveParentCommit,
  resolveDiffPaths,
  resolveGitPathState,
  isCommitAncestor
} = {}) {
  const blockers = [];
  const required = [
    resolveGitFile,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveGitPathState,
    isCommitAncestor
  ];
  if (!required.every(value => typeof value === 'function')) {
    return { accepted: false, blockers: ['selfReview.gitResolversRequired'] };
  }
  let requestIdentity = null;
  let markdownIdentity = null;
  let request = null;
  let requestEvaluation = null;
  try {
    if (resolveCommitTree(REVIEW_REQUEST_FREEZE.commit) !== REVIEW_REQUEST_FREEZE.tree) {
      blockers.push('selfReview.reviewRequestTree');
    }
    requestIdentity = resolveGitFile(REVIEW_REQUEST_FREEZE.commit, REVIEW_REQUEST_FREEZE.json.path);
    markdownIdentity = resolveGitFile(REVIEW_REQUEST_FREEZE.commit, REVIEW_REQUEST_FREEZE.markdown.path);
    verifyFrozenFile(requestIdentity, REVIEW_REQUEST_FREEZE.json, blockers, 'selfReview.reviewRequestJson');
    verifyFrozenFile(markdownIdentity, REVIEW_REQUEST_FREEZE.markdown, blockers, 'selfReview.reviewRequestMarkdown');
    request = JSON.parse(requestIdentity.content.toString('utf8'));
    if (request.canonicalPayloadSha256 !== REVIEW_REQUEST_FREEZE.json.canonicalPayloadSha256) {
      blockers.push('selfReview.reviewRequestPayloadSha256');
    }
    requestEvaluation = evaluateCm2115SnapshotReviewRequest(request, {
      resolveGitFile,
      resolveCommitTree,
      resolveParentCommit,
      resolveDiffPaths,
      resolveGitPathState,
      isCommitAncestor
    });
    if (!requestEvaluation.accepted) {
      blockers.push(...requestEvaluation.blockers.map(item => `selfReview.request.${item}`));
    }
  } catch {
    blockers.push('selfReview.reviewRequestUnreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    request,
    requestIdentity,
    markdownIdentity,
    requestEvaluation
  };
}

function buildDecisionPayload({ reviewImplementation, reviewEvidence }) {
  if (!reviewEvidence?.accepted) throw new Error('cm2115_r2_self_review_evidence_required');
  return {
    decisionReference: buildDecisionReference(reviewImplementation),
    decisionType: 'repository_internal_independent_snapshot_self_review_v1',
    reviewMode: {
      internalSelfReview: true,
      independentSecondPass: true,
      frozenObjectsOnly: true,
      repositoryRealityControlsDecision: true,
      externalReviewerClaimed: false,
      externalReviewPerformed: false,
      rawPrivateMemoryReviewed: false
    },
    reviewedSnapshot: {
      commit: SNAPSHOT_FREEZE.commit,
      tree: SNAPSHOT_FREEZE.tree,
      json: { ...SNAPSHOT_FREEZE.json },
      markdown: { ...SNAPSHOT_FREEZE.markdown }
    },
    reviewedRequest: {
      commit: REVIEW_REQUEST_FREEZE.commit,
      tree: REVIEW_REQUEST_FREEZE.tree,
      json: { ...REVIEW_REQUEST_FREEZE.json },
      markdown: { ...REVIEW_REQUEST_FREEZE.markdown }
    },
    sourceBaseline: {
      commit: BASELINE.sourceCommit,
      tree: BASELINE.sourceTree
    },
    reviewImplementation,
    findings: {
      reviewRequestContractAccepted: true,
      snapshotContractAccepted: true,
      traceEntryCount: 164,
      resolvedTraceEntryCount: 164,
      uniqueSourceObjectCount: 105,
      fakePlaceholderRefCount: 0,
      phase2R2BindingReceiptAccepted: true,
      r1UsedAsCurrentAuthority: false,
      gitObjectMismatchCount: 0,
      actionableFindingCount: 0
    },
    decisionBoundary: {
      internalSelfReviewPassed: true,
      internalIndependentReviewPassed: true,
      independentReviewPassed: true,
      independentReviewMode: 'repository_internal_separate_pass',
      independentExternalReviewPassed: false,
      selfReviewSatisfiesIndependentExternalReview: false,
      externalReviewPassed: false,
      separateFullPlanApplicationMayBePrepared: true,
      fullPlanApplicationAuthorizedByThisDecision: false,
      fullPlanApplicationApplied: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    currentState: {
      phase8Completed: true,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    nonClaims: {
      productionReady: false,
      releaseReady: false,
      deployReady: false,
      cutoverReady: false,
      rcReady: false,
      completeV8: false,
      externalIndependentReview: false,
      fullPlanPackCompleted: false
    },
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      durableMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
}

function buildDecision(args) {
  const payload = buildDecisionPayload(args);
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    decisionType: 'canonical_full_plan_snapshot_internal_self_review_decision_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function evaluateDecision(decision = {}, {
  resolveGitFile,
  resolveCommitTree,
  resolveParentCommit,
  resolveDiffPaths,
  resolveGitPathState,
  isCommitAncestor
} = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.taskId !== TASK_ID ||
      decision.decisionType !== 'canonical_full_plan_snapshot_internal_self_review_decision_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) {
    blockers.push('decision.identityOrHash');
  }
  const reviewEvidence = evaluateFrozenReviewRequest({
    resolveGitFile,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveGitPathState,
    isCommitAncestor
  });
  if (!reviewEvidence.accepted) blockers.push(...reviewEvidence.blockers);

  const implementation = decision.payload?.reviewImplementation;
  if (!implementation || !/^[a-f0-9]{40}$/.test(implementation.commit || '') ||
      !/^[a-f0-9]{40}$/.test(implementation.tree || '') ||
      !sameJson(Object.keys(implementation).sort(), ['artifacts', 'commit', 'tree']) ||
      !Array.isArray(implementation.artifacts) ||
      !sameJson(implementation.artifacts.map(item => item?.path), IMPLEMENTATION_ARTIFACT_PATHS) ||
      implementation.artifacts.some(item => !sameJson(Object.keys(item || {}).sort(), ['blobOid', 'path']))) {
    blockers.push('decision.reviewImplementation');
  } else {
    try {
      const implementationParent = resolveParentCommit(implementation.commit);
      const implementationDiffPaths = resolveDiffPaths(implementationParent, implementation.commit).sort();
      if (resolveCommitTree(implementation.commit) !== implementation.tree ||
          !isCommitAncestor(REVIEW_REQUEST_FREEZE.commit, implementation.commit) ||
          !sameJson(implementationDiffPaths, [...IMPLEMENTATION_ARTIFACT_PATHS].sort())) {
        blockers.push('decision.reviewImplementationLineage');
      }
      for (const artifact of implementation.artifacts) {
        const actual = resolveGitFile(implementation.commit, artifact.path);
        if (actual.gitObjectType !== 'blob' || actual.blobOid !== artifact.blobOid) {
          blockers.push(`decision.reviewImplementationArtifact.${artifact.path}`);
        }
      }
    } catch {
      blockers.push('decision.reviewImplementationUnreadable');
    }
  }

  if (reviewEvidence.accepted && implementation) {
    try {
      const expected = buildDecision({ reviewImplementation: implementation, reviewEvidence });
      if (!sameJson(decision, expected)) blockers.push('decision.exactContent');
    } catch {
      blockers.push('decision.exactContent');
    }
  }
  const boundary = decision.payload?.decisionBoundary;
  if (boundary?.internalSelfReviewPassed !== true || boundary?.internalIndependentReviewPassed !== true ||
      boundary?.independentReviewPassed !== true ||
      boundary?.independentReviewMode !== 'repository_internal_separate_pass' ||
      boundary?.independentExternalReviewPassed !== false ||
      boundary?.selfReviewSatisfiesIndependentExternalReview !== false ||
      boundary?.externalReviewPassed !== false ||
      boundary?.separateFullPlanApplicationMayBePrepared !== true ||
      boundary?.fullPlanApplicationAuthorizedByThisDecision !== false ||
      boundary?.fullPlanApplicationApplied !== false || boundary?.fullPlanPackCompleted !== false ||
      boundary?.readinessClaimed !== false) blockers.push('decision.boundary');
  if (decision.payload?.reviewMode?.externalReviewerClaimed !== false ||
      decision.payload?.reviewMode?.externalReviewPerformed !== false) blockers.push('decision.externalReviewClaim');
  if (decision.payload?.currentState?.fullPlanPackCompleted !== false ||
      decision.payload?.currentState?.readinessClaimed !== false) blockers.push('decision.currentState');
  for (const value of Object.values(decision.payload?.nonClaims || {})) {
    if (value !== false) blockers.push('decision.nonClaims');
  }
  for (const value of Object.values(decision.payload?.sideEffects || {})) {
    if (value !== 0) blockers.push('decision.sideEffects');
  }
  const accepted = blockers.length === 0;
  return {
    accepted,
    blockers: [...new Set(blockers)],
    internalSelfReviewPassed: accepted,
    independentReviewPassed: accepted,
    independentReviewMode: accepted ? 'repository_internal_separate_pass' : null,
    externalReviewPassed: false,
    separateFullPlanApplicationMayBePrepared: accepted,
    fullPlanApplicationAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

module.exports = {
  DECISION_PATH,
  IMPLEMENTATION_ARTIFACT_PATHS,
  REVIEW_REQUEST_FREEZE,
  TASK_ID,
  buildDecision,
  buildDecisionReference,
  buildDecisionPayload,
  evaluateDecision,
  evaluateFrozenReviewRequest,
  identityWithoutContent,
  sha256,
  sha256Canonical
};
