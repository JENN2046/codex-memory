'use strict';

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
const TARGET_REF = 'refs/heads/codex/near-model-memory-frozen-replay-v2';
const EXPECTED_OLD = '869d9d6e62eebd7ce1c04cfe9e7a3b394355937f';
const EXPECTED_OLD_TREE = '9e8185956ba4229a3238e162a4e9a092e1d4915c';
const NEW_COMMIT = 'eb016872c834a8a8b36ed8edd8ce1aeb0db599c8';
const NEW_TREE = 'c129ecfaa134a47f30ed98f17d74151989c1a547';
const FREEZE_COMMIT = '86fc18bcfe9173af3cab3afca0522290f6f1f87c';
const FREEZE_TREE = '10bd4586209d5d3c3fe8d85082fb25f33a6595b1';
const FREEZE_PARENT = '19dad4e0c6b48977a526b1ee2e05aeb369adf97f';
const REVIEW_COMMIT = '4c820c284681692cb0354e9e9fd1a49aaa346d37';
const REVIEW_TREE = 'fbbbd57053263844bc7ac7d366883ef87e23700e';
const APPLICATION_PATH = 'docs/near-model-memory-plan-pack/cm2125_exact_branch_cas_application.json';
const APPLICATION_MARKDOWN_PATH = APPLICATION_PATH.replace(/\.json$/, '.md');
const IMPLEMENTATION_PARENT = Object.freeze({ commit: REVIEW_COMMIT, tree: REVIEW_TREE });
const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'scripts/generate-cm2125-exact-branch-cas-application.js',
  'src/core/Cm2125ExactBranchCasApplication.js',
  'tests/cm2125-exact-branch-cas-application.test.js'
].sort());
const IMPLEMENTATION_DIFF_ENTRIES = Object.freeze(IMPLEMENTATION_DIFF_PATHS.map(sourcePath => ({
  status: 'A',
  path: sourcePath
})));
const STATUS_PATHS = Object.freeze([
  '.agent_board/AUTOPILOT_LEDGER.md',
  '.agent_board/CHECKPOINT.md',
  '.agent_board/CURRENT_FACTS.json',
  '.agent_board/HANDOFF.md',
  '.agent_board/RUN_STATE.md',
  '.agent_board/TASK_QUEUE.md',
  '.agent_board/VALIDATION_LOG.md',
  'CURRENT_STATE.md',
  'STATUS.md'
]);
const STATUS_ENTRIES = Object.freeze(STATUS_PATHS.map(sourcePath => ({ status: 'M', path: sourcePath })));
const FREEZE_PATHS = Object.freeze([
  'docs/near-model-memory-plan-pack/cm2124_status_sync_binding_receipt.json',
  'docs/near-model-memory-plan-pack/cm2124_status_sync_execution_receipt.json',
  'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_freeze_manifest.json',
  'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_freeze_manifest.md'
].sort());
const REVIEW_PATHS = Object.freeze([
  'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_review.json',
  'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_review.md'
].sort());
const REVIEW_IDENTITIES = Object.freeze({
  json: Object.freeze({
    path: REVIEW_PATHS[0],
    blobOid: '2d6c53122d354a936540ba327cd8848f7363b9d4',
    bytes: 4071,
    sha256: '2746e87acd532f81d62c16f20fe4ef055dbb285f939e5d9f873f3169d057644c',
    canonicalPayloadSha256: 'ff3aad1c4007e54e3afcab8497fb65f3472f1270ee5124627a4370c89587924c'
  }),
  markdown: Object.freeze({
    path: REVIEW_PATHS[1],
    blobOid: 'f9db2ec5d6c528ff2dfca71d06b3d6dd53384274',
    bytes: 4561,
    sha256: 'c235ac40635a3b880ad4a39422e97d72ef9abcfb188febdf70b37afb844d5bbc'
  })
});
const FREEZE_IDENTITIES = Object.freeze({
  manifest: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_freeze_manifest.json',
    blobOid: 'b454be44406a267c6bdf880b7adc08d086410fe4',
    bytes: 3458,
    sha256: 'd6ab82b0401f15d70d267a2682080518ccc5c1c38b3622581b90b41e97876e36',
    canonicalPayloadSha256: 'ec51dbfd4e485115a295877bc03110776985900e3285b9a35b570a5cbe092062'
  }),
  execution: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2124_status_sync_execution_receipt.json',
    blobOid: 'cb9bb00944b992ed75a0665156d3785b40548d91',
    bytes: 12435,
    sha256: '8d3aefd3a335f4b850dfc07369d23c411bd0bd49028c597455c28d5d8f518120',
    canonicalPayloadSha256: 'a040c6e948fe1ac740fa5bf22a7f29d95e901b1a64102599384221204ddf5e2d'
  }),
  binding: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2124_status_sync_binding_receipt.json',
    blobOid: 'bb3d764f0d072271128e2174d82361e68d509221',
    bytes: 12174,
    sha256: '5ce9d65ab6e2c6d3a957c30ce65c7195dce0619cb88312fb18bb52ecd982f28f',
    canonicalPayloadSha256: 'f03cb5d8a78d17c5f9b90005edc7a45d32b2113c39a29b0f403ffe268e01d023'
  })
});

