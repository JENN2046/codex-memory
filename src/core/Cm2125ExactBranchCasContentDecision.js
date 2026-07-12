'use strict';

const {
  APPLICATION_MARKDOWN_PATH,
  APPLICATION_PATH,
  EXPECTED_OLD,
  EXPECTED_OLD_TREE,
  FREEZE_COMMIT,
  NEW_COMMIT,
  NEW_TREE,
  REVIEW_COMMIT,
  STATUS_ENTRIES,
  STATUS_PATHS,
  TARGET_REF,
  evaluateApplication
} = require('./Cm2125ExactBranchCasApplication');
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

const TASK_ID = 'CM-2125';
const APPLICATION_COMMIT = '1e8378c55c83bde155071265d12d4ae73743bf82';
const APPLICATION_TREE = '679a3033ff27f00b71e8a9b1d78dbd9344007425';
const APPLICATION_PARENT_COMMIT = '31c86b805ec382c5bd6cd2370def7c8fafda7a9d';
const APPLICATION_PARENT_TREE = '21f0d3805f3b5b6089b334f4d788cadfc94070c5';
const APPLICATION_DIFF_PATHS = Object.freeze([APPLICATION_MARKDOWN_PATH, APPLICATION_PATH].sort());
const APPLICATION_DIFF_ENTRIES = Object.freeze(APPLICATION_DIFF_PATHS.map(sourcePath => ({
  status: 'A',
  path: sourcePath
})));
const APPLICATION_IDENTITY = Object.freeze({
  json: Object.freeze({
    path: APPLICATION_PATH,
    blobOid: '76d8899b754bb308410d48d50c6308a43a289e54',
    bytes: 10401,
    sha256: '0b8a8686e81e45e37e82aef12528b7b0d2654227d612bf474770e928b983db92'
  }),
  markdown: Object.freeze({
    path: APPLICATION_MARKDOWN_PATH,
    blobOid: '2950ae362285b9e6b395b82a9b64dbb19eae5af2',
    bytes: 11004,
    sha256: '9c325c1c111a300db308dd28c50d03ed670db0ee3f0fcff9209227a8f992c073'
  }),
  canonicalPayloadSha256: 'ea3dce0ce6e6921c579eb5e2002d0e496a506a3bac3ff69b2784387b051b50fe'
});
const DECISION_PATH = 'docs/near-model-memory-plan-pack/cm2125_exact_branch_cas_content_decision.json';
const DECISION_MARKDOWN_PATH = DECISION_PATH.replace(/\.json$/, '.md');
const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'scripts/generate-cm2125-exact-branch-cas-content-decision.js',
  'src/core/Cm2125ExactBranchCasContentDecision.js',
  'tests/cm2125-exact-branch-cas-content-decision.test.js'
].sort());
const IMPLEMENTATION_DIFF_ENTRIES = Object.freeze(IMPLEMENTATION_DIFF_PATHS.map(sourcePath => ({
  status: 'A',
  path: sourcePath
})));
const machineBoundApplications = new WeakSet();

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Buffer.isBuffer(value) || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function wrapPayload(payload) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    artifactType: 'cm2125_exact_branch_cas_content_decision_v1',
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

function verifyApplicationFile(actual, expected, blockers, label) {
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
        !options.isCommitAncestor(REVIEW_COMMIT, APPLICATION_COMMIT)) {
      blockers.push('contentDecision.applicationLineageOrDiff');
    }
    jsonIdentity = options.resolveGitFile(APPLICATION_COMMIT, APPLICATION_PATH);
    markdownIdentity = options.resolveGitFile(APPLICATION_COMMIT, APPLICATION_MARKDOWN_PATH);
    verifyApplicationFile(jsonIdentity, APPLICATION_IDENTITY.json, blockers, 'contentDecision.applicationJson');
    verifyApplicationFile(markdownIdentity, APPLICATION_IDENTITY.markdown, blockers, 'contentDecision.applicationMarkdown');
    application = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (!markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd()) ||
        application.canonicalPayloadSha256 !== APPLICATION_IDENTITY.canonicalPayloadSha256 ||
        application.canonicalPayloadSha256 !== sha256Canonical(application.payload || {})) {
      blockers.push('contentDecision.applicationExactContent');
    }
    const evaluation = evaluateApplication(application, options);
    if (!evaluation.accepted || evaluation.applicationPrepared !== true ||
        evaluation.branchCasExecutionAuthorized !== false || evaluation.branchRefUpdateAuthorized !== false ||
        evaluation.branchRefUpdated !== false || evaluation.currentBranchStatusSynchronized !== false ||
        evaluation.readinessClaimed !== false) {
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
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false,
    currentBranchStatusSynchronized: false
  };
}

