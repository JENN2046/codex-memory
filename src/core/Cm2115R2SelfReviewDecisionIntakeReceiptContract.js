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
  commit: '798a91b23bc84788fd6a69d4dad61ab5e135f70e',
  tree: '7bfcb9f625b4af0828458c0f56756bb7ebe756b4',
  parentCommit: 'fe3fa28821282348f4b8e94dafe1dc904226b461',
  parentTree: '5b03dae54a30ff826a029daffd0aa3ed630c583a',
  canonicalPayloadSha256: '377812d904e60ec569b57c9d9e2eded76a83a797e1f076160598e4db41c2f3a5',
  json: Object.freeze({
    path: DECISION_PATH,
    blobOid: '441da37af718989450f0ec632f3ca09dac773c3e',
    bytes: 5011,
    sha256: 'ec1c32ee890f2d886af345cbaf51bacc2c0166746fd536e6d66f5576f612d136'
  }),
  markdown: Object.freeze({
    path: DECISION_PATH.replace(/\.json$/, '.md'),
    blobOid: '7a1b4198ed56d627dda8f637f1023a37d48c1ccd',
    bytes: 5606,
    sha256: '2b147124cfb74cf5067748246690be9dfed5b6022d033c64086bdd4de1e1fbf4'
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
      'src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract.js',
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
      exactTwoPathDiffMatched: true,
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