function wrapPayload(payload) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    artifactType: 'cm2125_exact_branch_cas_application_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function identityWithoutContent(value) {
  const { content, ...identity } = value;
  return identity;
}

function validResolvers(options = {}) {
  return ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries', 'resolveGitFile',
    'isCommitAncestor']
    .every(name => typeof options[name] === 'function');
}

function verifyFile(actual, expected, blockers, label, commit, tree) {
  if (!actual || actual.sourceCommit !== commit || actual.sourceTree !== tree || actual.sourcePath !== expected.path ||
      actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' || actual.blobOid !== expected.blobOid ||
      actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 || !Buffer.isBuffer(actual.content) ||
      gitBlobOid(actual.content) !== expected.blobOid || sha256(actual.content) !== expected.sha256) blockers.push(label);
}

function intakeUpstreamEvidence(options = {}) {
  const blockers = [];
  let review = null;
  let manifest = null;
  let reviewJson = null;
  let reviewMarkdown = null;
  let manifestIdentity = null;
  let executionIdentity = null;
  let bindingIdentity = null;
  if (!validResolvers(options)) return { accepted: false, blockers: ['upstream.gitResolversRequired'] };
  try {
    const statusPaths = options.resolveDiffPaths(EXPECTED_OLD, NEW_COMMIT).sort();
    const statusEntries = options.resolveDiffEntries(EXPECTED_OLD, NEW_COMMIT)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveParentCommit(NEW_COMMIT) !== EXPECTED_OLD ||
        options.resolveCommitTree(EXPECTED_OLD) !== EXPECTED_OLD_TREE ||
        options.resolveCommitTree(NEW_COMMIT) !== NEW_TREE || !sameJson(statusPaths, STATUS_PATHS) ||
        !sameJson(statusEntries, STATUS_ENTRIES)) blockers.push('upstream.detachedCommitLineageOrDiff');

    const freezePaths = options.resolveDiffPaths(FREEZE_PARENT, FREEZE_COMMIT).sort();
    const freezeEntries = options.resolveDiffEntries(FREEZE_PARENT, FREEZE_COMMIT)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveParentCommit(FREEZE_COMMIT) !== FREEZE_PARENT ||
        options.resolveCommitTree(FREEZE_COMMIT) !== FREEZE_TREE || !sameJson(freezePaths, FREEZE_PATHS) ||
        !sameJson(freezeEntries, FREEZE_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })))) {
      blockers.push('upstream.freezeLineageOrDiff');
    }
    manifestIdentity = options.resolveGitFile(FREEZE_COMMIT, FREEZE_IDENTITIES.manifest.path);
    executionIdentity = options.resolveGitFile(FREEZE_COMMIT, FREEZE_IDENTITIES.execution.path);
    bindingIdentity = options.resolveGitFile(FREEZE_COMMIT, FREEZE_IDENTITIES.binding.path);
    verifyFile(manifestIdentity, FREEZE_IDENTITIES.manifest, blockers, 'upstream.freezeManifest', FREEZE_COMMIT, FREEZE_TREE);
    verifyFile(executionIdentity, FREEZE_IDENTITIES.execution, blockers, 'upstream.executionReceipt', FREEZE_COMMIT, FREEZE_TREE);
    verifyFile(bindingIdentity, FREEZE_IDENTITIES.binding, blockers, 'upstream.bindingReceipt', FREEZE_COMMIT, FREEZE_TREE);
    manifest = JSON.parse(manifestIdentity.content.toString('utf8'));
    if (manifest.canonicalPayloadSha256 !== FREEZE_IDENTITIES.manifest.canonicalPayloadSha256 ||
        manifest.canonicalPayloadSha256 !== sha256Canonical(manifest.payload || {}) ||
        manifest.payload?.detachedStatusCommit !== NEW_COMMIT || manifest.payload?.detachedStatusTree !== NEW_TREE ||
        manifest.payload?.targetBranchObservedOid !== EXPECTED_OLD ||
        manifest.payload?.executionReceipt?.sha256 !== FREEZE_IDENTITIES.execution.sha256 ||
        manifest.payload?.bindingReceipt?.sha256 !== FREEZE_IDENTITIES.binding.sha256 ||
        manifest.payload?.claim?.finalState !== 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION' ||
        manifest.payload?.claim?.authorizationReplayAllowed !== false ||
        manifest.payload?.claim?.branchRefUpdateCount !== 0) blockers.push('upstream.freezeManifestContent');

    const reviewPaths = options.resolveDiffPaths(FREEZE_COMMIT, REVIEW_COMMIT).sort();
    const reviewEntries = options.resolveDiffEntries(FREEZE_COMMIT, REVIEW_COMMIT)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveParentCommit(REVIEW_COMMIT) !== FREEZE_COMMIT ||
        options.resolveCommitTree(REVIEW_COMMIT) !== REVIEW_TREE || !sameJson(reviewPaths, REVIEW_PATHS) ||
        !sameJson(reviewEntries, REVIEW_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath }))) ||
        !options.isCommitAncestor(NEW_COMMIT, FREEZE_COMMIT) ||
        !options.isCommitAncestor(NEW_COMMIT, REVIEW_COMMIT)) {
      blockers.push('upstream.reviewLineageOrDiff');
    }
    reviewJson = options.resolveGitFile(REVIEW_COMMIT, REVIEW_IDENTITIES.json.path);
    reviewMarkdown = options.resolveGitFile(REVIEW_COMMIT, REVIEW_IDENTITIES.markdown.path);
    verifyFile(reviewJson, REVIEW_IDENTITIES.json, blockers, 'upstream.reviewJson', REVIEW_COMMIT, REVIEW_TREE);
    verifyFile(reviewMarkdown, REVIEW_IDENTITIES.markdown, blockers, 'upstream.reviewMarkdown', REVIEW_COMMIT, REVIEW_TREE);
    review = JSON.parse(reviewJson.content.toString('utf8'));
    if (!reviewMarkdown.content.toString('utf8').includes(reviewJson.content.toString('utf8').trimEnd()) ||
        review.canonicalPayloadSha256 !== REVIEW_IDENTITIES.json.canonicalPayloadSha256 ||
        review.canonicalPayloadSha256 !== sha256Canonical(review.payload || {}) ||
        review.payload?.freezeCommit !== FREEZE_COMMIT || review.payload?.detachedStatusCommit !== NEW_COMMIT ||
        review.payload?.detachedStatusTree !== NEW_TREE ||
        review.payload?.verification?.executionReceiptAccepted !== true ||
        review.payload?.verification?.bindingReceiptAccepted !== true ||
        review.payload?.verification?.durableBindingAccepted !== true ||
        review.payload?.verification?.authorizationConsumed !== true ||
        review.payload?.verification?.authorizationReplayAllowed !== false ||
        review.payload?.currentBoundary?.targetBranchRef !== TARGET_REF ||
        review.payload?.currentBoundary?.targetBranchOid !== EXPECTED_OLD ||
        review.payload?.currentBoundary?.branchRefUpdated !== false ||
        review.payload?.currentBoundary?.readinessClaimed !== false) blockers.push('upstream.reviewContent');
  } catch {
    blockers.push('upstream.unreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    review,
    manifest,
    identities: { reviewJson, reviewMarkdown, manifestIdentity, executionIdentity, bindingIdentity }
  };
}

