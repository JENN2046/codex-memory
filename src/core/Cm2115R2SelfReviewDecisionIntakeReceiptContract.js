'use strict';

const {
  DECISION_PATH,
  REVIEW_REQUEST_FREEZE,
  buildDecisionReference,
  evaluateDecision,
  identityWithoutContent,
  renderSelfReviewDecisionMarkdown,
  sha256,
  sha256Canonical
} = require('./Cm2115R2CanonicalSnapshotSelfReviewDecisionContract');
const { canonicalize } = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');

const TASK_ID = 'CM-2115-R2';
const RECEIPT_PATH = 'docs/near-model-memory-plan-pack/cm2115_r2_internal_self_review_decision_intake_receipt.json';
const SELF_REVIEW_DECISION_FREEZE = Object.freeze({
  commit: 'db494839c2b415316521bb5da3fd4a0db737106e',
  tree: '8f3c5f9efa23bd6f67167c2b780011a7078a01e1',
  parentCommit: 'b6009d521e8b1f87be244c7acac19417bc0bb1da',
  parentTree: '5d5d9275ed4513e99d6de8ec595fd8f42cd59358',
  canonicalPayloadSha256: '4295cddf6494c6002ff97b18364d0111accb8245a90e4992c8bdc5a301f53afc',
  json: Object.freeze({
    path: DECISION_PATH,
    blobOid: '2f9d1d228a50129eb6cf63e12aac879c2f3f2162',
    bytes: 5011,
    sha256: '79f9629da5b07b45808c8c57f8dd0b1c4c5a098187b6bee2505470264abfa14e'
  }),
  markdown: Object.freeze({
    path: DECISION_PATH.replace(/\.json$/, '.md'),
    blobOid: '8d425f8f1fef990da38fe17e4c4f2f02aa30230d',
    bytes: 5606,
    sha256: 'cb15f8b50adb58ef8dfef40f820d5d43de8f1de38d6c0383b2ca33fead0ade40'
  })
});

const INTAKE_IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'src/core/Cm2115R2SelfReviewDecisionIntakeReceiptContract.js',
  'tests/cm2115-r2-self-review-intake-receipt.test.js'
]);

const INTAKE_IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  ...INTAKE_IMPLEMENTATION_DIFF_PATHS,
  'src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract.js',
  'scripts/cm2115-r2-git.js',
  'scripts/generate-cm2115-r2-self-review-decision.js'
]);

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function verifyFrozenIdentity(actual, expected, blockers, label) {
  if (!actual || actual.sourceCommit !== SELF_REVIEW_DECISION_FREEZE.commit ||
      actual.sourceTree !== SELF_REVIEW_DECISION_FREEZE.tree || actual.sourcePath !== expected.path ||
      actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256 || !Buffer.isBuffer(actual.content)) {
    blockers.push(label);
  }
}

