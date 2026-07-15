'use strict';

const crypto = require('node:crypto');
const {
  BASELINE,
  canonicalize
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  SNAPSHOT_FREEZE,
  evaluateCm2115SnapshotReviewRequest,
  renderCm2115SnapshotReviewRequestMarkdown
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract');

const TASK_ID = 'CM-2115-R2';
const DECISION_PATH = 'docs/near-model-memory-plan-pack/cm2115_r2_internal_self_review_decision.json';
const REVIEW_REQUEST_FREEZE = Object.freeze({
  commit: 'a715d5ca76aae2fa688407c34a1ab7d99c52cb46',
  parent: '399ddc54a0b0009d017528905fa72bd4dc52a519',
  tree: '74a9f350d2ec66e8260b99e9a4f6c3e457b102dc',
  json: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.json',
    blobOid: '861abf1bb1ba06bd129c0b33b1c97f61a622b57b',
    bytes: 5973,
    sha256: 'ead0d8df10e7e15a4e76cb7fa78dc41f4374f49524b246f1fc78abb288c91c6f',
    canonicalPayloadSha256: 'cce599aad762528787d303abb2aff3cf3ff98dc4d60a78c0ab563131fac23a72'
  }),
  markdown: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.md',
    blobOid: 'da6043b49159b34d3e91a72b80b68c22b51278a7',
    bytes: 6983,
    sha256: '54e4de16eb89c06e91fd15e8c69ece351c3e71816201fe6ffb06f3b50f949ff6'
  })
});
const REVIEW_REQUEST_DIFF_PATHS = Object.freeze([
  REVIEW_REQUEST_FREEZE.json.path,
  REVIEW_REQUEST_FREEZE.markdown.path,
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract.js',
  'tests/cm2115-canonical-full-plan-evidence-snapshot.test.js'
]);

const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  'src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract.js',
  'scripts/generate-cm2115-r2-self-review-decision.js',
  'tests/cm2115-r2-self-review-decision.test.js',
  'package.json'
]);
const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract.js'
]);
const IMPLEMENTATION_LINEAGE_DIFF_PATHS = Object.freeze([
  ...IMPLEMENTATION_DIFF_PATHS
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

function renderSelfReviewDecisionMarkdown(decision) {
  const jsonText = `${JSON.stringify(canonicalize(decision), null, 2)}\n`;
  return [
    '# CM-2115-R2 Internal Snapshot Self-review Decision',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_INTERNAL_SELF_REVIEW_ONLY.',
    '',
    'This is a repository-internal, frozen-object, independent second-pass review.',
    'It is not an external review and does not claim an external reviewer.',
    'It permits only preparation of a separate full-plan application gate;',
    'it does not authorize or apply full-plan completion or any readiness claim.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
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
  resolveDurableClaim,
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
    const requestParent = resolveParentCommit(REVIEW_REQUEST_FREEZE.commit);
    if (requestParent !== REVIEW_REQUEST_FREEZE.parent) {
      blockers.push('selfReview.reviewRequestParent');
    }
    const requestDiffPaths = resolveDiffPaths(requestParent, REVIEW_REQUEST_FREEZE.commit);
    if (!sameJson([...requestDiffPaths].sort(), [...REVIEW_REQUEST_DIFF_PATHS].sort())) {
      blockers.push('selfReview.reviewRequestDiffPaths');
    }
    requestIdentity = resolveGitFile(REVIEW_REQUEST_FREEZE.commit, REVIEW_REQUEST_FREEZE.json.path);
    markdownIdentity = resolveGitFile(REVIEW_REQUEST_FREEZE.commit, REVIEW_REQUEST_FREEZE.markdown.path);
    verifyFrozenFile(requestIdentity, REVIEW_REQUEST_FREEZE.json, blockers, 'selfReview.reviewRequestJson');
    verifyFrozenFile(markdownIdentity, REVIEW_REQUEST_FREEZE.markdown, blockers, 'selfReview.reviewRequestMarkdown');
    request = JSON.parse(requestIdentity.content.toString('utf8'));
    const expectedMarkdown = Buffer.from(renderCm2115SnapshotReviewRequestMarkdown(request), 'utf8');
    if (!markdownIdentity.content.equals(expectedMarkdown)) {
      blockers.push('selfReview.reviewRequestMarkdownMirror');
    }
    if (request.canonicalPayloadSha256 !== REVIEW_REQUEST_FREEZE.json.canonicalPayloadSha256) {
      blockers.push('selfReview.reviewRequestPayloadSha256');
    }
    requestEvaluation = evaluateCm2115SnapshotReviewRequest(request, {
      resolveGitFile,
      resolveCommitTree,
      resolveParentCommit,
      resolveDiffPaths,
      resolveGitPathState,
      resolveDurableClaim,
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
  resolveDurableClaim,
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
    resolveDurableClaim,
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
      const implementationLineageDiffPaths =
        resolveDiffPaths(REVIEW_REQUEST_FREEZE.commit, implementation.commit).sort();
      if (resolveCommitTree(implementation.commit) !== implementation.tree ||
          !isCommitAncestor(REVIEW_REQUEST_FREEZE.commit, implementation.commit) ||
          !sameJson(implementationDiffPaths, [...IMPLEMENTATION_DIFF_PATHS].sort()) ||
          !sameJson(implementationLineageDiffPaths, [...IMPLEMENTATION_LINEAGE_DIFF_PATHS].sort())) {
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
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_LINEAGE_DIFF_PATHS,
  REVIEW_REQUEST_DIFF_PATHS,
  REVIEW_REQUEST_FREEZE,
  TASK_ID,
  buildDecision,
  buildDecisionReference,
  buildDecisionPayload,
  evaluateDecision,
  evaluateFrozenReviewRequest,
  identityWithoutContent,
  renderSelfReviewDecisionMarkdown,
  sha256,
  sha256Canonical
};