function buildApplication({ implementation, upstreamEvidence }) {
  if (!upstreamEvidence?.accepted) throw new Error('cm2125_accepted_upstream_evidence_required');
  const payload = {
    applicationReference: 'CM-2125-EXACT-BRANCH-CAS-APPLICATION-869D9D6E-EB016872-FF3AAD1C',
    applicationType: 'exact_local_branch_compare_and_swap_application_only',
    implementation,
    target: {
      remoteName: null,
      targetRef: TARGET_REF,
      expectedOld: EXPECTED_OLD,
      expectedOldTree: EXPECTED_OLD_TREE,
      newCommit: NEW_COMMIT,
      newTree: NEW_TREE,
      newCommitParent: EXPECTED_OLD,
      updateMethod: 'git_update_ref_exact_expected_old_compare_and_swap',
      forceAllowed: false,
      deleteAllowed: false,
      retargetAllowed: false,
      otherRefUpdateAllowed: false,
      remoteRefUpdateAllowed: false
    },
    targetWorktreeBoundary: {
      targetBranchCheckedOutInLinkedWorktreeAtApplication: true,
      targetWorktreeCleanAtApplication: true,
      refOnlyCasIsSufficient: false,
      exactPostCasIndexSynchronizationRequired: true,
      exactPostCasNinePathWorktreeSynchronizationRequired: true,
      targetWorktreeIdentityMustBeMachineDerived: true,
      callerSuppliedWorktreePathAllowed: false,
      resetHardAllowed: false,
      destructiveCheckoutAllowed: false,
      executorImplementationAndFinalReleaseStillRequired: true
    },
    receiptEvidence: {
      freezeCommit: FREEZE_COMMIT,
      freezeTree: FREEZE_TREE,
      reviewCommit: REVIEW_COMMIT,
      reviewTree: REVIEW_TREE,
      freezeManifest: identityWithoutContent(upstreamEvidence.identities.manifestIdentity),
      executionReceipt: identityWithoutContent(upstreamEvidence.identities.executionIdentity),
      bindingReceipt: identityWithoutContent(upstreamEvidence.identities.bindingIdentity),
      reviewJson: identityWithoutContent(upstreamEvidence.identities.reviewJson),
      reviewMarkdown: identityWithoutContent(upstreamEvidence.identities.reviewMarkdown),
      freezePayloadSha256: FREEZE_IDENTITIES.manifest.canonicalPayloadSha256,
      reviewPayloadSha256: REVIEW_IDENTITIES.json.canonicalPayloadSha256,
      executionReceiptPayloadSha256: FREEZE_IDENTITIES.execution.canonicalPayloadSha256,
      bindingReceiptPayloadSha256: FREEZE_IDENTITIES.binding.canonicalPayloadSha256,
      claim: upstreamEvidence.manifest.payload.claim
    },
    requestedAuthorization: {
      exactAction: 'update_exact_local_status_branch_ref_cas',
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      exactContentDecisionRequired: true,
      nonExecutingPacketRequired: true,
      separateFinalExecutionReleaseRequired: true,
      exactExecutionReceiptRequired: true,
      branchCasMayExecuteFromThisApplication: false,
      branchRefUpdateAuthorized: false,
      remoteActionAuthorized: false,
      automaticRetryAllowed: false,
      automaticRollbackAllowed: false
    },
    futureSideEffectLimits: {
      branchRefUpdates: 1,
      otherRefUpdates: 0,
      targetWorktreeIndexSynchronizations: 1,
      targetWorktreeFileSynchronizations: 9,
      remoteActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      readinessClaims: 0
    },
    currentAuthority: {
      applicationPrepared: true,
      applicationExecuted: false,
      contentDecisionPresent: false,
      executionPacketPresent: false,
      finalExecutionReleasePresent: false,
      branchCasExecutionAuthorized: false,
      branchRefUpdateAuthorized: false
    },
    currentState: {
      targetBranchObservedOid: EXPECTED_OLD,
      detachedCommitBound: true,
      receiptReviewPassed: true,
      branchRefUpdated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      readinessClaimed: false
    },
    prohibitedAuthority: {
      branchPushAuthorized: false,
      tagCreationAuthorized: false,
      tagPushAuthorized: false,
      releaseAuthorized: false,
      deployAuthorized: false,
      cutoverAuthorized: false,
      forceUpdateAuthorized: false,
      refDeletionAuthorized: false,
      nativeMemoryActionAuthorized: false,
      providerActionAuthorized: false,
      realMemoryReadAuthorized: false
    },
    currentSideEffects: {
      branchRefUpdates: 0,
      otherRefUpdates: 0,
      targetWorktreeIndexSynchronizations: 0,
      targetWorktreeFileSynchronizations: 0,
      remoteActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      readinessClaims: 0
    },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
  };
  return wrapPayload(payload);
}