function evaluateFrozenSelfReviewDecision({
  resolveGitFile,
  resolveCommitTree,
  resolveParentCommit,
  resolveDiffPaths,
  resolveGitPathState,
  resolveDurableClaim,
  isCommitAncestor
} = {}) {
  const blockers = [];
  if (![resolveGitFile, resolveCommitTree, resolveParentCommit, resolveDiffPaths,
    resolveGitPathState, resolveDurableClaim, isCommitAncestor].every(value => typeof value === 'function')) {
    return { accepted: false, blockers: ['intake.gitResolversRequired'] };
  }
  let jsonIdentity = null;
  let markdownIdentity = null;
  let decision = null;
  let decisionEvaluation = null;
  try {
    if (resolveCommitTree(SELF_REVIEW_DECISION_FREEZE.commit) !== SELF_REVIEW_DECISION_FREEZE.tree ||
        resolveParentCommit(SELF_REVIEW_DECISION_FREEZE.commit) !== SELF_REVIEW_DECISION_FREEZE.parentCommit ||
        resolveCommitTree(SELF_REVIEW_DECISION_FREEZE.parentCommit) !== SELF_REVIEW_DECISION_FREEZE.parentTree) {
      blockers.push('intake.decisionLineage');
    }
    const diffPaths = resolveDiffPaths(
      SELF_REVIEW_DECISION_FREEZE.parentCommit,
      SELF_REVIEW_DECISION_FREEZE.commit
    ).sort();
    const expectedDiffPaths = [
      SELF_REVIEW_DECISION_FREEZE.json.path,
      SELF_REVIEW_DECISION_FREEZE.markdown.path,
      'tests/cm2115-r2-self-review-decision.test.js'
    ].sort();
    if (!sameJson(diffPaths, expectedDiffPaths)) blockers.push('intake.decisionDiffPaths');

    jsonIdentity = resolveGitFile(SELF_REVIEW_DECISION_FREEZE.commit, SELF_REVIEW_DECISION_FREEZE.json.path);
    markdownIdentity = resolveGitFile(
      SELF_REVIEW_DECISION_FREEZE.commit,
      SELF_REVIEW_DECISION_FREEZE.markdown.path
    );
    verifyFrozenIdentity(jsonIdentity, SELF_REVIEW_DECISION_FREEZE.json, blockers, 'intake.decisionJson');
    verifyFrozenIdentity(markdownIdentity, SELF_REVIEW_DECISION_FREEZE.markdown, blockers, 'intake.decisionMarkdown');
    decision = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (decision.canonicalPayloadSha256 !== SELF_REVIEW_DECISION_FREEZE.canonicalPayloadSha256 ||
        decision.payload?.decisionReference !== buildDecisionReference(decision.payload?.reviewImplementation)) {
      blockers.push('intake.decisionReferenceOrPayload');
    }
    if (markdownIdentity.content.toString('utf8') !== renderSelfReviewDecisionMarkdown(decision)) {
      blockers.push('intake.markdownMirror');
    }
    decisionEvaluation = evaluateDecision(decision, {
      resolveGitFile,
      resolveCommitTree,
      resolveParentCommit,
      resolveDiffPaths,
      resolveGitPathState,
      resolveDurableClaim,
      isCommitAncestor
    });
    if (!decisionEvaluation.accepted) {
      blockers.push(...decisionEvaluation.blockers.map(item => `intake.decision.${item}`));
    }
  } catch {
    blockers.push('intake.decisionUnreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    decision,
    decisionEvaluation,
    jsonIdentity,
    markdownIdentity
  };
}

function buildReceiptReference(intakeImplementation) {
  if (!/^[a-f0-9]{40}$/.test(intakeImplementation?.commit || '')) {
    throw new Error('cm2115_r2_self_review_intake_implementation_commit_required');
  }
  return [
    'CM-2115-R2-SELF-REVIEW-INTAKE-PASS',
    SELF_REVIEW_DECISION_FREEZE.canonicalPayloadSha256.slice(0, 8),
    SELF_REVIEW_DECISION_FREEZE.commit.slice(0, 8),
    intakeImplementation.commit.slice(0, 8)
  ].join('-').toUpperCase();
}

function buildReceiptPayload({ intakeImplementation, frozenDecisionEvidence }) {
  if (!frozenDecisionEvidence?.accepted) {
    throw new Error('cm2115_r2_frozen_self_review_decision_evidence_required');
  }
  const decision = frozenDecisionEvidence.decision;
  return {
    receiptReference: buildReceiptReference(intakeImplementation),
    receiptType: 'repository_internal_self_review_decision_post_freeze_intake_receipt_v1',
    selfReviewDecision: {
      reference: decision.payload.decisionReference,
      canonicalPayloadSha256: decision.canonicalPayloadSha256,
      json: identityWithoutContent(frozenDecisionEvidence.jsonIdentity),
      markdown: identityWithoutContent(frozenDecisionEvidence.markdownIdentity),
      parentCommit: SELF_REVIEW_DECISION_FREEZE.parentCommit,
      parentTree: SELF_REVIEW_DECISION_FREEZE.parentTree
    },
    reviewedSnapshot: decision.payload.reviewedSnapshot,
    reviewedRequest: decision.payload.reviewedRequest,
    intakeImplementation,
    intake: {
      exactSchemaAccepted: true,
      rawBytesMatched: true,
      gitBlobMatched: true,
      commitTreeAndParentMatched: true,
      exactDecisionArtifactPathCount: 2,
      exactDecisionArtifactPathsMatched: true,
      exactFreezeCommitPathCount: 3,
      exactFreezeCommitPathsMatched: true,
      supportingTestPathMatched: true,
      markdownMirrorMatched: true,
      decisionContractReplayed: true,
      frozenSnapshotReplayed: true,
      traceEntryCount: 164,
      resolvedTraceEntryCount: 164,
      uniqueSourceObjectCount: 105,
      sourceObjectMismatchCount: 0,
      actionableFindingCount: 0
    },
    authorityBoundary: {
      internalSelfReviewDecisionIntakeAccepted: true,
      independentReviewPassed: true,
      independentReviewMode: 'repository_internal_separate_pass',
      independentExternalReviewPassed: false,
      selfReviewSatisfiesIndependentExternalReview: false,
      externalReviewPerformedByThisIntake: false,
      historicalCm2080ExternalReviewPassedPreserved: true,
      scopedSelfReviewDoesNotModifyHistoricalExternalReviewSlot: true,
      separateFullPlanApplicationMayBePrepared: true,
      fullPlanApplicationAuthorizedByThisReceipt: false,
      fullPlanApplicationExecuted: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      durableMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
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
    }
  };
}

function buildReceipt(args) {
  const payload = buildReceiptPayload(args);
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    receiptType: 'repository_internal_self_review_decision_post_freeze_intake_receipt_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function evaluateReceipt(receipt = {}, options = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.receiptType !== 'repository_internal_self_review_decision_post_freeze_intake_receipt_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) {
    blockers.push('receipt.identityOrHash');
  }
  const frozenDecisionEvidence = evaluateFrozenSelfReviewDecision(options);
  if (!frozenDecisionEvidence.accepted) blockers.push(...frozenDecisionEvidence.blockers);

  const implementation = receipt.payload?.intakeImplementation;
  if (!implementation || !/^[a-f0-9]{40}$/.test(implementation.commit || '') ||
      !/^[a-f0-9]{40}$/.test(implementation.tree || '') ||
      !sameJson(Object.keys(implementation).sort(), ['artifacts', 'commit', 'tree']) ||
      !Array.isArray(implementation.artifacts) ||
      !sameJson(implementation.artifacts.map(item => item?.path), INTAKE_IMPLEMENTATION_ARTIFACT_PATHS) ||
      implementation.artifacts.some(item => !sameJson(Object.keys(item || {}).sort(), ['blobOid', 'path']))) {
    blockers.push('receipt.intakeImplementation');
  } else {
    try {
      if (options.resolveCommitTree(implementation.commit) !== implementation.tree ||
          options.resolveParentCommit(implementation.commit) !== SELF_REVIEW_DECISION_FREEZE.commit ||
          !sameJson(
            options.resolveDiffPaths(SELF_REVIEW_DECISION_FREEZE.commit, implementation.commit).sort(),
            [...INTAKE_IMPLEMENTATION_DIFF_PATHS].sort()
          ) || !options.isCommitAncestor(SELF_REVIEW_DECISION_FREEZE.commit, implementation.commit)) {
        blockers.push('receipt.intakeImplementationLineage');
      }
      for (const artifact of implementation.artifacts) {
        const actual = options.resolveGitFile(implementation.commit, artifact.path);
        if (actual.gitObjectType !== 'blob' || actual.blobOid !== artifact.blobOid) {
          blockers.push(`receipt.intakeImplementationArtifact.${artifact.path}`);
        }
      }
    } catch {
      blockers.push('receipt.intakeImplementationUnreadable');
    }
  }

  if (frozenDecisionEvidence.accepted && implementation) {
    try {
      const expected = buildReceipt({ intakeImplementation: implementation, frozenDecisionEvidence });
      if (!sameJson(receipt, expected)) blockers.push('receipt.exactContent');
    } catch {
      blockers.push('receipt.exactContent');
    }
  }
  const boundary = receipt.payload?.authorityBoundary;
  if (boundary?.internalSelfReviewDecisionIntakeAccepted !== true ||
      boundary?.independentReviewPassed !== true ||
      boundary?.independentReviewMode !== 'repository_internal_separate_pass' ||
      boundary?.independentExternalReviewPassed !== false ||
      boundary?.selfReviewSatisfiesIndependentExternalReview !== false ||
      boundary?.externalReviewPerformedByThisIntake !== false ||
      boundary?.historicalCm2080ExternalReviewPassedPreserved !== true ||
      boundary?.scopedSelfReviewDoesNotModifyHistoricalExternalReviewSlot !== true ||
      boundary?.separateFullPlanApplicationMayBePrepared !== true ||
      boundary?.fullPlanApplicationAuthorizedByThisReceipt !== false ||
      boundary?.fullPlanApplicationExecuted !== false || boundary?.fullPlanPackCompleted !== false ||
      boundary?.readinessClaimed !== false) blockers.push('receipt.authorityBoundary');
  for (const value of Object.values(receipt.payload?.sideEffects || {})) {
    if (value !== 0) blockers.push('receipt.sideEffects');
  }
  for (const value of Object.values(receipt.payload?.nonClaims || {})) {
    if (value !== false) blockers.push('receipt.nonClaims');
  }
  const accepted = blockers.length === 0;
  return {
    accepted,
    blockers: [...new Set(blockers)],
    internalSelfReviewDecisionIntakeAccepted: accepted,
    independentReviewPassed: accepted,
    independentReviewMode: accepted ? 'repository_internal_separate_pass' : null,
    independentExternalReviewPassed: false,
    externalReviewPerformedByThisIntake: false,
    historicalCm2080ExternalReviewPassedPreserved: accepted,
    separateFullPlanApplicationMayBePrepared: accepted,
    fullPlanApplicationAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

module.exports = {
  INTAKE_IMPLEMENTATION_ARTIFACT_PATHS,
  INTAKE_IMPLEMENTATION_DIFF_PATHS,
  RECEIPT_PATH,
  SELF_REVIEW_DECISION_FREEZE,
  TASK_ID,
  buildReceipt,
  buildReceiptPayload,
  buildReceiptReference,
  evaluateFrozenSelfReviewDecision,
  evaluateReceipt,
  sameJson,
  sha256
};