function isMachineBoundApplication(value) {
  return !!value && machineBoundApplications.has(value);
}

function implementationShapeAccepted(implementation) {
  return !!implementation && /^[a-f0-9]{40}$/.test(implementation.commit || '') &&
    /^[a-f0-9]{40}$/.test(implementation.tree || '') && implementation.parentCommit === APPLICATION_COMMIT &&
    implementation.parentTree === APPLICATION_TREE && sameJson(implementation.diffPaths, IMPLEMENTATION_DIFF_PATHS) &&
    sameJson(implementation.diffEntries, IMPLEMENTATION_DIFF_ENTRIES) &&
    implementation.diffPathsSha256 === sha256Canonical(IMPLEMENTATION_DIFF_PATHS) &&
    implementation.diffEntriesSha256 === sha256Canonical(IMPLEMENTATION_DIFF_ENTRIES) &&
    Array.isArray(implementation.artifacts) && implementation.artifacts.length === IMPLEMENTATION_DIFF_PATHS.length &&
    sameJson(implementation.artifacts.map(item => item.path), IMPLEMENTATION_DIFF_PATHS) &&
    implementation.artifacts.every(item => /^[a-f0-9]{40}$/.test(item.blobOid || '') &&
      Number.isInteger(item.bytes) && item.bytes > 0 && /^[a-f0-9]{64}$/.test(item.sha256 || ''));
}

function verifyImplementation(implementation, options, blockers) {
  if (!implementationShapeAccepted(implementation) || !validResolvers(options)) {
    blockers.push('decision.implementationIdentity');
    return;
  }
  try {
    const paths = options.resolveDiffPaths(APPLICATION_COMMIT, implementation.commit).sort();
    const entries = options.resolveDiffEntries(APPLICATION_COMMIT, implementation.commit)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveParentCommit(implementation.commit) !== APPLICATION_COMMIT ||
        options.resolveCommitTree(implementation.commit) !== implementation.tree ||
        options.resolveCommitTree(APPLICATION_COMMIT) !== APPLICATION_TREE ||
        !sameJson(paths, IMPLEMENTATION_DIFF_PATHS) || !sameJson(entries, IMPLEMENTATION_DIFF_ENTRIES) ||
        !sameJson(implementation.diffPaths, paths) || !sameJson(implementation.diffEntries, entries)) {
      blockers.push('decision.implementationLineageOrDiff');
    }
    for (const expected of implementation.artifacts) {
      const actual = options.resolveGitFile(implementation.commit, expected.path);
      if (!actual || actual.sourceCommit !== implementation.commit || actual.sourceTree !== implementation.tree ||
          actual.sourcePath !== expected.path || actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' ||
          actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 ||
          !Buffer.isBuffer(actual.content) || gitBlobOid(actual.content) !== expected.blobOid ||
          sha256(actual.content) !== expected.sha256) blockers.push(`decision.implementationArtifact.${expected.path}`);
    }
  } catch {
    blockers.push('decision.implementationUnreadable');
  }
}