function verifyImplementation(implementation, options, blockers) {
  try {
    const paths = options.resolveDiffPaths(IMPLEMENTATION_PARENT.commit, implementation.commit).sort();
    const entries = options.resolveDiffEntries(IMPLEMENTATION_PARENT.commit, implementation.commit)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (implementation.parentCommit !== IMPLEMENTATION_PARENT.commit ||
        implementation.parentTree !== IMPLEMENTATION_PARENT.tree ||
        options.resolveParentCommit(implementation.commit) !== implementation.parentCommit ||
        options.resolveCommitTree(implementation.commit) !== implementation.tree ||
        options.resolveCommitTree(implementation.parentCommit) !== implementation.parentTree ||
        !sameJson(paths, IMPLEMENTATION_DIFF_PATHS) || !sameJson(entries, IMPLEMENTATION_DIFF_ENTRIES) ||
        !sameJson(implementation.diffPaths, paths) || !sameJson(implementation.diffEntries, entries) ||
        implementation.diffPathsSha256 !== sha256Canonical(paths) ||
        implementation.diffEntriesSha256 !== sha256Canonical(entries) ||
        !sameJson(implementation.artifacts.map(item => item.path), IMPLEMENTATION_DIFF_PATHS)) {
      blockers.push('application.implementationLineageOrDiff');
    }
    for (const artifact of implementation.artifacts || []) {
      const actual = options.resolveGitFile(implementation.commit, artifact.path);
      if (actual.gitMode !== '100644' || actual.blobOid !== artifact.blobOid || actual.bytes !== artifact.bytes ||
          actual.sha256 !== artifact.sha256) blockers.push(`application.implementationArtifact.${artifact.path}`);
    }
  } catch {
    blockers.push('application.implementationUnreadable');
  }
}

