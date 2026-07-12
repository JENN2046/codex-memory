'use strict';

const {
  APPLICATION_MARKDOWN_PATH,
  APPLICATION_PATH,
  BASELINE_COMMIT,
  BASELINE_TREE,
  REVIEW_DECISION,
  buildApplication,
  evaluateApplication
} = require('./Cm2121FullPlanStatusSyncApplication');
const {
  READINESS_FIELDS
} = require('./Cm2120FullPlanApplicationReceiptReview');
const {
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  gitBlobOid,
  sameJson,
  serializeArtifact,
  sha256
} = require('./Cm2117ExactFullPlanApplicationDecision');

const TASK_ID = 'CM-2121';
const APPLICATION_COMMIT = '43cdc772ecc7e96b542c68a096a1674ba11462d0';
const APPLICATION_TREE = 'f54318eefd43922ff7fb403d734a647426c47755';
const APPLICATION_PARENT_COMMIT = '89a962a0e4b62b897c38b8438ac305222d34c092';
const APPLICATION_PARENT_TREE = '49a848d99c13666ba6190b90c14490cc6d5d5f66';
const APPLICATION_DIFF_PATHS = Object.freeze([APPLICATION_MARKDOWN_PATH, APPLICATION_PATH].sort());
const APPLICATION_DIFF_ENTRIES = Object.freeze(APPLICATION_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })));
const APPLICATION_IDENTITY = Object.freeze({
  json: Object.freeze({
    path: APPLICATION_PATH,
    blobOid: '80dd5716f51275443d713730006d17f5f9002faf',
    bytes: 11801,
    sha256: 'bdd651a9676e916c07088ebfbe6ca42f92451825bbabd049998b073a198d336e'
  }),
  markdown: Object.freeze({
    path: APPLICATION_MARKDOWN_PATH,
    blobOid: 'd021f62eca929e956c1138d62500da31f5346c87',
    bytes: 12533,
    sha256: '5407fc6c9e249d51f00b722cd8c854130a5ede3fe566e5c9cdcba16cfbce49d1'
  }),
  canonicalPayloadSha256: '7c489a3ada1d16d5ee1a188c056935980ed2a8843ec60001a72242155d946d8d',
  patchPayloadSha256: '2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92'
});
const DECISION_PATH = 'docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_content_decision.json';
const DECISION_MARKDOWN_PATH = DECISION_PATH.replace(/\.json$/, '.md');
const FUTURE_BRANCH_REF = 'refs/heads/codex/near-model-memory-frozen-replay-v2';
const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'package.json',
  'scripts/generate-cm2121-full-plan-status-sync-content-decision.js',
  'src/core/Cm2121FullPlanStatusSyncContentDecision.js',
  'tests/cm2121-full-plan-status-sync-content-decision.test.js'
].sort());
const IMPLEMENTATION_DIFF_ENTRIES = Object.freeze(IMPLEMENTATION_DIFF_PATHS.map(sourcePath => ({
  status: sourcePath === 'package.json' ? 'M' : 'A',
  path: sourcePath
})));
const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze(
  IMPLEMENTATION_DIFF_PATHS.filter(sourcePath => sourcePath !== 'package.json')
);
const machineBoundApplications = new WeakSet();

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Buffer.isBuffer(value) || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function wrapPayload(payload, artifactType) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    artifactType,
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function identityWithoutContent(value) {
  const { content, ...identity } = value;
  return identity;
}

function validResolvers(options = {}) {
  return ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries',
    'resolveGitFile', 'isCommitAncestor'].every(name => typeof options[name] === 'function');
}

function verifyFileIdentity(actual, expected, blockers, label) {
  if (!actual || actual.sourceCommit !== APPLICATION_COMMIT || actual.sourceTree !== APPLICATION_TREE ||
      actual.sourcePath !== expected.path || actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 ||
      !Buffer.isBuffer(actual.content) || gitBlobOid(actual.content) !== expected.blobOid ||
      sha256(actual.content) !== expected.sha256) blockers.push(label);
}

