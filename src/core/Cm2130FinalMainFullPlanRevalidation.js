'use strict';

const {
  STATUS_SYNC_PATHS
} = require('./Cm2118FullPlanApplicationExecution');
const {
  READINESS_FIELDS
} = require('./Cm2120FullPlanApplicationReceiptReview');
const {
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  sameJson,
  serializeArtifact
} = require('./Cm2117ExactFullPlanApplicationDecision');

const TASK_ID = 'CM-2130';
const VALIDATION_ID = 'CMV-2215';
const BASELINE_COMMIT = 'd78ad8f7c0d3e3dc1c713870d07faf7958ecb84c';
const BASELINE_TREE = '0a503ded7180f2a38bedda7d2fd61c1f98beffea';
const ARTIFACT_PATH = 'docs/near-model-memory-plan-pack/cm2130_final_main_full_plan_revalidation.json';
const ARTIFACT_MARKDOWN_PATH = ARTIFACT_PATH.replace(/\.json$/, '.md');
const VERDICT = 'PASS_FINAL_MAIN_EVIDENCE_REVALIDATED_STATUS_SYNC_STILL_SEPARATE_READINESS_FALSE';

const MERGE_CHAIN = Object.freeze([
  Object.freeze({
    pullRequest: 14,
    commit: 'b844ead2a0e003083351e2e44d0ee291483ffd17',
    tree: 'e0f03f6057c280aec25aa7db6ceb523733626267',
    firstParent: 'ce539cd600d0c9da49b9ae7a84da59e14529e4b5',
    secondParent: '2bd19b1badb7bedc0d495da02399005c6c613c0d'
  }),
  Object.freeze({
    pullRequest: 15,
    commit: 'faa639161a01adb225980ff2bd8ca2207c01e99e',
    tree: '724abf2cf3ebe324286d8639a88fbb0e14e216a0',
    firstParent: 'b844ead2a0e003083351e2e44d0ee291483ffd17',
    secondParent: '5c87f54c8508d733b22ac35a43aaff76eced2380'
  }),
  Object.freeze({
    pullRequest: 16,
    commit: '543ce430d24c037962f2527d8462426d5530ce17',
    tree: '4a202c1d06a7be112d80f7cc634f3c5fdfd299ac',
    firstParent: 'faa639161a01adb225980ff2bd8ca2207c01e99e',
    secondParent: '337cf67e7c5ed5c2c99a26269e550630370c0232'
  }),
  Object.freeze({
    pullRequest: 17,
    commit: '4b504ab5ee106128da377dda5c17e06a7fecae16',
    tree: '8b54764d0d86d7ff5a4f406c5f787fcbece54ea9',
    firstParent: '543ce430d24c037962f2527d8462426d5530ce17',
    secondParent: '063af475041c18cc70889e05750e29473fd62bc9'
  }),
  Object.freeze({
    pullRequest: 18,
    commit: '9f93fa4d1cc2f86ecdadfd9ca0bc66b67cc2f0ab',
    tree: '08b7ec9821a80e40889ba5659514c06e64ac707a',
    firstParent: '4b504ab5ee106128da377dda5c17e06a7fecae16',
    secondParent: '84f9296b83f82b5f8ccad7cccbeaa784ca72cb53'
  }),
  Object.freeze({
    pullRequest: 19,
    commit: BASELINE_COMMIT,
    tree: BASELINE_TREE,
    firstParent: '9f93fa4d1cc2f86ecdadfd9ca0bc66b67cc2f0ab',
    secondParent: '00660398a0aa29ec97dffe80d88cbaa886460319'
  })
]);

const EVIDENCE_PATHS = Object.freeze([
  'docs/near-model-memory-plan-pack/cm2120_full_plan_application_execution_receipt.json',
  'docs/near-model-memory-plan-pack/cm2120_full_plan_application_execution_receipt.md',
  'docs/near-model-memory-plan-pack/cm2120_full_plan_application_binding_receipt.json',
  'docs/near-model-memory-plan-pack/cm2120_full_plan_application_binding_receipt.md',
  'docs/near-model-memory-plan-pack/cm2120_full_plan_application_receipt_review_decision.json',
  'docs/near-model-memory-plan-pack/cm2120_full_plan_application_receipt_review_decision.md',
  'docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.json',
  'docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.md',
  'docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_content_decision.json',
  'docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_content_decision.md',
  'docs/near-model-memory-plan-pack/cm2128_branch_cas_claim_receipt.json',
  'docs/near-model-memory-plan-pack/cm2128_branch_cas_execution_receipt.json',
  'docs/near-model-memory-plan-pack/cm2128_branch_cas_receipt_freeze_manifest.json',
  'docs/near-model-memory-plan-pack/cm2128_branch_cas_receipt_freeze_manifest.md',
  'docs/near-model-memory-plan-pack/cm2129_branch_cas_receipt_review.json',
  'docs/near-model-memory-plan-pack/cm2129_branch_cas_receipt_review.md',
  'docs/near-model-memory-plan-pack/cm2129_post_execution_hardening_boundary.md'
]);