function buildDecision({ applicationEvidence, implementation }) {
  if (!applicationEvidence?.accepted || !isMachineBoundApplication(applicationEvidence.application)) {
    throw new Error('cm2125_machine_bound_branch_cas_application_required');
  }
  if (!implementationShapeAccepted(implementation)) {
    throw new Error('cm2125_content_decision_implementation_identity_required');
  }
  const application = applicationEvidence.application;
  const payload = {
    decisionReference: 'CM-2125-EXACT-BRANCH-CAS-CONTENT-DECISION-EA3DCE0C-869D9D6E-EB016872',
    decisionType: 'exact_local_branch_compare_and_swap_content_decision',
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
      json: identityWithoutContent(applicationEvidence.jsonIdentity),
      markdown: identityWithoutContent(applicationEvidence.markdownIdentity)
    },
    exactCasContent: {
      target: application.payload.target,
      statusPaths: STATUS_PATHS,
      statusEntries: STATUS_ENTRIES,
      statusPathsSha256: sha256Canonical(STATUS_PATHS),
      statusEntriesSha256: sha256Canonical(STATUS_ENTRIES),
      targetWorktreeBoundary: application.payload.targetWorktreeBoundary,
      receiptEvidence: application.payload.receiptEvidence,
      upstreamConsumedClaimIsEvidenceOnly: true,
      upstreamConsumedClaimMayBeReusedForBranchCas: false,
      futureSideEffectLimits: application.payload.futureSideEffectLimits
    },
    authorizationContent: {
      authorizationContentApproved: true,
      exactAction: 'update_exact_local_status_branch_ref_cas',
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      nonce: 'cm2125-exact-branch-cas-001',
      receiptId: 'cm2125-exact-branch-cas-receipt-001',
      registryReference: 'cm2125-exact-branch-cas-registry-001',
      callerSuppliedAcceptedBooleanAllowed: false,
      callerSuppliedTargetRefAllowed: false,
      callerSuppliedExpectedOldAllowed: false,
      callerSuppliedNewCommitAllowed: false,
      callerSuppliedWorktreePathAllowed: false,
      alternateOutputPathAllowed: false,
      automaticRetryAllowed: false,
      automaticRollbackAllowed: false,
      automaticCleanupAllowed: false,
      contentDecisionMayExecute: false,
      branchCasClaimCreationAuthorized: false,
      executionReceiptCreationAuthorized: false,
      executionPacketPresent: false,
      executionPacketAuthorized: false,
      finalExecutionReleasePresent: false,
      finalExecutionReleaseAuthorized: false,
      branchCasExecutionAuthorized: false,
      branchRefUpdateAuthorized: false,
      targetWorktreeIndexSynchronizationAuthorized: false,
      targetWorktreeFileSynchronizationAuthorized: false,
      remoteActionAuthorized: false
    },
    futureExecutionBoundary: {
      separateFrozenExecutorRequired: true,
      separateNonExecutingPacketRequired: true,
      separateFinalExecutionReleaseRequired: true,
      finalReleaseMustBindContentDecisionGitIdentity: true,
      finalReleaseMayAuthorizeAtMostOneExactBranchCas: true,
      finalReleaseMayAuthorizeAtMostOneExactTargetIndexSynchronization: true,
      finalReleaseMayAuthorizeExactlyNineTargetFileSynchronizations: true,
      finalReleaseMustBindSameTargetRefExpectedOldAndNew: true,
      executionMustRevalidateTargetRefExpectedOldBeforeClaim: true,
      executionMustRevalidateUniqueCleanLinkedTargetWorktreeBeforeClaim: true,
      executionMustRevalidateTargetHeadIndexAndTreeAfterClaimBeforeCas: true,
      targetWorktreeIdentityMustBeMachineDerived: true,
      refOnlyCasIsSufficient: false,
      resetHardAllowed: false,
      destructiveCheckoutAllowed: false,
      forceUpdateAllowed: false,
      refDeletionAllowed: false,
      retargetAllowed: false,
      otherRefUpdateAllowed: false,
      remoteRefUpdateAllowed: false,
      partialOrAmbiguousReceiptRequired: true,
      separateReconciliationDecisionRequiredForPartialOrAmbiguousOutcome: true,
      automaticRetryAllowed: false,
      automaticRollbackAllowed: false,
      automaticCleanupAllowed: false,
      separateExecutionReceiptFreezeRequired: true,
      separateExecutionReceiptReviewRequired: true,
      branchRefUpdateMayNotBeInferredFromContentDecision: true,
      currentBranchStatusSynchronizationMayNotBeInferredFromContentDecision: true
    },
    currentAuthority: {
      applicationPrepared: true,
      applicationExecuted: false,
      authorizationContentApproved: true,
      contentDecisionPrepared: true,
      contentDecisionGitIntakeCompleted: false,
      branchCasClaimCreated: false,
      executionPacketPresent: false,
      executionPacketAuthorized: false,
      finalExecutionReleasePresent: false,
      finalExecutionReleaseAuthorized: false,
      branchCasExecutionAuthorized: false,
      branchRefUpdateAuthorized: false,
      targetWorktreeIndexSynchronizationAuthorized: false,
      targetWorktreeFileSynchronizationAuthorized: false
    },
    currentState: {
      targetBranchRef: TARGET_REF,
      targetBranchObservedOid: EXPECTED_OLD,
      targetBranchObservedTree: EXPECTED_OLD_TREE,
      detachedCandidateCommit: NEW_COMMIT,
      detachedCandidateTree: NEW_TREE,
      detachedCandidateParent: EXPECTED_OLD,
      detachedCommitBound: true,
      receiptFreezeCommit: FREEZE_COMMIT,
      receiptReviewCommit: REVIEW_COMMIT,
      receiptReviewPassed: true,
      branchRefUpdated: false,
      targetWorktreeIndexSynchronized: false,
      targetWorktreeFilesSynchronized: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      readinessClaimed: false
    },
    futureMaximumSideEffects: application.payload.futureSideEffectLimits,
    currentSideEffects: application.payload.currentSideEffects,
    prohibitedAuthority: application.payload.prohibitedAuthority,
    desiredStateAfterAllFutureGates: {
      targetBranchRef: TARGET_REF,
      targetBranchOid: NEW_COMMIT,
      targetBranchTree: NEW_TREE,
      branchRefUpdated: true,
      targetWorktreeIndexSynchronized: true,
      targetWorktreeFilesSynchronized: true,
      statusSyncPerformed: true,
      currentBranchStatusSynchronized: true,
      readiness: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
    },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
  };
  return wrapPayload(payload);
}