function intakeApplication(options = {}) {
  const blockers = [];
  if (!validResolvers(options)) return { accepted: false, blockers: ['contentDecision.gitResolversRequired'] };
  let application = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  try {
    const paths = options.resolveDiffPaths(APPLICATION_PARENT_COMMIT, APPLICATION_COMMIT).sort();
    const entries = options.resolveDiffEntries(APPLICATION_PARENT_COMMIT, APPLICATION_COMMIT)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveCommitTree(APPLICATION_COMMIT) !== APPLICATION_TREE ||
        options.resolveParentCommit(APPLICATION_COMMIT) !== APPLICATION_PARENT_COMMIT ||
        options.resolveCommitTree(APPLICATION_PARENT_COMMIT) !== APPLICATION_PARENT_TREE ||
        !sameJson(paths, APPLICATION_DIFF_PATHS) || !sameJson(entries, APPLICATION_DIFF_ENTRIES) ||
        sha256Canonical(paths) !== sha256Canonical(APPLICATION_DIFF_PATHS) ||
        sha256Canonical(entries) !== sha256Canonical(APPLICATION_DIFF_ENTRIES) ||
        !options.isCommitAncestor(REVIEW_DECISION.commit, APPLICATION_COMMIT)) {
      blockers.push('contentDecision.applicationLineageOrDiff');
    }
    jsonIdentity = options.resolveGitFile(APPLICATION_COMMIT, APPLICATION_PATH);
    markdownIdentity = options.resolveGitFile(APPLICATION_COMMIT, APPLICATION_MARKDOWN_PATH);
    verifyFileIdentity(jsonIdentity, APPLICATION_IDENTITY.json, blockers, 'contentDecision.applicationJson');
    verifyFileIdentity(markdownIdentity, APPLICATION_IDENTITY.markdown, blockers, 'contentDecision.applicationMarkdown');
    application = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (!markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd()) ||
        application.canonicalPayloadSha256 !== APPLICATION_IDENTITY.canonicalPayloadSha256 ||
        application.payload?.patchPlan?.patchPayloadSha256 !== APPLICATION_IDENTITY.patchPayloadSha256) {
      blockers.push('contentDecision.applicationExactContent');
    }
    const evaluation = evaluateApplication(application, options);
    if (!evaluation.accepted || evaluation.applicationPrepared !== true ||
        evaluation.statusSyncAuthorized !== false || evaluation.statusSyncPerformed !== false ||
        evaluation.currentBranchStatusSynchronized !== false || evaluation.readinessClaimed !== false) {
      blockers.push(...evaluation.blockers.map(item => `contentDecision.${item}`));
      blockers.push('contentDecision.applicationNonExecutingBoundary');
    }
  } catch {
    blockers.push('contentDecision.applicationUnreadable');
  }
  const accepted = blockers.length === 0;
  if (accepted) {
    deepFreeze(application);
    machineBoundApplications.add(application);
  }
  return {
    accepted,
    blockers: [...new Set(blockers)],
    application,
    jsonIdentity,
    markdownIdentity,
    applicationMachineBound: accepted,
    statusSyncAuthorized: false,
    branchRefUpdateAuthorized: false
  };
}

function isMachineBoundApplication(value) {
  return !!value && machineBoundApplications.has(value);
}