const ZERO_SIDE_EFFECTS = Object.freeze({
  repositoryPatches: 0,
  applicationCommits: 0,
  branchRefUpdates: 0,
  receiptWrites: 0,
  nativeReads: 0,
  nativeWrites: 0,
  providerCalls: 0,
  realMemoryReads: 0,
  remoteActions: 0,
  readinessClaims: 0
});

function identityOf(resolved) {
  return {
    path: resolved.path,
    blobOid: resolved.blobOid,
    bytes: resolved.bytes,
    sha256: resolved.sha256
  };
}

function parseJson(resolved, blockers) {
  try {
    return JSON.parse(resolved.content.toString('utf8'));
  } catch {
    blockers.push(`evidence.invalidJson:${resolved.path}`);
    return {};
  }
}

function checkWrappedArtifact(value, sourcePath, blockers) {
  if (value.schemaVersion !== 1 || !value.payload ||
      value.canonicalPayloadSha256 !== sha256Canonical(value.payload)) {
    blockers.push(`evidence.identityOrCanonicalHash:${sourcePath}`);
  }
}

function readinessFalse(value = {}) {
  return sameJson(Object.keys(value).sort(), [...READINESS_FIELDS].sort()) &&
    READINESS_FIELDS.every(field => value[field] === false);
}

function zeroBoundary(value = {}, fields) {
  return fields.every(field => value[field] === 0);
}

function validateEvidence(parsed, blockers) {
  const execution = parsed.get(EVIDENCE_PATHS[0]);
  const binding = parsed.get(EVIDENCE_PATHS[2]);
  const review = parsed.get(EVIDENCE_PATHS[4]);
  const application = parsed.get(EVIDENCE_PATHS[6]);
  const decision = parsed.get(EVIDENCE_PATHS[8]);
  const claim = parsed.get(EVIDENCE_PATHS[10]);
  const branchExecution = parsed.get(EVIDENCE_PATHS[11]);
  const manifest = parsed.get(EVIDENCE_PATHS[12]);
  const branchReview = parsed.get(EVIDENCE_PATHS[14]);

  for (const [sourcePath, value] of [
    [EVIDENCE_PATHS[0], execution],
    [EVIDENCE_PATHS[2], binding],
    [EVIDENCE_PATHS[4], review],
    [EVIDENCE_PATHS[6], application],
    [EVIDENCE_PATHS[8], decision],
    [EVIDENCE_PATHS[11], branchExecution],
    [EVIDENCE_PATHS[12], manifest],
    [EVIDENCE_PATHS[14], branchReview]
  ]) checkWrappedArtifact(value, sourcePath, blockers);

  if (execution.taskId !== 'CM-2118' || binding.taskId !== 'CM-2118' ||
      review.taskId !== 'CM-2120' || review.payload?.oneShotResult?.finalState !== 'CONSUMED_SUCCESS' ||
      review.payload?.oneShotResult?.authorizationConsumed !== true ||
      review.payload?.oneShotResult?.authorizationReplayAllowed !== false ||
      review.payload?.appliedEvidence?.fullPlanPackCompleted !== true ||
      review.payload?.appliedEvidence?.statusSyncPerformed !== false ||
      review.payload?.appliedEvidence?.statusSyncAuthorizedByThisDecision !== false ||
      !readinessFalse(review.payload?.appliedEvidence?.readiness)) {
    blockers.push('evidence.fullPlanApplicationReceiptBoundary');
  }

  if (application.taskId !== 'CM-2121' || application.payload?.currentState?.applicationExecuted !== false ||
      application.payload?.currentState?.statusSyncPerformed !== false ||
      application.payload?.currentState?.currentBranchStatusSynchronized !== false ||
      application.payload?.currentState?.readinessClaimed !== false ||
      !readinessFalse(application.payload?.nonClaims) || decision.taskId !== 'CM-2121' ||
      decision.payload?.currentState?.statusSyncExecutionAuthorized !== false ||
      decision.payload?.currentState?.statusSyncPerformed !== false ||
      decision.payload?.currentState?.branchRefUpdated !== false ||
      decision.payload?.currentState?.readinessClaimed !== false || !readinessFalse(decision.payload?.nonClaims)) {
    blockers.push('evidence.cm2121NonExecutingBoundary');
  }

  if (claim.schemaVersion !== 1 ||
      claim.state !== 'CONSUMED_SUCCESS_BRANCH_CAS_AND_WORKTREE_SYNCHRONIZED_AWAITING_RECEIPT_REVIEW' ||
      claim.authorizationConsumed !== true || claim.authorizationReplayAllowed !== false ||
      claim.authorizationUseCount !== 1 || claim.branchRefUpdates !== 1 ||
      branchExecution.taskId !== 'CM-2126') {
    blockers.push('evidence.branchCasOneShotBoundary');
  }

  const manifestBoundary = manifest.payload?.currentBoundary || {};
  const reviewBoundary = branchReview.payload?.currentBoundary || {};
  const zeroFields = ['additionalExecutionAttempts', 'additionalBranchRefUpdates', 'nativeReads', 'nativeWrites',
    'providerCalls', 'realMemoryReads', 'remoteActions'];
  if (manifest.taskId !== 'CM-2128' || manifestBoundary.fullPlanPackCompleted !== true ||
      manifestBoundary.authorizationReplayAllowed !== false || manifestBoundary.readinessClaimed !== false ||
      !zeroBoundary(manifestBoundary, zeroFields) || branchReview.taskId !== 'CM-2129' ||
      reviewBoundary.fullPlanPackCompleted !== true || reviewBoundary.replayAuthorized !== false ||
      reviewBoundary.readinessClaimed !== false || !zeroBoundary(reviewBoundary, zeroFields) ||
      reviewBoundary.additionalReceiptWritesToGovernanceState !== 0) {
    blockers.push('evidence.branchCasFreezeReviewBoundary');
  }
}