function evaluateApplication(application = {}, options = {}) {
  const blockers = [];
  if (application.schemaVersion !== 1 || application.taskId !== TASK_ID ||
      application.artifactType !== 'cm2125_exact_branch_cas_application_v1' ||
      application.canonicalPayloadSha256 !== sha256Canonical(application.payload || {})) {
    blockers.push('application.identityOrHash');
  }
  const upstreamEvidence = intakeUpstreamEvidence(options);
  if (!upstreamEvidence.accepted) blockers.push(...upstreamEvidence.blockers.map(item => `application.${item}`));
  const implementation = application.payload?.implementation;
  if (!implementation || !validResolvers(options)) blockers.push('application.implementationOrResolvers');
  else verifyImplementation(implementation, options, blockers);
  if (upstreamEvidence.accepted && implementation) {
    try {
      if (!sameJson(application, buildApplication({ implementation, upstreamEvidence }))) blockers.push('application.exactContent');
    } catch {
      blockers.push('application.exactContent');
    }
  }
  const authority = application.payload?.currentAuthority || {};
  const state = application.payload?.currentState || {};
  const requested = application.payload?.requestedAuthorization || {};
  if (requested.branchCasMayExecuteFromThisApplication !== false || requested.branchRefUpdateAuthorized !== false ||
      requested.remoteActionAuthorized !== false || authority.contentDecisionPresent !== false ||
      authority.executionPacketPresent !== false || authority.finalExecutionReleasePresent !== false ||
      authority.applicationExecuted !== false ||
      authority.branchCasExecutionAuthorized !== false || authority.branchRefUpdateAuthorized !== false ||
      state.branchRefUpdated !== false || state.statusSyncPerformed !== false ||
      state.currentBranchStatusSynchronized !== false || state.readinessClaimed !== false ||
      Object.values(application.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(application.payload?.prohibitedAuthority || {}).some(value => value !== false) ||
      Object.values(application.payload?.nonClaims || {}).some(value => value !== false)) {
    blockers.push('application.nonExecutingBoundary');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    applicationPrepared: blockers.length === 0,
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false,
    branchRefUpdated: false,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false,
    upstreamEvidence
  };
}

module.exports = {
  APPLICATION_MARKDOWN_PATH,
  APPLICATION_PATH,
  EXPECTED_OLD,
  EXPECTED_OLD_TREE,
  FREEZE_COMMIT,
  FREEZE_IDENTITIES,
  FREEZE_PARENT,
  FREEZE_TREE,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT,
  NEW_COMMIT,
  NEW_TREE,
  REVIEW_COMMIT,
  REVIEW_IDENTITIES,
  REVIEW_TREE,
  STATUS_ENTRIES,
  STATUS_PATHS,
  TARGET_REF,
  TASK_ID,
  buildApplication,
  evaluateApplication,
  identityWithoutContent,
  intakeUpstreamEvidence,
  serializeArtifact,
  wrapPayload
};