function buildDecision({ applicationEvidence, implementation }) {
  if (!applicationEvidence?.accepted || !isMachineBoundApplication(applicationEvidence.application)) {
    throw new Error('cm2121_machine_bound_status_sync_application_required');
  }
  if (!implementation || !/^[a-f0-9]{40}$/.test(implementation.commit || '') ||
      !/^[a-f0-9]{40}$/.test(implementation.tree || '') ||
      implementation.parentCommit !== APPLICATION_COMMIT || implementation.parentTree !== APPLICATION_TREE ||
      !sameJson(implementation.diffPaths, IMPLEMENTATION_DIFF_PATHS) ||
      !sameJson(implementation.diffEntries, IMPLEMENTATION_DIFF_ENTRIES) ||
      implementation.diffPathsSha256 !== sha256Canonical(IMPLEMENTATION_DIFF_PATHS) ||
      implementation.diffEntriesSha256 !== sha256Canonical(IMPLEMENTATION_DIFF_ENTRIES) ||
      !Array.isArray(implementation.artifacts) ||
      !sameJson(implementation.artifacts.map(item => item.path), IMPLEMENTATION_ARTIFACT_PATHS)) {
    throw new Error('cm2121_content_decision_implementation_identity_required');
  }
  const application = applicationEvidence.application;
  const payload = {
    decisionReference: 'CM-2121-EXACT-STATUS-SYNC-CONTENT-DECISION-7C489A3A-2D4CBE41-43CDC772',
    decisionType: 'exact_full_plan_status_sync_content_decision',
    decisionImplementation: implementation,
    application: {
      commit: APPLICATION_COMMIT,
      tree: APPLICATION_TREE,
      parentCommit: APPLICATION_PARENT_COMMIT,
      parentTree: APPLICATION_PARENT_TREE,
      diffPaths: APPLICATION_DIFF_PATHS,
      diffEntries: APPLICATION_DIFF_ENTRIES,
      diffPathsSha256: sha256Canonical(APPLICATION_DIFF_PATHS),
      diffEntriesSha256: sha256Canonical(APPLICATION_DIFF_ENTRIES),
      canonicalPayloadSha256: APPLICATION_IDENTITY.canonicalPayloadSha256,
      patchPayloadSha256: APPLICATION_IDENTITY.patchPayloadSha256,
      json: identityWithoutContent(applicationEvidence.jsonIdentity),
      markdown: identityWithoutContent(applicationEvidence.markdownIdentity)
    },
    receiptReview: {
      reference: REVIEW_DECISION.reference,
      commit: REVIEW_DECISION.commit,
      tree: REVIEW_DECISION.tree,
      payloadSha256: REVIEW_DECISION.payloadSha256,
      json: REVIEW_DECISION.json,
      markdown: REVIEW_DECISION.markdown,
      receiptReviewPassed: true
    },
    exactContent: {
      baselineCommit: BASELINE_COMMIT,
      baselineTree: BASELINE_TREE,
      exactPaths: application.payload.patchPlan.exactPaths,
      exactEntries: application.payload.patchPlan.exactEntries,
      targets: application.payload.patchPlan.targets,
      patchPayloadSha256: application.payload.patchPlan.patchPayloadSha256,
      onlyAuthoritativeTransition: application.payload.patchPlan.onlyAuthoritativeTransition,
      readinessFieldsForcedFalse: application.payload.patchPlan.readinessFieldsForcedFalse,
      targetCount: application.payload.patchPlan.targets.length,
      statusSyncCommitMustUseExactProjectedBlobs: true,
      statusSyncCommitMustContainNoOtherPath: true
    },
    authorizationContent: {
      authorizationContentApproved: true,
      exactAction: 'apply_exact_full_plan_status_sync_content',
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      nonce: 'cm2121-full-plan-status-sync-001',
      receiptId: 'cm2121-full-plan-status-sync-receipt-001',
      registryReference: 'cm2121-full-plan-status-sync-registry-001',
      callerSuppliedAcceptedBooleanAllowed: false,
      alternateOutputPathAllowed: false,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false,
      statusSyncExecutionAuthorized: false,
      applicationCommitCreationAuthorized: false,
      finalExecutionReleasePresent: false,
      finalExecutionReleaseAuthorized: false,
      branchRefUpdateAuthorized: false,
      branchRefUpdateDecisionPresent: false,
      remoteActionAuthorized: false
    },
    futureExecutionBoundary: {
      separateFrozenExecutorRequired: true,
      separateExecutionPacketRequired: true,
      separateFinalExecutionReleaseRequired: true,
      finalReleaseMayAuthorizeAtMostOneDetachedStatusCommit: true,
      finalReleaseMayNotAuthorizeBranchRefUpdate: true,
      detachedStatusCommitMustBeDirectChildOfFinalReleaseSourceCommit: true,
      detachedStatusCommitParentTreeMustEqualFinalReleaseSourceTree: true,
      detachedStatusCommitReceiptReviewRequired: true,
      separatePostBindingBranchRefDecisionRequired: true,
      futureBranchRef: FUTURE_BRANCH_REF,
      futureBranchRefUpdateMustUseCompareAndSwap: true,
      futureBranchRefMaximumUpdates: 1,
      forceBranchRefUpdateAllowed: false,
      deleteBranchRefAllowed: false,
      otherBranchRefAllowed: false,
      remoteBranchRefAllowed: false,
      branchRefUpdateMayNotBeInferredFromContentOrFinalRelease: true,
      statusSyncIsNotCurrentBranchFactUntilBranchRefUpdateSucceeds: true,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false
    },
    currentState: {
      applicationPrepared: true,
      authorizationContentApproved: true,
      contentDecisionPrepared: true,
      contentDecisionGitIntakeCompleted: false,
      finalExecutionReleasePresent: false,
      claimCreated: false,
      statusSyncExecutionAuthorized: false,
      detachedStatusCommitCreated: false,
      detachedStatusCommitBound: false,
      branchRefUpdateAuthorized: false,
      branchRefUpdated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      fullPlanPackCompletedInBoundEvidence: true,
      readinessClaimed: false
    },
    sideEffectLimits: {
      authorizationContentWrites: 1,
      repositoryPatches: 1,
      detachedApplicationCommits: 1,
      branchRefUpdates: 1,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    currentSideEffects: {
      claimCreates: 0,
      repositoryPatches: 0,
      detachedApplicationCommits: 0,
      branchRefUpdates: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    desiredStateAfterAllFutureGates: {
      fullPlanPackCompleted: true,
      statusSyncPerformed: true,
      currentBranchStatusSynchronized: true,
      readiness: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
    },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
  };
  return wrapPayload(payload, 'cm2121_exact_full_plan_status_sync_content_decision_v1');
}

function evaluateDecision(decision = {}, { implementation, ...options } = {}) {
  const blockers = [];
  const applicationEvidence = intakeApplication(options);
  if (!applicationEvidence.accepted) blockers.push(...applicationEvidence.blockers.map(item => `decision.${item}`));
  let expected = null;
  try {
    expected = buildDecision({ applicationEvidence, implementation });
    if (!sameJson(decision, expected)) blockers.push('decision.exactContent');
  } catch (error) {
    blockers.push(error.message);
  }
  if (decision.schemaVersion !== 1 || decision.taskId !== TASK_ID ||
      decision.artifactType !== 'cm2121_exact_full_plan_status_sync_content_decision_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) blockers.push('decision.identityOrHash');
  const authority = decision.payload?.authorizationContent || {};
  const current = decision.payload?.currentState || {};
  const future = decision.payload?.futureExecutionBoundary || {};
  if (authority.authorizationContentApproved !== true || authority.authorizationUseCount !== 1 ||
      authority.authorizationReplayAllowed !== false ||
      authority.callerSuppliedAcceptedBooleanAllowed !== false || authority.alternateOutputPathAllowed !== false ||
      authority.automaticRetryAllowed !== false || authority.automaticCleanupAllowed !== false ||
      authority.statusSyncExecutionAuthorized !== false || authority.applicationCommitCreationAuthorized !== false ||
      authority.finalExecutionReleasePresent !== false || authority.finalExecutionReleaseAuthorized !== false ||
      authority.branchRefUpdateAuthorized !== false || authority.branchRefUpdateDecisionPresent !== false ||
      authority.remoteActionAuthorized !== false || current.finalExecutionReleasePresent !== false ||
      current.statusSyncExecutionAuthorized !== false || current.detachedStatusCommitCreated !== false ||
      current.detachedStatusCommitBound !== false || current.branchRefUpdateAuthorized !== false ||
      current.branchRefUpdated !== false || current.statusSyncPerformed !== false ||
      current.currentBranchStatusSynchronized !== false || current.readinessClaimed !== false ||
      future.separateFinalExecutionReleaseRequired !== true || future.finalReleaseMayNotAuthorizeBranchRefUpdate !== true ||
      future.detachedStatusCommitMustBeDirectChildOfFinalReleaseSourceCommit !== true ||
      future.detachedStatusCommitParentTreeMustEqualFinalReleaseSourceTree !== true ||
      future.separatePostBindingBranchRefDecisionRequired !== true || future.futureBranchRef !== FUTURE_BRANCH_REF ||
      future.futureBranchRefUpdateMustUseCompareAndSwap !== true || future.futureBranchRefMaximumUpdates !== 1 ||
      future.forceBranchRefUpdateAllowed !== false || future.deleteBranchRefAllowed !== false ||
      future.otherBranchRefAllowed !== false || future.remoteBranchRefAllowed !== false ||
      future.branchRefUpdateMayNotBeInferredFromContentOrFinalRelease !== true ||
      Object.values(decision.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(decision.payload?.nonClaims || {}).some(value => value !== false) ||
      Object.values(decision.payload?.desiredStateAfterAllFutureGates?.readiness || {}).some(value => value !== false)) {
    blockers.push('decision.nonExecutingSeparationBoundary');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    authorizationContentApproved: blockers.length === 0,
    statusSyncExecutionAuthorized: false,
    finalExecutionReleasePresent: false,
    finalExecutionReleaseAuthorized: false,
    branchRefUpdateAuthorized: false,
    statusSyncPerformed: false,
    currentBranchStatusSynchronized: false,
    fullPlanPackCompletedInBoundEvidence: blockers.length === 0,
    readinessClaimed: false,
    applicationEvidence
  };
}

module.exports = {
  APPLICATION_COMMIT,
  APPLICATION_DIFF_ENTRIES,
  APPLICATION_DIFF_PATHS,
  APPLICATION_IDENTITY,
  APPLICATION_PARENT_COMMIT,
  APPLICATION_PARENT_TREE,
  APPLICATION_TREE,
  DECISION_MARKDOWN_PATH,
  DECISION_PATH,
  FUTURE_BRANCH_REF,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  TASK_ID,
  buildDecision,
  canonicalize,
  deepFreeze,
  evaluateDecision,
  identityWithoutContent,
  intakeApplication,
  isMachineBoundApplication,
  serializeArtifact,
  wrapPayload
};