function validateCurrentFacts(currentFacts, blockers) {
  const completion = currentFacts.planPackCompletion || {};
  const status = currentFacts.status || {};
  if (currentFacts.taskId !== 'CM-2121' || currentFacts.validationId !== 'CMV-2214' ||
      completion.fullPlanApplicationApplied !== true || completion.fullPlanApplicationExecuted !== true ||
      completion.fullPlanApplicationCommitBound !== true ||
      completion.fullPlanApplicationAuthorizationConsumed !== true ||
      completion.fullPlanApplicationAuthorizationReplayAllowed !== false ||
      completion.fullPlanApplicationReceiptReviewPassed !== true ||
      completion.fullPlanStatusSyncPerformed !== false || completion.fullPlanPackCompleted !== false ||
      completion.readinessClaimed !== false || status.project !== 'NOT_READY_BLOCKED' ||
      status.rc !== 'RC_NOT_READY_BLOCKED' || status.completeV8Claimed !== false ||
      status.notProductionReady !== true || status.notReleaseReady !== true ||
      status.notDeployReady !== true || status.notCutoverReady !== true) {
    blockers.push('currentFacts.reopenedNonReadinessBoundary');
  }
}

function buildRevalidation(options = {}) {
  if (typeof options.resolveCommit !== 'function' || typeof options.resolveGitFile !== 'function' ||
      typeof options.isCommitAncestor !== 'function') throw new Error('cm2130_git_resolver_required');
  const blockers = [];
  const baseline = options.resolveCommit(BASELINE_COMMIT);
  if (baseline.commit !== BASELINE_COMMIT || baseline.tree !== BASELINE_TREE) blockers.push('baseline.gitIdentity');

  const mergeProof = MERGE_CHAIN.map((expected, index) => {
    const actual = options.resolveCommit(expected.commit);
    if (actual.commit !== expected.commit || actual.tree !== expected.tree ||
        !sameJson(actual.parents, [expected.firstParent, expected.secondParent]) ||
        actual.subject !== `Merge pull request #${expected.pullRequest} from JENN2046/${[
          'codex/nmm-01-review-baseline',
          'codex/nmm-02-phase8-bootstrap',
          'codex/nmm-03-phase8-lifecycle',
          'codex/nmm-04-full-plan-review',
          'codex/nmm-05-full-plan-application',
          'codex/nmm-06-receipt-closeout'
        ][index]}` || !options.isCommitAncestor(expected.commit, BASELINE_COMMIT)) {
      blockers.push(`mergeChain.pr${expected.pullRequest}`);
    }
    return {
      pullRequest: expected.pullRequest,
      commit: actual.commit,
      tree: actual.tree,
      parents: actual.parents,
      subject: actual.subject,
      regularMergeCommit: actual.parents.length === 2,
      finalMainAncestor: options.isCommitAncestor(expected.commit, BASELINE_COMMIT)
    };
  });

  const parsed = new Map();
  const evidenceArtifacts = EVIDENCE_PATHS.map(sourcePath => {
    const resolved = { path: sourcePath, ...options.resolveGitFile(BASELINE_COMMIT, sourcePath) };
    if (sourcePath.endsWith('.json')) parsed.set(sourcePath, parseJson(resolved, blockers));
    return identityOf(resolved);
  });
  validateEvidence(parsed, blockers);

  const statusSurfaceArtifacts = STATUS_SYNC_PATHS.map(sourcePath => {
    const resolved = { path: sourcePath, ...options.resolveGitFile(BASELINE_COMMIT, sourcePath) };
    if (sourcePath === '.agent_board/CURRENT_FACTS.json') validateCurrentFacts(parseJson(resolved, blockers), blockers);
    return identityOf(resolved);
  });

  if (blockers.length) throw new Error(`cm2130_final_main_revalidation_failed:${[...new Set(blockers)].join(',')}`);
  const payload = {
    revalidationReference: 'CM-2130-FINAL-MAIN-FULL-PLAN-REVALIDATION-D78AD8F7-0A503DED',
    baseline: {
      commit: BASELINE_COMMIT,
      tree: BASELINE_TREE,
      mergeCount: MERGE_CHAIN.length,
      mergeMethod: 'regular_merge_commit_only',
      firstPullRequest: 14,
      lastPullRequest: 19
    },
    mergeProof,
    evidenceArtifacts,
    statusSurfaceArtifacts,
    revalidatedEvidence: {
      historicalFullPlanApplicationApplied: true,
      historicalFullPlanApplicationCommitBound: true,
      historicalFullPlanApplicationAuthorizationConsumed: true,
      historicalFullPlanApplicationAuthorizationReplayAllowed: false,
      historicalReceiptReviewPassed: true,
      historicalBranchCasCompleted: true,
      historicalBranchCasReceiptFreezePassed: true,
      historicalBranchCasIndependentReviewPassed: true
    },
    currentState: {
      finalMainEvidenceRevalidated: true,
      fullPlanStatusSyncPerformed: false,
      fullPlanPackCompleted: false,
      statusSyncStillSeparate: true,
      readinessClaimed: false
    },
    currentAuthority: {
      revalidationOnly: true,
      consumedAuthorizationReplayAuthorized: false,
      statusSyncAuthorized: false,
      branchRefUpdateAuthorized: false,
      forcePushAuthorized: false,
      releaseAuthorized: false,
      deployAuthorized: false,
      readinessClaimAuthorized: false
    },
    currentSideEffects: { ...ZERO_SIDE_EFFECTS },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false])),
    verdict: VERDICT
  };
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    validationId: VALIDATION_ID,
    artifactType: 'cm2130_final_main_full_plan_revalidation_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function evaluateRevalidation(revalidation = {}, options = {}) {
  const blockers = [];
  let expected;
  try {
    expected = buildRevalidation(options);
    if (!sameJson(revalidation, expected)) blockers.push('revalidation.exactContent');
  } catch (error) {
    blockers.push(error.message);
  }
  if (revalidation.schemaVersion !== 1 || revalidation.taskId !== TASK_ID ||
      revalidation.validationId !== VALIDATION_ID ||
      revalidation.artifactType !== 'cm2130_final_main_full_plan_revalidation_v1' ||
      revalidation.canonicalPayloadSha256 !== sha256Canonical(revalidation.payload || {})) {
    blockers.push('revalidation.identityOrCanonicalHash');
  }
  const current = revalidation.payload?.currentState || {};
  const authority = revalidation.payload?.currentAuthority || {};
  if (current.finalMainEvidenceRevalidated !== true || current.fullPlanStatusSyncPerformed !== false ||
      current.fullPlanPackCompleted !== false || current.statusSyncStillSeparate !== true ||
      current.readinessClaimed !== false || authority.revalidationOnly !== true ||
      Object.entries(authority).some(([field, value]) => field !== 'revalidationOnly' && value !== false) ||
      Object.values(revalidation.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      !readinessFalse(revalidation.payload?.nonClaims) || revalidation.payload?.verdict !== VERDICT) {
    blockers.push('revalidation.nonExecutingBoundary');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    finalMainEvidenceRevalidated: blockers.length === 0,
    fullPlanStatusSyncPerformed: false,
    fullPlanPackCompleted: false,
    statusSyncStillSeparate: true,
    readinessClaimed: false,
    verdict: blockers.length === 0 ? VERDICT : 'FAIL_FINAL_MAIN_EVIDENCE_REVALIDATION'
  };
}

module.exports = {
  ARTIFACT_MARKDOWN_PATH,
  ARTIFACT_PATH,
  BASELINE_COMMIT,
  BASELINE_TREE,
  EVIDENCE_PATHS,
  MERGE_CHAIN,
  STATUS_SYNC_PATHS,
  TASK_ID,
  VALIDATION_ID,
  VERDICT,
  buildRevalidation,
  canonicalize,
  evaluateRevalidation,
  serializeArtifact
};