function evaluateDecision(decision = {}, { implementation, ...options } = {}) {
  const blockers = [];
  const applicationEvidence = intakeApplication(options);
  if (!applicationEvidence.accepted) blockers.push(...applicationEvidence.blockers.map(item => `decision.${item}`));
  verifyImplementation(implementation, options, blockers);
  let expected = null;
  try {
    expected = buildDecision({ applicationEvidence, implementation });
    if (!sameJson(decision, expected)) blockers.push('decision.exactContent');
  } catch (error) {
    blockers.push(error.message);
  }
  if (decision.schemaVersion !== 1 || decision.taskId !== TASK_ID ||
      decision.artifactType !== 'cm2125_exact_branch_cas_content_decision_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) blockers.push('decision.identityOrHash');
  const authority = decision.payload?.authorizationContent || {};
  const currentAuthority = decision.payload?.currentAuthority || {};
  const currentState = decision.payload?.currentState || {};
  const boundary = decision.payload?.futureExecutionBoundary || {};
  const upstream = decision.payload?.exactCasContent || {};
  if (authority.authorizationContentApproved !== true || authority.authorizationUseCount !== 1 ||
      authority.authorizationReplayAllowed !== false || authority.callerSuppliedAcceptedBooleanAllowed !== false ||
      authority.callerSuppliedTargetRefAllowed !== false || authority.callerSuppliedExpectedOldAllowed !== false ||
      authority.callerSuppliedNewCommitAllowed !== false || authority.callerSuppliedWorktreePathAllowed !== false ||
      authority.alternateOutputPathAllowed !== false || authority.automaticRetryAllowed !== false ||
      authority.automaticRollbackAllowed !== false || authority.automaticCleanupAllowed !== false ||
      authority.contentDecisionMayExecute !== false || authority.executionPacketPresent !== false ||
      authority.branchCasClaimCreationAuthorized !== false ||
      authority.executionReceiptCreationAuthorized !== false ||
      authority.executionPacketAuthorized !== false || authority.finalExecutionReleasePresent !== false ||
      authority.finalExecutionReleaseAuthorized !== false || authority.branchCasExecutionAuthorized !== false ||
      authority.branchRefUpdateAuthorized !== false ||
      authority.targetWorktreeIndexSynchronizationAuthorized !== false ||
      authority.targetWorktreeFileSynchronizationAuthorized !== false || authority.remoteActionAuthorized !== false ||
      currentAuthority.applicationExecuted !== false || currentAuthority.branchCasClaimCreated !== false ||
      currentAuthority.executionPacketPresent !== false ||
      currentAuthority.executionPacketAuthorized !== false || currentAuthority.finalExecutionReleasePresent !== false ||
      currentAuthority.finalExecutionReleaseAuthorized !== false ||
      currentAuthority.branchCasExecutionAuthorized !== false || currentAuthority.branchRefUpdateAuthorized !== false ||
      currentAuthority.targetWorktreeIndexSynchronizationAuthorized !== false ||
      currentAuthority.targetWorktreeFileSynchronizationAuthorized !== false || currentState.branchRefUpdated !== false ||
      currentState.targetWorktreeIndexSynchronized !== false || currentState.targetWorktreeFilesSynchronized !== false ||
      currentState.statusSyncPerformed !== false || currentState.currentBranchStatusSynchronized !== false ||
      currentState.readinessClaimed !== false || upstream.upstreamConsumedClaimIsEvidenceOnly !== true ||
      upstream.upstreamConsumedClaimMayBeReusedForBranchCas !== false ||
      boundary.separateFrozenExecutorRequired !== true || boundary.separateNonExecutingPacketRequired !== true ||
      boundary.separateFinalExecutionReleaseRequired !== true ||
      boundary.finalReleaseMustBindContentDecisionGitIdentity !== true ||
      boundary.finalReleaseMayAuthorizeAtMostOneExactBranchCas !== true ||
      boundary.finalReleaseMustBindSameTargetRefExpectedOldAndNew !== true ||
      boundary.targetWorktreeIdentityMustBeMachineDerived !== true || boundary.refOnlyCasIsSufficient !== false ||
      boundary.resetHardAllowed !== false || boundary.destructiveCheckoutAllowed !== false ||
      boundary.forceUpdateAllowed !== false || boundary.refDeletionAllowed !== false ||
      boundary.retargetAllowed !== false || boundary.otherRefUpdateAllowed !== false ||
      boundary.remoteRefUpdateAllowed !== false || boundary.automaticRetryAllowed !== false ||
      boundary.automaticRollbackAllowed !== false || boundary.automaticCleanupAllowed !== false ||
      boundary.branchRefUpdateMayNotBeInferredFromContentDecision !== true ||
      boundary.currentBranchStatusSynchronizationMayNotBeInferredFromContentDecision !== true ||
      Object.values(decision.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(decision.payload?.prohibitedAuthority || {}).some(value => value !== false) ||
      Object.values(decision.payload?.nonClaims || {}).some(value => value !== false) ||
      Object.values(decision.payload?.desiredStateAfterAllFutureGates?.readiness || {}).some(value => value !== false)) {
    blockers.push('decision.nonExecutingSeparationBoundary');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    authorizationContentApproved: blockers.length === 0,
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false,
    targetWorktreeIndexSynchronizationAuthorized: false,
    targetWorktreeFileSynchronizationAuthorized: false,
    branchRefUpdated: false,
    currentBranchStatusSynchronized: false,
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
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  TASK_ID,
  buildDecision,
  canonicalize,
  deepFreeze,
  evaluateDecision,
  identityWithoutContent,
  implementationShapeAccepted,
  intakeApplication,
  isMachineBoundApplication,
  serializeArtifact,
  verifyImplementation,
  wrapPayload
};
