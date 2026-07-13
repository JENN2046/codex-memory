'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  APPLICATION_COMMIT,
  APPLICATION_TREE,
  DECISION_MARKDOWN_PATH: CONTENT_DECISION_MARKDOWN_PATH,
  DECISION_PATH: CONTENT_DECISION_PATH,
  FUTURE_BRANCH_REF,
  evaluateDecision: evaluateContentDecision
} = require('./Cm2121FullPlanStatusSyncContentDecision');
const {
  READINESS_FIELDS
} = require('./Cm2120FullPlanApplicationReceiptReview');
const {
  projectStatusFile
} = require('./Cm2121FullPlanStatusSyncApplication');
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

const TASK_ID = 'CM-2122-R2';
const FINAL_RELEASE_TASK_ID = 'CM-2123-R2';
const ACTION = 'apply_exact_full_plan_status_sync_detached_commit';
const PACKET_PATH = 'docs/near-model-memory-plan-pack/cm2122_r2_full_plan_status_sync_execution_packet.json';
const PACKET_MARKDOWN_PATH = PACKET_PATH.replace(/\.json$/, '.md');
const FINAL_RELEASE_PATH = 'docs/near-model-memory-plan-pack/cm2123_r2_full_plan_status_sync_final_release.json';
const FINAL_RELEASE_MARKDOWN_PATH = FINAL_RELEASE_PATH.replace(/\.json$/, '.md');
const EXECUTION_RECEIPT_FILENAME = 'cm2122-r2-full-plan-status-sync-execution-receipt-001.json';
const BINDING_RECEIPT_FILENAME = 'cm2122-r2-full-plan-status-sync-binding-receipt-001.json';
const REGISTRY_REFERENCE = 'cm2122-r2-full-plan-status-sync-registry-001';
const NONCE = 'cm2122-r2-full-plan-status-sync-001';
const RECEIPT_ID = 'cm2122-r2-full-plan-status-sync-receipt-001';
const SUPERSEDED_FREEZE = Object.freeze({
  implementationCommit: '60761ff5b9fc81554f80b16d4597174f212c82b7',
  executionPacketCommit: 'f3db578742ce15599b86674a2476532c802eaa74',
  finalReleaseCommit: 'ef6f8ecd2ea7989ea701ae43bd60d0ae1cba7c3d',
  finalReleaseTree: 'b76214a388d9458e9ccadc0e0619ae2bf95881f5',
  reason: 'superseded_before_execution_due_to_durable_review_git_environment_repair',
  authorizationClaimed: false,
  executorRun: false
});

const GOVERNANCE_ROOT_IDENTITY = Object.freeze({
  registryRootInstanceId: 'cm2093-phase8-governance-root-instance-001',
  registryRootReference: 'codex-memory-phase8-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
});
const GOVERNANCE_ROOT_IDENTITY_SHA256 = '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0';

const CONTENT_DECISION_FREEZE = Object.freeze({
  reference: 'CM-2121-EXACT-STATUS-SYNC-CONTENT-DECISION-7C489A3A-2D4CBE41-43CDC772',
  commit: '096eaf0c42f8e76180177eef7d16bf6edd605858',
  tree: 'e4c81196919a949ae616f5caa7222ff7869e06a7',
  parentCommit: '620cf6d3446d3af0de95a85ca2f6045bec2005d7',
  parentTree: '0bf7b88e2c83b970112adfc6209446014bbe0871',
  canonicalPayloadSha256: 'b3ef390494b9fd8a4f217f584abe93dfefc38e951cbe224d9c9a3600087b1112',
  patchPayloadSha256: '2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92',
  json: Object.freeze({
    path: CONTENT_DECISION_PATH,
    blobOid: '7a3d9667b51220d2623658e2d673bd5fee88e09d',
    bytes: 18815,
    sha256: 'a42fd82c5e78fbdac04a8a3f4847b95e3953d45ee233d8496d4eeaa8bff5775f'
  }),
  markdown: Object.freeze({
    path: CONTENT_DECISION_MARKDOWN_PATH,
    blobOid: '277c023772ee0ffd5a0696a9b6a9516894e9059d',
    bytes: 19459,
    sha256: 'eb7cd8f846f03f019eaf6266e1b79c7ca50cc10a71bd3673ad93d9ec538c3b87'
  })
});

const IMPLEMENTATION_PARENT_FREEZE = Object.freeze({
  commit: SUPERSEDED_FREEZE.finalReleaseCommit,
  tree: SUPERSEDED_FREEZE.finalReleaseTree
});

const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'scripts/generate-cm2122-full-plan-status-sync-execution-packet.js',
  'scripts/generate-cm2123-full-plan-status-sync-final-release.js',
  'src/core/Cm2122FullPlanStatusSyncExecution.js',
  'tests/cm2122-full-plan-status-sync-execution.test.js'
].sort());
const IMPLEMENTATION_DIFF_ENTRIES = Object.freeze(IMPLEMENTATION_DIFF_PATHS.map(sourcePath => ({
  status: 'M',
  path: sourcePath
})));
const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  ...IMPLEMENTATION_DIFF_PATHS,
  'package.json',
  'src/cli/cm2122-full-plan-status-sync.js',
  'scripts/freeze-cm2120-full-plan-application-receipts.js',
  'scripts/generate-cm2116-exact-full-plan-application-gate.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js',
  'src/core/Cm2117ExactFullPlanApplicationDecision.js',
  'src/core/Cm2120FullPlanApplicationReceiptReview.js',
  'src/core/Cm2121FullPlanStatusSyncApplication.js',
  'src/core/Cm2121FullPlanStatusSyncContentDecision.js'
]);
const PACKET_DIFF_PATHS = Object.freeze([PACKET_MARKDOWN_PATH, PACKET_PATH].sort());
const PACKET_DIFF_ENTRIES = Object.freeze(PACKET_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })));
const FINAL_RELEASE_DIFF_PATHS = Object.freeze([FINAL_RELEASE_MARKDOWN_PATH, FINAL_RELEASE_PATH].sort());
const FINAL_RELEASE_DIFF_ENTRIES = Object.freeze(FINAL_RELEASE_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })));
const CLAIM_ENVELOPE_KEYS = Object.freeze([
  'schemaVersion', 'registryReference', 'claimId', 'nonceHash', 'receiptIdHash', 'bindingHash',
  'finalReleaseDecisionReference', 'finalReleaseApprovedAt', 'finalReleaseExpiresAt', 'claimedAt',
  'state', 'authorizationUseCount', 'authorizationConsumed', 'authorizationReplayAllowed',
  'detachedCommitInvocationCount', 'branchRefUpdateCount', 'detachedStatusCommitCreated',
  'detachedHeadUpdateAcknowledged',
  'executionReceiptCreated', 'bindingReceiptCreated', 'detachedStatusCommit', 'detachedStatusTree',
  'executionReceiptSha256', 'bindingReceiptSha256', 'reconciliationRequired'
].sort());

const machineBoundContentDecisions = new WeakSet();
const machineBoundPackets = new WeakSet();
const machineBoundFinalReleases = new WeakSet();
const UNSAFE_GIT_ENV_KEYS = Object.freeze(new Set([
  'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE', 'GIT_REPLACE_REF_BASE', 'GIT_SHALLOW_FILE',
  'GIT_QUARANTINE_PATH', 'GIT_CONFIG', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT', 'GIT_CEILING_DIRECTORIES',
  'GIT_DISCOVERY_ACROSS_FILESYSTEM', 'GIT_EXEC_PATH'
]));

function unsafeGitEnvironmentKeys(env = process.env) {
  return Object.keys(env).filter(key => UNSAFE_GIT_ENV_KEYS.has(key) ||
    /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(key));
}

function assertSafeGitEnvironment(env = process.env) {
  const keys = unsafeGitEnvironmentKeys(env);
  if (keys.length) throw new Error(`cm2122_unsafe_git_environment:${keys.sort().join(',')}`);
  return true;
}

function sanitizedGitEnvironment(env = process.env) {
  const result = { ...env };
  for (const key of unsafeGitEnvironmentKeys(result)) delete result[key];
  return result;
}

function wrapPayload(payload, artifactType, taskId = TASK_ID) {
  return {
    schemaVersion: 1,
    taskId,
    artifactType,
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Buffer.isBuffer(value) || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function identityWithoutContent(value) {
  const { content, ...identity } = value;
  return identity;
}

function validResolvers(options = {}, names = []) {
  return names.every(name => typeof options[name] === 'function');
}

function verifyFileIdentity(actual, expected, blockers, label, sourceCommit, sourceTree) {
  if (!actual || actual.sourceCommit !== sourceCommit || actual.sourceTree !== sourceTree ||
      actual.sourcePath !== expected.path || actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 ||
      !Buffer.isBuffer(actual.content) || gitBlobOid(actual.content) !== expected.blobOid ||
      sha256(actual.content) !== expected.sha256) blockers.push(label);
}

function expectedImplementationEntries() {
  return IMPLEMENTATION_DIFF_ENTRIES;
}

function verifyRecordedImplementation(implementation, options, blockers, label) {
  try {
    const paths = options.resolveDiffPaths(implementation.parentCommit, implementation.commit).sort();
    const entries = options.resolveDiffEntries(implementation.parentCommit, implementation.commit)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveCommitTree(implementation.commit) !== implementation.tree ||
        options.resolveParentCommit(implementation.commit) !== implementation.parentCommit ||
        options.resolveCommitTree(implementation.parentCommit) !== implementation.parentTree ||
        !sameJson(paths, implementation.diffPaths) || !sameJson(entries, implementation.diffEntries) ||
        implementation.diffPathsSha256 !== sha256Canonical(paths) ||
        implementation.diffEntriesSha256 !== sha256Canonical(entries) || !Array.isArray(implementation.artifacts)) {
      blockers.push(`${label}.lineageOrDiff`);
      return;
    }
    for (const artifact of implementation.artifacts) {
      const actual = options.resolveGitFile(implementation.commit, artifact.path);
      if (actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' || actual.blobOid !== artifact.blobOid ||
          actual.bytes !== artifact.bytes || actual.sha256 !== artifact.sha256) blockers.push(`${label}.artifact.${artifact.path}`);
    }
  } catch {
    blockers.push(`${label}.unreadable`);
  }
}

function intakeContentDecision(options = {}) {
  const blockers = [];
  const required = ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries',
    'resolveGitFile', 'isCommitAncestor'];
  if (!validResolvers(options, required)) return { accepted: false, blockers: ['contentDecision.gitResolversRequired'] };
  let decision = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  try {
    const paths = options.resolveDiffPaths(CONTENT_DECISION_FREEZE.parentCommit, CONTENT_DECISION_FREEZE.commit).sort();
    const entries = options.resolveDiffEntries(CONTENT_DECISION_FREEZE.parentCommit, CONTENT_DECISION_FREEZE.commit)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveCommitTree(CONTENT_DECISION_FREEZE.commit) !== CONTENT_DECISION_FREEZE.tree ||
        options.resolveParentCommit(CONTENT_DECISION_FREEZE.commit) !== CONTENT_DECISION_FREEZE.parentCommit ||
        options.resolveCommitTree(CONTENT_DECISION_FREEZE.parentCommit) !== CONTENT_DECISION_FREEZE.parentTree ||
        !sameJson(paths, [CONTENT_DECISION_PATH, CONTENT_DECISION_MARKDOWN_PATH].sort()) ||
        !sameJson(entries, [{ status: 'A', path: CONTENT_DECISION_PATH },
          { status: 'A', path: CONTENT_DECISION_MARKDOWN_PATH }].sort((a, b) => a.path.localeCompare(b.path)))) {
      blockers.push('contentDecision.lineageOrDiff');
    }
    jsonIdentity = options.resolveGitFile(CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_PATH);
    markdownIdentity = options.resolveGitFile(CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_MARKDOWN_PATH);
    verifyFileIdentity(jsonIdentity, CONTENT_DECISION_FREEZE.json, blockers, 'contentDecision.json',
      CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_FREEZE.tree);
    verifyFileIdentity(markdownIdentity, CONTENT_DECISION_FREEZE.markdown, blockers, 'contentDecision.markdown',
      CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_FREEZE.tree);
    decision = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (!markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd()) ||
        decision.payload?.decisionReference !== CONTENT_DECISION_FREEZE.reference ||
        decision.canonicalPayloadSha256 !== CONTENT_DECISION_FREEZE.canonicalPayloadSha256 ||
        decision.payload?.exactContent?.patchPayloadSha256 !== CONTENT_DECISION_FREEZE.patchPayloadSha256) {
      blockers.push('contentDecision.exactContent');
    }
    verifyRecordedImplementation(decision.payload?.decisionImplementation || {}, options, blockers,
      'contentDecision.recordedImplementation');
    const evaluation = evaluateContentDecision(decision, {
      implementation: decision.payload?.decisionImplementation,
      ...options
    });
    if (!evaluation.accepted || evaluation.authorizationContentApproved !== true ||
        evaluation.statusSyncExecutionAuthorized !== false || evaluation.finalExecutionReleasePresent !== false ||
        evaluation.finalExecutionReleaseAuthorized !== false || evaluation.branchRefUpdateAuthorized !== false ||
        evaluation.statusSyncPerformed !== false || evaluation.currentBranchStatusSynchronized !== false ||
        evaluation.readinessClaimed !== false) {
      blockers.push(...evaluation.blockers.map(item => `contentDecision.${item}`));
      blockers.push('contentDecision.nonExecutingBoundary');
    }
  } catch {
    blockers.push('contentDecision.unreadable');
  }
  const accepted = blockers.length === 0;
  if (accepted) {
    deepFreeze(decision);
    machineBoundContentDecisions.add(decision);
  }
  return {
    accepted,
    blockers: [...new Set(blockers)],
    decision,
    jsonIdentity,
    markdownIdentity,
    contentDecisionMachineBound: accepted,
    statusSyncExecutionAuthorized: false,
    branchRefUpdateAuthorized: false
  };
}

function isMachineBoundContentDecision(value) {
  return !!value && machineBoundContentDecisions.has(value);
}

function buildExecutionPacket({ implementation, contentEvidence }) {
  if (!contentEvidence?.accepted || !isMachineBoundContentDecision(contentEvidence.decision)) {
    throw new Error('cm2122_machine_bound_content_decision_required');
  }
  const decision = contentEvidence.decision;
  const payload = {
    packetReference: `CM-2122-R2-STATUS-SYNC-EXECUTION-PACKET-${decision.canonicalPayloadSha256.slice(0, 8)}-${implementation.commit.slice(0, 8)}`.toUpperCase(),
    packetType: 'non_executing_exact_status_sync_execution_packet',
    implementation,
    contentDecision: {
      reference: CONTENT_DECISION_FREEZE.reference,
      commit: CONTENT_DECISION_FREEZE.commit,
      tree: CONTENT_DECISION_FREEZE.tree,
      parentCommit: CONTENT_DECISION_FREEZE.parentCommit,
      parentTree: CONTENT_DECISION_FREEZE.parentTree,
      canonicalPayloadSha256: CONTENT_DECISION_FREEZE.canonicalPayloadSha256,
      patchPayloadSha256: CONTENT_DECISION_FREEZE.patchPayloadSha256,
      json: identityWithoutContent(contentEvidence.jsonIdentity),
      markdown: identityWithoutContent(contentEvidence.markdownIdentity),
      machineGitIntakeRequired: true
    },
    upstream: {
      statusSyncApplicationCommit: APPLICATION_COMMIT,
      statusSyncApplicationTree: APPLICATION_TREE,
      receiptReviewCommit: decision.payload.receiptReview.commit,
      evidenceApplicationCommit: '41097b0fb1118a47f3d16873a12a5e0fcc75a94b',
      evidenceApplicationAnchored: true
    },
    supersedes: SUPERSEDED_FREEZE,
    detachedCommitBoundary: {
      targetBranchRef: FUTURE_BRANCH_REF,
      parentMustBeFinalReleaseSourceCommit: true,
      parentTreeMustBeFinalReleaseSourceTree: true,
      exactPaths: decision.payload.exactContent.exactPaths,
      exactEntries: decision.payload.exactContent.exactEntries,
      targets: decision.payload.exactContent.targets,
      patchPayloadSha256: decision.payload.exactContent.patchPayloadSha256,
      exactNineModifiedPathsOnly: true,
      receiptsIncludedInCommit: false,
      detachedWorktreeHeadMayAdvance: true,
      detachedCommitCreationMethod: 'git_commit_tree_without_hooks',
      detachedHeadUpdateMethod: 'git_update_ref_head_expected_old_cas',
      detachedHeadExpectedOldMustEqualFinalReleaseCommit: true,
      gitHooksAllowed: false,
      gitCommitSigningAllowed: false,
      branchRefUpdateAuthorized: false,
      remoteRefUpdateAuthorized: false
    },
    runtimeBoundary: {
      repositoryRootRequired: true,
      cleanDetachedCheckoutRequired: true,
      headMustEqualFinalReleaseSourceCommit: true,
      treeMustEqualFinalReleaseSourceTree: true,
      targetBranchMustStillPointToFinalReleaseSourceCommit: true,
      callerBranchArgumentAllowed: false,
      callerOutputPathAllowed: false,
      callerRegistryRootAllowed: false,
      callerCallbackAllowed: false,
      callerResolverAllowed: false,
      gitRepositoryEnvironmentOverridesAllowed: false,
      gitObjectEnvironmentOverridesAllowed: false,
      gitIndexEnvironmentOverridesAllowed: false,
      sanitizedGitChildEnvironmentRequired: true
    },
    oneShotRegistry: {
      governanceRootAuthority: 'git_common_dir_fixed_governance_root',
      governanceRootIdentitySha256: GOVERNANCE_ROOT_IDENTITY_SHA256,
      registryReference: REGISTRY_REFERENCE,
      nonce: NONCE,
      receiptId: RECEIPT_ID,
      claimIdDerivationExcludesBindingHash: true,
      atomicExclusiveCreateRequired: true,
      durableReentryRequired: true,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      alternateRootAllowed: false,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false
    },
    receiptBoundary: {
      executionReceiptFilename: EXECUTION_RECEIPT_FILENAME,
      bindingReceiptFilename: BINDING_RECEIPT_FILENAME,
      receiptsStoredOutsideDetachedCommit: true,
      receiptRootAuthority: 'git_common_dir_fixed_governance_root',
      upstreamGitRevalidationRequired: true,
      detachedCommitGitBindingRequired: true,
      postBindingBranchRefDecisionRequired: true
    },
    finalReleaseRequirements: {
      separateFinalExecutionReleaseRequired: true,
      finalReleaseMustBindContentDecisionGitIdentity: true,
      finalReleaseMustBindPacketGitIdentity: true,
      finalReleaseMustBindImplementationGitIdentity: true,
      finalReleaseCommitMustBeDirectChildOfPacketCommit: true,
      finalReleaseMayAuthorizeOneDetachedCommit: true,
      finalReleaseMayAuthorizeBranchRefUpdate: false,
      finalReleaseMayAuthorizeRemoteAction: false
    },
    currentAuthority: {
      authorizationContentApproved: true,
      finalExecutionReleasePresent: false,
      finalExecutionReleaseAuthorized: false,
      statusSyncExecutionAuthorized: false,
      detachedStatusCommitCreationAuthorized: false,
      branchRefUpdateAuthorized: false
    },
    currentState: {
      claimCreated: false,
      detachedStatusCommitCreated: false,
      detachedStatusCommitBound: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      fullPlanPackCompletedInBoundEvidence: true,
      readinessClaimed: false
    },
    sideEffectLimits: {
      claimCreates: 1,
      repositoryPatches: 1,
      detachedStatusCommits: 1,
      detachedHeadUpdates: 1,
      executionReceipts: 1,
      bindingReceipts: 1,
      branchRefUpdates: 0,
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
      detachedStatusCommits: 0,
      detachedHeadUpdates: 0,
      executionReceipts: 0,
      bindingReceipts: 0,
      branchRefUpdates: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
  };
  return wrapPayload(payload, 'cm2122_r2_non_executing_full_plan_status_sync_packet_v1');
}

function verifyImplementation(implementation, options, blockers) {
  try {
    const paths = options.resolveDiffPaths(IMPLEMENTATION_PARENT_FREEZE.commit, implementation.commit).sort();
    const entries = options.resolveDiffEntries(IMPLEMENTATION_PARENT_FREEZE.commit, implementation.commit)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (implementation.parentCommit !== IMPLEMENTATION_PARENT_FREEZE.commit ||
        implementation.parentTree !== IMPLEMENTATION_PARENT_FREEZE.tree ||
        options.resolveCommitTree(implementation.commit) !== implementation.tree ||
        options.resolveParentCommit(implementation.commit) !== implementation.parentCommit ||
        options.resolveCommitTree(implementation.parentCommit) !== implementation.parentTree ||
        !sameJson(paths, IMPLEMENTATION_DIFF_PATHS) || !sameJson(entries, expectedImplementationEntries()) ||
        !sameJson(implementation.diffPaths, paths) || !sameJson(implementation.diffEntries, entries) ||
        implementation.diffPathsSha256 !== sha256Canonical(paths) ||
        implementation.diffEntriesSha256 !== sha256Canonical(entries) ||
        !options.isCommitAncestor(CONTENT_DECISION_FREEZE.commit, implementation.commit) ||
        !sameJson(implementation.artifacts.map(item => item.path), IMPLEMENTATION_ARTIFACT_PATHS)) {
      blockers.push('packet.implementationLineageOrDiff');
    }
    for (const artifact of implementation.artifacts || []) {
      const actual = options.resolveGitFile(implementation.commit, artifact.path);
      if (actual.blobOid !== artifact.blobOid || actual.bytes !== artifact.bytes || actual.sha256 !== artifact.sha256 ||
          actual.gitMode !== '100644' || actual.gitObjectType !== 'blob') blockers.push(`packet.implementationArtifact.${artifact.path}`);
    }
  } catch {
    blockers.push('packet.implementationUnreadable');
  }
}

function evaluateExecutionPacket(packet = {}, options = {}) {
  const blockers = [];
  if (packet.schemaVersion !== 1 || packet.taskId !== TASK_ID ||
      packet.artifactType !== 'cm2122_r2_non_executing_full_plan_status_sync_packet_v1' ||
      packet.canonicalPayloadSha256 !== sha256Canonical(packet.payload || {})) blockers.push('packet.identityOrHash');
  const contentEvidence = intakeContentDecision(options);
  if (!contentEvidence.accepted) blockers.push(...contentEvidence.blockers.map(item => `packet.${item}`));
  const implementation = packet.payload?.implementation;
  if (!implementation || !validResolvers(options, ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths',
    'resolveDiffEntries', 'resolveGitFile', 'isCommitAncestor'])) blockers.push('packet.implementationOrResolvers');
  else verifyImplementation(implementation, options, blockers);
  if (contentEvidence.accepted && implementation) {
    try {
      const expected = buildExecutionPacket({ implementation, contentEvidence });
      if (!sameJson(packet, expected)) blockers.push('packet.exactContent');
    } catch {
      blockers.push('packet.exactContent');
    }
  }
  const authority = packet.payload?.currentAuthority || {};
  const current = packet.payload?.currentState || {};
  if (authority.finalExecutionReleasePresent !== false || authority.finalExecutionReleaseAuthorized !== false ||
      authority.statusSyncExecutionAuthorized !== false || authority.detachedStatusCommitCreationAuthorized !== false ||
      authority.branchRefUpdateAuthorized !== false || current.claimCreated !== false ||
      current.detachedStatusCommitCreated !== false || current.detachedStatusCommitBound !== false ||
      current.statusSyncPerformed !== false || current.currentBranchStatusSynchronized !== false ||
      current.readinessClaimed !== false || Object.values(packet.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(packet.payload?.nonClaims || {}).some(value => value !== false)) blockers.push('packet.nonExecutingBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    packetPrepared: blockers.length === 0,
    statusSyncExecutionAuthorized: false,
    detachedStatusCommitCreationAuthorized: false,
    branchRefUpdateAuthorized: false,
    readinessClaimed: false,
    contentEvidence
  };
}

function intakeExecutionPacket({ packetCommit, ...options } = {}) {
  const blockers = [];
  let packet = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  let packetTree = null;
  if (!/^[a-f0-9]{40}$/.test(packetCommit || '') || !validResolvers(options,
    ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries', 'resolveGitFile'])) {
    return { accepted: false, blockers: ['packetIntake.commitOrResolversRequired'] };
  }
  try {
    packetTree = options.resolveCommitTree(packetCommit);
    jsonIdentity = options.resolveGitFile(packetCommit, PACKET_PATH);
    markdownIdentity = options.resolveGitFile(packetCommit, PACKET_MARKDOWN_PATH);
    packet = JSON.parse(jsonIdentity.content.toString('utf8'));
    const implementation = packet.payload?.implementation;
    const paths = options.resolveDiffPaths(implementation.commit, packetCommit).sort();
    const entries = options.resolveDiffEntries(implementation.commit, packetCommit)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveParentCommit(packetCommit) !== implementation.commit ||
        options.resolveCommitTree(implementation.commit) !== implementation.tree ||
        !sameJson(paths, PACKET_DIFF_PATHS) || !sameJson(entries, PACKET_DIFF_ENTRIES) ||
        jsonIdentity.gitMode !== '100644' || markdownIdentity.gitMode !== '100644' ||
        !markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('packetIntake.lineageOrFiles');
    }
    const evaluation = evaluateExecutionPacket(packet, options);
    if (!evaluation.accepted) blockers.push(...evaluation.blockers.map(item => `packetIntake.${item}`));
  } catch {
    blockers.push('packetIntake.unreadable');
  }
  const accepted = blockers.length === 0;
  if (accepted) {
    deepFreeze(packet);
    machineBoundPackets.add(packet);
  }
  return {
    accepted,
    blockers: [...new Set(blockers)],
    packet,
    packetCommit,
    packetTree,
    jsonIdentity,
    markdownIdentity,
    packetMachineBound: accepted,
    statusSyncExecutionAuthorized: false,
    branchRefUpdateAuthorized: false
  };
}

function isMachineBoundExecutionPacket(value) {
  return !!value && machineBoundPackets.has(value);
}

function buildFinalReleaseDecision({ packetEvidence, approvedAt, expiresAt }) {
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet)) {
    throw new Error('cm2123_machine_bound_execution_packet_required');
  }
  const packet = packetEvidence.packet;
  const payload = {
    decisionReference: `CM-2123-R2-STATUS-SYNC-FINAL-RELEASE-${packet.canonicalPayloadSha256.slice(0, 8)}-${packetEvidence.packetCommit.slice(0, 8)}`.toUpperCase(),
    decisionType: 'exact_one_shot_detached_status_commit_final_execution_release',
    contentDecision: packet.payload.contentDecision,
    executionPacket: {
      reference: packet.payload.packetReference,
      commit: packetEvidence.packetCommit,
      tree: packetEvidence.packetTree,
      canonicalPayloadSha256: packet.canonicalPayloadSha256,
      json: identityWithoutContent(packetEvidence.jsonIdentity),
      markdown: identityWithoutContent(packetEvidence.markdownIdentity)
    },
    implementation: packet.payload.implementation,
    supersedes: packet.payload.supersedes,
    detachedCommitBoundary: packet.payload.detachedCommitBoundary,
    oneShotRegistry: packet.payload.oneShotRegistry,
    receiptBoundary: packet.payload.receiptBoundary,
    authorization: {
      executionReleaseAuthorized: true,
      exactAction: ACTION,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      approvedAt,
      expiresAt,
      statusSyncExecutionAuthorized: true,
      detachedStatusCommitCreationAuthorized: true,
      detachedWorktreeHeadUpdateAuthorized: true,
      branchRefUpdateAuthorized: false,
      remoteRefUpdateAuthorized: false,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false,
      postBindingBranchRefDecisionRequired: true
    },
    sideEffectLimits: packet.payload.sideEffectLimits,
    currentState: {
      claimCreated: false,
      detachedStatusCommitCreated: false,
      detachedStatusCommitBound: false,
      branchRefUpdated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      fullPlanPackCompletedInBoundEvidence: true,
      readinessClaimed: false
    },
    currentSideEffects: packet.payload.currentSideEffects,
    nonClaims: packet.payload.nonClaims
  };
  return wrapPayload(payload, 'cm2123_r2_full_plan_status_sync_final_execution_release_v1', FINAL_RELEASE_TASK_ID);
}

function evaluateFinalReleaseDecision(decision = {}, { packetEvidence, now = new Date() } = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.taskId !== FINAL_RELEASE_TASK_ID ||
      decision.artifactType !== 'cm2123_r2_full_plan_status_sync_final_execution_release_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) blockers.push('finalRelease.identityOrHash');
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet)) blockers.push('finalRelease.machineBoundPacketRequired');
  else {
    try {
      const expected = buildFinalReleaseDecision({
        packetEvidence,
        approvedAt: decision.payload?.authorization?.approvedAt,
        expiresAt: decision.payload?.authorization?.expiresAt
      });
      if (!sameJson(decision, expected)) blockers.push('finalRelease.exactContent');
    } catch {
      blockers.push('finalRelease.exactContent');
    }
  }
  const authority = decision.payload?.authorization || {};
  const approvedAt = Date.parse(authority.approvedAt || '');
  const expiresAt = Date.parse(authority.expiresAt || '');
  const observedAt = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(observedAt) ||
      approvedAt >= expiresAt || observedAt < approvedAt || observedAt >= expiresAt) blockers.push('finalRelease.authorizationWindow');
  if (authority.executionReleaseAuthorized !== true || authority.exactAction !== ACTION ||
      authority.authorizationUseCount !== 1 || authority.authorizationReplayAllowed !== false ||
      authority.statusSyncExecutionAuthorized !== true || authority.detachedStatusCommitCreationAuthorized !== true ||
      authority.detachedWorktreeHeadUpdateAuthorized !== true || authority.branchRefUpdateAuthorized !== false ||
      authority.remoteRefUpdateAuthorized !== false || authority.automaticRetryAllowed !== false ||
      authority.automaticCleanupAllowed !== false || authority.postBindingBranchRefDecisionRequired !== true ||
      decision.payload?.sideEffectLimits?.branchRefUpdates !== 0 ||
      Object.values(decision.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(decision.payload?.nonClaims || {}).some(value => value !== false)) blockers.push('finalRelease.authorityBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    executionReleaseAuthorized: blockers.length === 0,
    statusSyncExecutionAuthorized: blockers.length === 0,
    detachedStatusCommitCreationAuthorized: blockers.length === 0,
    branchRefUpdateAuthorized: false,
    readinessClaimed: false
  };
}

function intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now = new Date(), ...options } = {}) {
  const blockers = [];
  let decision = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  let finalReleaseTree = null;
  if (!/^[a-f0-9]{40}$/.test(finalReleaseCommit || '') || !packetEvidence?.accepted ||
      !validResolvers(options, ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries', 'resolveGitFile'])) {
    return { accepted: false, blockers: ['finalReleaseIntake.inputsOrResolversRequired'] };
  }
  try {
    finalReleaseTree = options.resolveCommitTree(finalReleaseCommit);
    jsonIdentity = options.resolveGitFile(finalReleaseCommit, FINAL_RELEASE_PATH);
    markdownIdentity = options.resolveGitFile(finalReleaseCommit, FINAL_RELEASE_MARKDOWN_PATH);
    decision = JSON.parse(jsonIdentity.content.toString('utf8'));
    const paths = options.resolveDiffPaths(packetEvidence.packetCommit, finalReleaseCommit).sort();
    const entries = options.resolveDiffEntries(packetEvidence.packetCommit, finalReleaseCommit)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveParentCommit(finalReleaseCommit) !== packetEvidence.packetCommit ||
        options.resolveCommitTree(packetEvidence.packetCommit) !== packetEvidence.packetTree ||
        !sameJson(paths, FINAL_RELEASE_DIFF_PATHS) || !sameJson(entries, FINAL_RELEASE_DIFF_ENTRIES) ||
        jsonIdentity.gitMode !== '100644' || markdownIdentity.gitMode !== '100644' ||
        !markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('finalReleaseIntake.lineageOrFiles');
    }
    const evaluation = evaluateFinalReleaseDecision(decision, { packetEvidence, now });
    if (!evaluation.accepted) blockers.push(...evaluation.blockers.map(item => `finalReleaseIntake.${item}`));
  } catch {
    blockers.push('finalReleaseIntake.unreadable');
  }
  const accepted = blockers.length === 0;
  if (accepted) {
    deepFreeze(decision);
    machineBoundFinalReleases.add(decision);
  }
  return {
    accepted,
    blockers: [...new Set(blockers)],
    decision,
    finalReleaseCommit,
    finalReleaseTree,
    jsonIdentity,
    markdownIdentity,
    finalReleaseMachineBound: accepted,
    statusSyncExecutionAuthorized: accepted,
    detachedStatusCommitCreationAuthorized: accepted,
    branchRefUpdateAuthorized: false
  };
}

function isMachineBoundFinalReleaseDecision(value) {
  return !!value && machineBoundFinalReleases.has(value);
}

function claimId() {
  return sha256Canonical({ registryReference: REGISTRY_REFERENCE, nonce: NONCE, receiptId: RECEIPT_ID });
}

function claimFileName() {
  return `.cm2122-r2-status-sync-claim-${claimId()}.json`;
}

class Cm2122StatusSyncClaimRegistry {
  constructor({ governanceRoot, fsApi = fsPromises } = {}) {
    if (!governanceRoot || !path.isAbsolute(governanceRoot)) throw new Error('cm2122_fixed_governance_root_required');
    this.governanceRoot = governanceRoot;
    this.fs = fsApi;
    this.claimPath = path.join(governanceRoot, claimFileName());
  }

  async verifyRoot() {
    let verifiedRootStat = null;
    for (const directory of [path.dirname(this.governanceRoot), this.governanceRoot]) {
      const directoryStat = await this.fs.lstat(directory);
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
        throw new Error('cm2122_governance_root_directory_invalid');
      }
      if (path.resolve(directory) === path.resolve(this.governanceRoot)) verifiedRootStat = directoryStat;
    }
    const realRoot = await this.fs.realpath(this.governanceRoot);
    if (path.resolve(realRoot) !== path.resolve(this.governanceRoot)) {
      throw new Error('cm2122_governance_root_symlink_forbidden');
    }
    const identityPath = path.join(this.governanceRoot, '.phase8-registry-root-identity.json');
    const stat = await this.fs.lstat(identityPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('cm2122_governance_root_identity_invalid');
    const bytes = await this.fs.readFile(identityPath);
    if (sha256(bytes) !== GOVERNANCE_ROOT_IDENTITY_SHA256 ||
        !sameJson(JSON.parse(bytes.toString('utf8')), GOVERNANCE_ROOT_IDENTITY)) {
      throw new Error('cm2122_governance_root_identity_mismatch');
    }
    return { dev: verifiedRootStat.dev, ino: verifiedRootStat.ino };
  }

  validateEnvelope(envelope, bindingHash, finalReleaseEvidence = null) {
    const states = new Set([
      'STATUS_COMMIT_INVOCATION_CONSUMED', 'DETACHED_STATUS_COMMIT_CREATED',
      'EXECUTION_RECEIPT_WRITTEN', 'BINDING_RECEIPT_WRITTEN',
      'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION',
      'CONSUMED_AMBIGUOUS_POST_COMMIT'
    ]);
    const keys = envelope && typeof envelope === 'object' ? Object.keys(envelope).sort() : [];
    const claimedAt = Date.parse(envelope?.claimedAt || '');
    const approvedAt = Date.parse(envelope?.finalReleaseApprovedAt || '');
    const expiresAt = Date.parse(envelope?.finalReleaseExpiresAt || '');
    if (!envelope || !sameJson(keys, CLAIM_ENVELOPE_KEYS) || envelope.schemaVersion !== 1 ||
        envelope.registryReference !== REGISTRY_REFERENCE ||
        envelope.claimId !== claimId() || envelope.nonceHash !== sha256(NONCE) ||
        envelope.receiptIdHash !== sha256(RECEIPT_ID) || envelope.bindingHash !== bindingHash ||
        !states.has(envelope.state) || envelope.authorizationUseCount !== 1 ||
        envelope.authorizationConsumed !== true || envelope.authorizationReplayAllowed !== false ||
        envelope.detachedCommitInvocationCount !== 1 || envelope.branchRefUpdateCount !== 0 ||
        !Number.isFinite(claimedAt) || !Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) ||
        claimedAt < approvedAt || claimedAt >= expiresAt) {
      throw new Error('cm2122_claim_envelope_invalid');
    }
    if (finalReleaseEvidence && (envelope.finalReleaseDecisionReference !== finalReleaseEvidence.decision.payload.decisionReference ||
        envelope.finalReleaseApprovedAt !== finalReleaseEvidence.decision.payload.authorization.approvedAt ||
        envelope.finalReleaseExpiresAt !== finalReleaseEvidence.decision.payload.authorization.expiresAt)) {
      throw new Error('cm2122_claim_final_release_binding_mismatch');
    }
    const detachedKnown = envelope.detachedStatusCommitCreated === true &&
      envelope.detachedHeadUpdateAcknowledged === true &&
      /^[a-f0-9]{40}$/.test(envelope.detachedStatusCommit || '') &&
      /^[a-f0-9]{40}$/.test(envelope.detachedStatusTree || '');
    const executionKnown = envelope.executionReceiptCreated === true &&
      /^[a-f0-9]{64}$/.test(envelope.executionReceiptSha256 || '');
    const bindingKnown = envelope.bindingReceiptCreated === true &&
      /^[a-f0-9]{64}$/.test(envelope.bindingReceiptSha256 || '');
    const exactInitial = envelope.detachedStatusCommitCreated === false && envelope.detachedHeadUpdateAcknowledged === false &&
      envelope.detachedStatusCommit === null &&
      envelope.detachedStatusTree === null && envelope.executionReceiptCreated === false &&
      envelope.executionReceiptSha256 === null && envelope.bindingReceiptCreated === false &&
      envelope.bindingReceiptSha256 === null && envelope.reconciliationRequired === true;
    const exactDetached = detachedKnown && envelope.executionReceiptCreated === false &&
      envelope.executionReceiptSha256 === null && envelope.bindingReceiptCreated === false &&
      envelope.bindingReceiptSha256 === null && envelope.reconciliationRequired === true;
    const exactExecution = detachedKnown && executionKnown && envelope.bindingReceiptCreated === false &&
      envelope.bindingReceiptSha256 === null && envelope.reconciliationRequired === true;
    const exactBinding = detachedKnown && executionKnown && bindingKnown && envelope.reconciliationRequired === true;
    const exactSuccess = detachedKnown && executionKnown && bindingKnown && envelope.reconciliationRequired === false;
    const ambiguousShape = envelope.reconciliationRequired === true &&
      [true, false, null].includes(envelope.detachedStatusCommitCreated) &&
      [true, false, null].includes(envelope.detachedHeadUpdateAcknowledged) &&
      [true, false, null].includes(envelope.executionReceiptCreated) &&
      [true, false, null].includes(envelope.bindingReceiptCreated) &&
      (envelope.detachedStatusCommit === null || /^[a-f0-9]{40}$/.test(envelope.detachedStatusCommit)) &&
      (envelope.detachedStatusTree === null || /^[a-f0-9]{40}$/.test(envelope.detachedStatusTree)) &&
      (envelope.executionReceiptSha256 === null || /^[a-f0-9]{64}$/.test(envelope.executionReceiptSha256)) &&
      (envelope.bindingReceiptSha256 === null || /^[a-f0-9]{64}$/.test(envelope.bindingReceiptSha256));
    const stateShapeAccepted = {
      STATUS_COMMIT_INVOCATION_CONSUMED: exactInitial,
      DETACHED_STATUS_COMMIT_CREATED: exactDetached,
      EXECUTION_RECEIPT_WRITTEN: exactExecution,
      BINDING_RECEIPT_WRITTEN: exactBinding,
      CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION: exactSuccess,
      CONSUMED_AMBIGUOUS_POST_COMMIT: ambiguousShape
    }[envelope.state];
    if (!stateShapeAccepted) throw new Error('cm2122_claim_state_effect_mismatch');
  }

  async read(bindingHash, finalReleaseEvidence = null) {
    await this.verifyRoot();
    const stat = await this.fs.lstat(this.claimPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('cm2122_claim_invalid');
    const envelope = JSON.parse((await this.fs.readFile(this.claimPath)).toString('utf8'));
    this.validateEnvelope(envelope, bindingHash || envelope.bindingHash, finalReleaseEvidence);
    return envelope;
  }

  async inspectExisting(bindingHash, finalReleaseEvidence) {
    await this.verifyRoot();
    if (!finalReleaseEvidence?.accepted || !isMachineBoundFinalReleaseDecision(finalReleaseEvidence.decision)) {
      return { claimEnvelopePresent: true, state: 'CLAIM_REGISTRY_AMBIGUOUS', authorizationConsumed: true,
        replayAllowed: false, reconciliationRequired: true, claimEnvelopeBindingVerified: false, envelope: null };
    }
    try {
      const stat = await this.fs.lstat(this.claimPath);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('invalid');
    } catch (error) {
      if (error.code === 'ENOENT') return { claimEnvelopePresent: false, authorizationConsumed: false, replayAllowed: false };
      return { claimEnvelopePresent: true, state: 'CLAIM_REGISTRY_AMBIGUOUS', authorizationConsumed: true,
        replayAllowed: false, reconciliationRequired: true, claimEnvelopeBindingVerified: false, envelope: null };
    }
    try {
      const envelope = await this.read(bindingHash, finalReleaseEvidence);
      return { claimEnvelopePresent: true, state: envelope.state, authorizationConsumed: true,
        replayAllowed: false, reconciliationRequired: envelope.reconciliationRequired,
        claimEnvelopeBindingVerified: true, envelope };
    } catch {
      return { claimEnvelopePresent: true, state: 'CLAIM_REGISTRY_AMBIGUOUS', authorizationConsumed: true,
        replayAllowed: false, reconciliationRequired: true, claimEnvelopeBindingVerified: false, envelope: null };
    }
  }

  async claim(bindingHash, finalReleaseEvidence, observedAt) {
    await this.verifyRoot();
    if (!/^[a-f0-9]{64}$/.test(bindingHash || '') || !finalReleaseEvidence?.accepted ||
        !isMachineBoundFinalReleaseDecision(finalReleaseEvidence.decision)) {
      throw new Error('cm2122_machine_bound_final_release_required');
    }
    const claimDate = observedAt instanceof Date ? observedAt : new Date(observedAt);
    const claimedAt = claimDate.toISOString();
    const approvedAt = Date.parse(finalReleaseEvidence.decision.payload.authorization.approvedAt);
    const expiresAt = Date.parse(finalReleaseEvidence.decision.payload.authorization.expiresAt);
    const claimedAtMs = claimDate.getTime();
    if (!Number.isFinite(claimedAtMs) || claimedAtMs < approvedAt || claimedAtMs >= expiresAt) {
      throw new Error('cm2122_claim_outside_final_release_window');
    }
    const envelope = {
      schemaVersion: 1,
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      nonceHash: sha256(NONCE),
      receiptIdHash: sha256(RECEIPT_ID),
      bindingHash,
      finalReleaseDecisionReference: finalReleaseEvidence.decision.payload.decisionReference,
      finalReleaseApprovedAt: finalReleaseEvidence.decision.payload.authorization.approvedAt,
      finalReleaseExpiresAt: finalReleaseEvidence.decision.payload.authorization.expiresAt,
      claimedAt,
      state: 'STATUS_COMMIT_INVOCATION_CONSUMED',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      detachedCommitInvocationCount: 1,
      branchRefUpdateCount: 0,
      detachedStatusCommitCreated: false,
      detachedHeadUpdateAcknowledged: false,
      executionReceiptCreated: false,
      bindingReceiptCreated: false,
      detachedStatusCommit: null,
      detachedStatusTree: null,
      executionReceiptSha256: null,
      bindingReceiptSha256: null,
      reconciliationRequired: true
    };
    this.validateEnvelope(envelope, bindingHash, finalReleaseEvidence);
    try {
      await this.fs.writeFile(this.claimPath, JSON.stringify(canonicalize(envelope)), { flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('cm2122_authorization_already_claimed');
      throw error;
    }
    const observed = await this.read(bindingHash, finalReleaseEvidence);
    if (!sameJson(observed, envelope)) throw new Error('cm2122_claim_readback_mismatch');
    return observed;
  }

  async transition(bindingHash, expectedState, state, details = {}, finalReleaseEvidence = null) {
    const allowed = {
      STATUS_COMMIT_INVOCATION_CONSUMED: ['DETACHED_STATUS_COMMIT_CREATED', 'CONSUMED_AMBIGUOUS_POST_COMMIT'],
      DETACHED_STATUS_COMMIT_CREATED: ['EXECUTION_RECEIPT_WRITTEN', 'CONSUMED_AMBIGUOUS_POST_COMMIT'],
      EXECUTION_RECEIPT_WRITTEN: ['BINDING_RECEIPT_WRITTEN', 'CONSUMED_AMBIGUOUS_POST_COMMIT'],
      BINDING_RECEIPT_WRITTEN: ['CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION', 'CONSUMED_AMBIGUOUS_POST_COMMIT']
    };
    if (!allowed[expectedState]?.includes(state)) throw new Error('cm2122_claim_transition_invalid');
    const current = await this.read(bindingHash, finalReleaseEvidence);
    if (current.state !== expectedState) throw new Error('cm2122_claim_state_mismatch');
    const next = {
      ...current,
      state,
      detachedStatusCommitCreated: Object.hasOwn(details, 'detachedStatusCommitCreated')
        ? details.detachedStatusCommitCreated : current.detachedStatusCommitCreated,
      detachedHeadUpdateAcknowledged: Object.hasOwn(details, 'detachedHeadUpdateAcknowledged')
        ? details.detachedHeadUpdateAcknowledged : current.detachedHeadUpdateAcknowledged,
      executionReceiptCreated: Object.hasOwn(details, 'executionReceiptCreated')
        ? details.executionReceiptCreated : current.executionReceiptCreated,
      bindingReceiptCreated: Object.hasOwn(details, 'bindingReceiptCreated')
        ? details.bindingReceiptCreated : current.bindingReceiptCreated,
      detachedStatusCommit: Object.hasOwn(details, 'detachedStatusCommit') ? details.detachedStatusCommit : current.detachedStatusCommit,
      detachedStatusTree: Object.hasOwn(details, 'detachedStatusTree') ? details.detachedStatusTree : current.detachedStatusTree,
      executionReceiptSha256: Object.hasOwn(details, 'executionReceiptSha256')
        ? details.executionReceiptSha256 : current.executionReceiptSha256,
      bindingReceiptSha256: Object.hasOwn(details, 'bindingReceiptSha256')
        ? details.bindingReceiptSha256 : current.bindingReceiptSha256,
      reconciliationRequired: state !== 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION'
    };
    this.validateEnvelope(next, bindingHash, finalReleaseEvidence);
    const temporary = `${this.claimPath}.${state}.tmp`;
    await this.fs.writeFile(temporary, JSON.stringify(canonicalize(next)), { flag: 'wx' });
    await this.fs.rename(temporary, this.claimPath);
    return this.read(bindingHash, finalReleaseEvidence);
  }
}

function buildReentryReceipt(existing, bindingHash, finalReleaseCommit) {
  if (!existing?.claimEnvelopePresent || !/^[a-f0-9]{64}$/.test(bindingHash || '')) {
    throw new Error('cm2122_existing_claim_projection_required');
  }
  const envelope = existing.envelope || null;
  const effectiveState = {
    STATUS_COMMIT_INVOCATION_CONSUMED: 'CONSUMED_AMBIGUOUS_POST_COMMIT',
    DETACHED_STATUS_COMMIT_CREATED: 'CONSUMED_AMBIGUOUS_POST_COMMIT',
    EXECUTION_RECEIPT_WRITTEN: 'CONSUMED_AMBIGUOUS_POST_COMMIT',
    BINDING_RECEIPT_WRITTEN: 'CONSUMED_AMBIGUOUS_POST_COMMIT',
    CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION:
      'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION',
    CONSUMED_AMBIGUOUS_POST_COMMIT: 'CONSUMED_AMBIGUOUS_POST_COMMIT',
    CLAIM_REGISTRY_AMBIGUOUS: 'CLAIM_REGISTRY_AMBIGUOUS'
  }[existing.state] || 'CLAIM_REGISTRY_AMBIGUOUS';
  return wrapPayload({
    receiptType: 'status_sync_claim_readonly_reentry_projection',
    registryReference: REGISTRY_REFERENCE,
    claimId: claimId(),
    bindingHash,
    claimEnvelopePresent: true,
    claimEnvelopeBindingVerified: existing.claimEnvelopeBindingVerified === true,
    reentrySourceState: envelope?.state || null,
    effectiveState,
    terminalStateDurablyRecorded: envelope
      ? ['CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION', 'CONSUMED_AMBIGUOUS_POST_COMMIT'].includes(envelope.state)
      : false,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    reconciliationRequired: effectiveState !== 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION',
    detachedStatusCommitCreated: envelope?.detachedStatusCommitCreated ?? null,
    detachedHeadUpdateAcknowledged: envelope?.detachedHeadUpdateAcknowledged ?? null,
    executionReceiptCreated: envelope?.executionReceiptCreated ?? null,
    bindingReceiptCreated: envelope?.bindingReceiptCreated ?? null,
    detachedStatusCommit: envelope?.detachedStatusCommit || null,
    detachedStatusTree: envelope?.detachedStatusTree || null,
    executionReceiptSha256: envelope?.executionReceiptSha256 || null,
    bindingReceiptSha256: envelope?.bindingReceiptSha256 || null,
    targetBranchRef: FUTURE_BRANCH_REF,
    targetBranchExpectedOld: /^[a-f0-9]{40}$/.test(finalReleaseCommit || '') ? finalReleaseCommit : null,
    branchRefUpdateAuthorized: false,
    branchRefUpdated: false,
    statusSyncPerformed: false,
    currentBranchStatusSynchronized: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    nativeReads: 0,
    nativeWrites: 0,
    providerCalls: 0,
    realMemoryReads: 0,
    remoteActions: 0,
    readinessClaims: 0
  }, 'cm2122_r2_status_sync_claim_readonly_reentry_projection_v1');
}

function evaluateReentryReceipt(receipt = {}, { existing, bindingHash, finalReleaseCommit } = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.artifactType !== 'cm2122_r2_status_sync_claim_readonly_reentry_projection_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('reentryReceipt.identityOrHash');
  try {
    if (!sameJson(receipt, buildReentryReceipt(existing, bindingHash, finalReleaseCommit))) {
      blockers.push('reentryReceipt.exactContent');
    }
  } catch {
    blockers.push('reentryReceipt.exactContent');
  }
  if (receipt.payload?.authorizationConsumed !== true || receipt.payload?.authorizationReplayAllowed !== false ||
      receipt.payload?.branchRefUpdateAuthorized !== false || receipt.payload?.branchRefUpdated !== false ||
      receipt.payload?.statusSyncPerformed !== false || receipt.payload?.currentBranchStatusSynchronized !== false ||
      ['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']
        .some(field => receipt.payload?.[field] !== 0)) blockers.push('reentryReceipt.failClosedBoundary');
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function buildClaimBindingHash({ packetEvidence, finalReleaseEvidence }) {
  return sha256Canonical({
    action: ACTION,
    registryReference: REGISTRY_REFERENCE,
    nonce: NONCE,
    receiptId: RECEIPT_ID,
    contentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    contentDecisionBlobOid: CONTENT_DECISION_FREEZE.json.blobOid,
    packetCommit: packetEvidence.packetCommit,
    packetBlobOid: packetEvidence.jsonIdentity.blobOid,
    finalReleaseCommit: finalReleaseEvidence.finalReleaseCommit,
    finalReleaseBlobOid: finalReleaseEvidence.jsonIdentity.blobOid,
    finalReleaseTree: finalReleaseEvidence.finalReleaseTree,
    patchPayloadSha256: CONTENT_DECISION_FREEZE.patchPayloadSha256,
    targetBranchRef: FUTURE_BRANCH_REF
  });
}

function gitText(args, { cwd = process.cwd(), input = undefined } = {}) {
  return execFileSync('git', args, {
    cwd,
    input,
    env: sanitizedGitEnvironment(),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  }).trim();
}

function resolveFixedGovernanceRoot(repoRoot = process.cwd()) {
  const commonDir = path.resolve(repoRoot, gitText(['rev-parse', '--git-common-dir'], { cwd: repoRoot }));
  return path.join(commonDir, 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function realResolverOptions() {
  return require('../../scripts/generate-cm2116-exact-full-plan-application-gate').resolverOptions();
}

function verifyTargetsAtCommit(commit, targets, options, blockers, label) {
  for (const target of targets) {
    try {
      const actual = options.resolveGitFile(commit, target.sourcePath);
      if (actual.gitMode !== target.before.gitMode || actual.blobOid !== target.before.blobOid ||
          actual.bytes !== target.before.bytes || actual.sha256 !== target.before.sha256) blockers.push(`${label}.${target.sourcePath}`);
    } catch {
      blockers.push(`${label}.${target.sourcePath}`);
    }
  }
}

function targetBranchOid(repoRoot) {
  return gitText(['show-ref', '--hash', '--verify', FUTURE_BRANCH_REF], { cwd: repoRoot });
}

function detachedHeadRequired(repoRoot) {
  try {
    gitText(['symbolic-ref', '-q', 'HEAD'], { cwd: repoRoot });
  } catch (error) {
    if (error.status === 1) return true;
    throw error;
  }
  throw new Error('cm2122_detached_checkout_required');
}

function listTreeEntries(treeish, repoRoot) {
  const raw = execFileSync('git', ['ls-tree', '-z', treeish], {
    cwd: repoRoot,
    env: sanitizedGitEnvironment(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return raw.split('\0').filter(Boolean).map(line => {
    const match = line.match(/^(\d{6}) (\w+) ([a-f0-9]{40})\t(.+)$/);
    if (!match) throw new Error('cm2122_tree_entry_invalid');
    return { mode: match[1], type: match[2], oid: match[3], name: match[4] };
  });
}

function writeTreeEntries(entries, repoRoot) {
  const input = [...entries].sort((left, right) => left.name.localeCompare(right.name))
    .map(item => `${item.mode} ${item.type} ${item.oid}\t${item.name}\0`).join('');
  return gitText(['mktree', '-z'], { cwd: repoRoot, input });
}

function assertExecutionRuntime({ finalReleaseEvidence, packetEvidence }) {
  const repoRoot = path.resolve(gitText(['rev-parse', '--show-toplevel']));
  if (repoRoot !== path.resolve(process.cwd())) throw new Error('cm2122_repository_root_required');
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2122_clean_worktree_required');
  detachedHeadRequired(repoRoot);
  const head = gitText(['rev-parse', 'HEAD^{commit}']);
  const tree = gitText(['rev-parse', 'HEAD^{tree}']);
  if (head !== finalReleaseEvidence.finalReleaseCommit || tree !== finalReleaseEvidence.finalReleaseTree) {
    throw new Error('cm2122_final_release_runtime_required');
  }
  if (targetBranchOid(repoRoot) !== finalReleaseEvidence.finalReleaseCommit) {
    throw new Error('cm2122_target_branch_tip_mismatch');
  }
  gitText(['var', 'GIT_AUTHOR_IDENT'], { cwd: repoRoot });
  gitText(['var', 'GIT_COMMITTER_IDENT'], { cwd: repoRoot });
  for (const artifact of packetEvidence.packet.payload.implementation.artifacts) {
    const current = realResolverOptions().resolveGitFile(head, artifact.path);
    if (current.blobOid !== artifact.blobOid) throw new Error(`cm2122_runtime_artifact_drift:${artifact.path}`);
  }
  return repoRoot;
}

function createExactDetachedStatusCommit({ repoRoot, finalReleaseEvidence, packetEvidence }) {
  const targets = packetEvidence.packet.payload.detachedCommitBoundary.targets;
  const partial = {
    commit: null,
    tree: null,
    parentCommit: finalReleaseEvidence.finalReleaseCommit,
    parentTree: finalReleaseEvidence.finalReleaseTree,
    targetBranchRef: FUTURE_BRANCH_REF,
    targetBranchExpectedOld: finalReleaseEvidence.finalReleaseCommit,
    targetBranchObservedBeforeCommit: null,
    targetBranchObservedAfterCommit: null,
    detachedHeadCasUsed: null,
    commitObjectCreated: false,
    detachedHeadUpdateAcknowledged: false
  };
  try {
    partial.targetBranchObservedBeforeCommit = targetBranchOid(repoRoot);
    if (partial.targetBranchObservedBeforeCommit !== finalReleaseEvidence.finalReleaseCommit) {
      throw new Error('cm2122_target_branch_precommit_drift');
    }
    const afterByPath = new Map();
    for (const target of targets) {
      const fullPath = path.join(repoRoot, target.sourcePath);
      const before = fs.readFileSync(fullPath);
      if (before.length !== target.before.bytes || sha256(before) !== target.before.sha256 ||
          gitBlobOid(before) !== target.before.blobOid) {
        throw new Error(`cm2122_runtime_before_drift:${target.sourcePath}`);
      }
      const after = projectStatusFile(target.sourcePath, before);
      if (after.length !== target.after.bytes || sha256(after) !== target.after.sha256 ||
          gitBlobOid(after) !== target.after.blobOid) {
        throw new Error(`cm2122_runtime_after_projection_drift:${target.sourcePath}`);
      }
      const observedBlob = gitText(['hash-object', '-w', '--stdin'], { cwd: repoRoot, input: after });
      if (observedBlob !== target.after.blobOid) throw new Error(`cm2122_after_blob_write_mismatch:${target.sourcePath}`);
      afterByPath.set(target.sourcePath, after);
    }

    const agentEntries = listTreeEntries(`${finalReleaseEvidence.finalReleaseCommit}:.agent_board`, repoRoot);
    for (const entry of agentEntries) {
      const target = targets.find(item => item.sourcePath === `.agent_board/${entry.name}`);
      if (target) Object.assign(entry, { mode: target.after.gitMode, type: 'blob', oid: target.after.blobOid });
    }
    const agentTree = writeTreeEntries(agentEntries, repoRoot);
    const rootEntries = listTreeEntries(finalReleaseEvidence.finalReleaseTree, repoRoot);
    for (const entry of rootEntries) {
      if (entry.name === '.agent_board') Object.assign(entry, { mode: '040000', type: 'tree', oid: agentTree });
      const target = targets.find(item => item.sourcePath === entry.name);
      if (target) Object.assign(entry, { mode: target.after.gitMode, type: 'blob', oid: target.after.blobOid });
    }
    partial.tree = writeTreeEntries(rootEntries, repoRoot);
    partial.commit = gitText(['commit-tree', partial.tree, '-p', finalReleaseEvidence.finalReleaseCommit], {
      cwd: repoRoot,
      input: 'docs: apply CM-2122 detached full-plan status sync\n'
    });
    partial.commitObjectCreated = true;
    const preCasBinding = verifyDetachedCommitBinding({
      detachedCommit: partial.commit,
      packetEvidence,
      finalReleaseEvidence,
      ...realResolverOptions()
    });
    if (!preCasBinding.accepted) {
      throw new Error(`cm2122_pre_cas_commit_binding_failed:${preCasBinding.blockers.join(',')}`);
    }
    detachedHeadRequired(repoRoot);
    if (gitText(['rev-parse', 'HEAD^{commit}'], { cwd: repoRoot }) !== finalReleaseEvidence.finalReleaseCommit) {
      throw new Error('cm2122_detached_head_pre_cas_drift');
    }
    gitText(['update-ref', '--no-deref', 'HEAD', partial.commit, finalReleaseEvidence.finalReleaseCommit], { cwd: repoRoot });
    partial.detachedHeadCasUsed = true;
    partial.detachedHeadUpdateAcknowledged = true;
    gitText(['read-tree', partial.tree], { cwd: repoRoot });
    for (const target of targets) fs.writeFileSync(path.join(repoRoot, target.sourcePath), afterByPath.get(target.sourcePath));
    partial.targetBranchObservedAfterCommit = targetBranchOid(repoRoot);
    if (gitText(['rev-parse', 'HEAD^{commit}'], { cwd: repoRoot }) !== partial.commit ||
        gitText(['rev-parse', 'HEAD^{tree}'], { cwd: repoRoot }) !== partial.tree ||
        gitText(['write-tree'], { cwd: repoRoot }) !== partial.tree ||
        gitText(['rev-parse', 'HEAD^'], { cwd: repoRoot }) !== finalReleaseEvidence.finalReleaseCommit ||
        partial.targetBranchObservedAfterCommit !== finalReleaseEvidence.finalReleaseCommit ||
        gitText(['status', '--porcelain'], { cwd: repoRoot }) !== '') {
      throw new Error('cm2122_detached_commit_postcondition_failed');
    }
    return partial;
  } catch (error) {
    error.cm2122PartialDetachedIdentity = { ...partial };
    throw error;
  }
}

function verifyDetachedCommitBinding({ detachedCommit, packetEvidence, finalReleaseEvidence, ...options }) {
  const blockers = [];
  const targets = packetEvidence.packet.payload.detachedCommitBoundary.targets;
  let tree = null;
  try {
    tree = options.resolveCommitTree(detachedCommit);
    const parent = options.resolveParentCommit(detachedCommit);
    const paths = options.resolveDiffPaths(parent, detachedCommit).sort();
    const entries = options.resolveDiffEntries(parent, detachedCommit).sort((left, right) => left.path.localeCompare(right.path));
    if (parent !== finalReleaseEvidence.finalReleaseCommit ||
        options.resolveCommitTree(parent) !== finalReleaseEvidence.finalReleaseTree ||
        !sameJson(paths, [...packetEvidence.packet.payload.detachedCommitBoundary.exactPaths].sort()) ||
        !sameJson(entries, [...packetEvidence.packet.payload.detachedCommitBoundary.exactEntries]
          .sort((left, right) => left.path.localeCompare(right.path)))) {
      blockers.push('detachedBinding.lineageOrDiff');
    }
    verifyTargetsAtCommit(parent, targets, options, blockers, 'detachedBinding.before');
    for (const target of targets) {
      const actual = options.resolveGitFile(detachedCommit, target.sourcePath);
      if (actual.gitMode !== target.after.gitMode || actual.blobOid !== target.after.blobOid ||
          actual.bytes !== target.after.bytes || actual.sha256 !== target.after.sha256) {
        blockers.push(`detachedBinding.after.${target.sourcePath}`);
      }
    }
  } catch {
    blockers.push('detachedBinding.unreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    detachedStatusCommit: detachedCommit,
    detachedStatusTree: tree,
    parentCommit: finalReleaseEvidence.finalReleaseCommit,
    parentTree: finalReleaseEvidence.finalReleaseTree,
    targetBranchRef: FUTURE_BRANCH_REF,
    targetBranchExpectedOld: finalReleaseEvidence.finalReleaseCommit,
    targetBranchObservedBeforeCommit: targetBranchOid(process.cwd()),
    targetBranchObservedAfterCommit: targetBranchOid(process.cwd()),
    detachedHeadCasUsed: true,
    candidateFullPlanPackCompleted: blockers.length === 0,
    currentBranchStatusSynchronized: false,
    branchRefUpdateAuthorized: false,
    readinessClaimed: false
  };
}

function buildExecutionReceipt({ packetEvidence, finalReleaseEvidence, bindingHash, detachedBinding, claimedAt }) {
  const payload = {
    receiptType: 'detached_full_plan_status_sync_execution_receipt',
    contentDecision: packetEvidence.packet.payload.contentDecision,
    executionPacket: {
      reference: packetEvidence.packet.payload.packetReference,
      commit: packetEvidence.packetCommit,
      tree: packetEvidence.packetTree,
      blobOid: packetEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: packetEvidence.packet.canonicalPayloadSha256
    },
    finalRelease: {
      reference: finalReleaseEvidence.decision.payload.decisionReference,
      commit: finalReleaseEvidence.finalReleaseCommit,
      tree: finalReleaseEvidence.finalReleaseTree,
      blobOid: finalReleaseEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: finalReleaseEvidence.decision.canonicalPayloadSha256
    },
    registry: {
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      bindingHash,
      claimedAt,
      finalReleaseApprovedAt: finalReleaseEvidence.decision.payload.authorization.approvedAt,
      finalReleaseExpiresAt: finalReleaseEvidence.decision.payload.authorization.expiresAt,
      stateAtReceipt: 'DETACHED_STATUS_COMMIT_CREATED',
      finalStateRequired: 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      detachedCommitInvocationCount: 1
    },
    detachedCommit: {
      commit: detachedBinding.detachedStatusCommit,
      tree: detachedBinding.detachedStatusTree,
      parentCommit: detachedBinding.parentCommit,
      parentTree: detachedBinding.parentTree,
      targetBranchRef: detachedBinding.targetBranchRef,
      targetBranchExpectedOld: detachedBinding.targetBranchExpectedOld,
      targetBranchObservedBeforeCommit: detachedBinding.targetBranchObservedBeforeCommit,
      targetBranchObservedAfterCommit: detachedBinding.targetBranchObservedAfterCommit,
      detachedHeadCasUsed: detachedBinding.detachedHeadCasUsed,
      exactPaths: packetEvidence.packet.payload.detachedCommitBoundary.exactPaths,
      exactEntries: packetEvidence.packet.payload.detachedCommitBoundary.exactEntries,
      targets: packetEvidence.packet.payload.detachedCommitBoundary.targets,
      patchPayloadSha256: packetEvidence.packet.payload.detachedCommitBoundary.patchPayloadSha256,
      detachedWorktreeHeadAdvanced: true,
      branchRefUpdated: false,
      bindingRequired: true,
      boundByThisReceipt: false
    },
    candidateState: {
      fullPlanPackCompleted: true,
      statusSyncContentAppliedInDetachedCommit: true,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      readiness: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
    },
    sideEffects: {
      repositoryPatches: 1,
      detachedStatusCommits: 1,
      detachedHeadUpdates: 1,
      branchRefUpdates: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return wrapPayload(payload, 'cm2122_r2_detached_status_sync_execution_receipt_v1');
}

function evaluateExecutionReceipt(receipt = {}, { packetEvidence, finalReleaseEvidence } = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.artifactType !== 'cm2122_r2_detached_status_sync_execution_receipt_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('executionReceipt.identityOrHash');
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet) ||
      !finalReleaseEvidence?.accepted || !isMachineBoundFinalReleaseDecision(finalReleaseEvidence.decision)) {
    blockers.push('executionReceipt.machineBoundEvidenceRequired');
  } else {
    const detached = receipt.payload?.detachedCommit || {};
    const expected = buildExecutionReceipt({
      packetEvidence,
      finalReleaseEvidence,
      bindingHash: buildClaimBindingHash({ packetEvidence, finalReleaseEvidence }),
      detachedBinding: {
        detachedStatusCommit: detached.commit,
        detachedStatusTree: detached.tree,
        parentCommit: detached.parentCommit,
        parentTree: detached.parentTree,
        targetBranchRef: detached.targetBranchRef,
        targetBranchExpectedOld: detached.targetBranchExpectedOld,
        targetBranchObservedBeforeCommit: detached.targetBranchObservedBeforeCommit,
        targetBranchObservedAfterCommit: detached.targetBranchObservedAfterCommit,
        detachedHeadCasUsed: detached.detachedHeadCasUsed
      },
      claimedAt: receipt.payload?.registry?.claimedAt
    });
    if (!sameJson(receipt, expected)) blockers.push('executionReceipt.exactContent');
  }
  if (receipt.payload?.detachedCommit?.branchRefUpdated !== false ||
      receipt.payload?.detachedCommit?.targetBranchRef !== FUTURE_BRANCH_REF ||
      receipt.payload?.detachedCommit?.targetBranchExpectedOld !== finalReleaseEvidence?.finalReleaseCommit ||
      receipt.payload?.detachedCommit?.targetBranchObservedBeforeCommit !== finalReleaseEvidence?.finalReleaseCommit ||
      receipt.payload?.detachedCommit?.targetBranchObservedAfterCommit !== finalReleaseEvidence?.finalReleaseCommit ||
      receipt.payload?.detachedCommit?.detachedHeadCasUsed !== true ||
      receipt.payload?.candidateState?.statusSyncPerformed !== false ||
      receipt.payload?.candidateState?.currentBranchStatusSynchronized !== false ||
      Object.values(receipt.payload?.candidateState?.readiness || {}).some(value => value !== false) ||
      ['branchRefUpdates', 'nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']
        .some(field => receipt.payload?.sideEffects?.[field] !== 0)) blockers.push('executionReceipt.nonClaimBoundary');
  const claimedAt = Date.parse(receipt.payload?.registry?.claimedAt || '');
  const approvedAt = Date.parse(receipt.payload?.registry?.finalReleaseApprovedAt || '');
  const expiresAt = Date.parse(receipt.payload?.registry?.finalReleaseExpiresAt || '');
  if (!Number.isFinite(claimedAt) || !Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) ||
      claimedAt < approvedAt || claimedAt >= expiresAt) blockers.push('executionReceipt.authorizationWindow');
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function buildBindingReceipt({ detachedBinding, executionReceipt, claimEnvelope, packetEvidence, finalReleaseEvidence }) {
  const executionDetached = executionReceipt?.payload?.detachedCommit || {};
  if (!detachedBinding?.accepted || claimEnvelope?.state !== 'EXECUTION_RECEIPT_WRITTEN' ||
      claimEnvelope.bindingHash !== executionReceipt?.payload?.registry?.bindingHash ||
      claimEnvelope.executionReceiptSha256 !== sha256(serializeArtifact(executionReceipt)) ||
      claimEnvelope.detachedStatusCommit !== detachedBinding.detachedStatusCommit ||
      claimEnvelope.detachedStatusTree !== detachedBinding.detachedStatusTree ||
      claimEnvelope.detachedHeadUpdateAcknowledged !== true ||
      executionDetached.commit !== detachedBinding.detachedStatusCommit ||
      executionDetached.tree !== detachedBinding.detachedStatusTree ||
      executionDetached.parentCommit !== detachedBinding.parentCommit ||
      executionDetached.parentTree !== detachedBinding.parentTree ||
      executionDetached.targetBranchRef !== detachedBinding.targetBranchRef ||
      executionDetached.targetBranchExpectedOld !== detachedBinding.targetBranchExpectedOld ||
      executionDetached.targetBranchObservedBeforeCommit !== detachedBinding.targetBranchObservedBeforeCommit ||
      executionDetached.targetBranchObservedAfterCommit !== detachedBinding.targetBranchObservedAfterCommit ||
      executionDetached.detachedHeadCasUsed !== true) {
    throw new Error('cm2122_exact_detached_binding_inputs_required');
  }
  const payload = {
    receiptType: 'detached_full_plan_status_sync_commit_binding_receipt',
    detachedCommit: {
      commit: detachedBinding.detachedStatusCommit,
      tree: detachedBinding.detachedStatusTree,
      parentCommit: detachedBinding.parentCommit,
      parentTree: detachedBinding.parentTree,
      targetBranchRef: detachedBinding.targetBranchRef,
      targetBranchExpectedOld: detachedBinding.targetBranchExpectedOld,
      targetBranchObservedBeforeCommit: detachedBinding.targetBranchObservedBeforeCommit,
      targetBranchObservedAfterCommit: detachedBinding.targetBranchObservedAfterCommit,
      detachedHeadCasUsed: detachedBinding.detachedHeadCasUsed,
      exactPaths: packetEvidence.packet.payload.detachedCommitBoundary.exactPaths,
      exactEntries: packetEvidence.packet.payload.detachedCommitBoundary.exactEntries,
      targets: packetEvidence.packet.payload.detachedCommitBoundary.targets,
      patchPayloadSha256: packetEvidence.packet.payload.detachedCommitBoundary.patchPayloadSha256
    },
    contentDecision: packetEvidence.packet.payload.contentDecision,
    executionPacket: {
      commit: packetEvidence.packetCommit,
      blobOid: packetEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: packetEvidence.packet.canonicalPayloadSha256
    },
    finalRelease: {
      commit: finalReleaseEvidence.finalReleaseCommit,
      blobOid: finalReleaseEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: finalReleaseEvidence.decision.canonicalPayloadSha256
    },
    executionReceipt: {
      rawSha256: sha256(serializeArtifact(executionReceipt)),
      canonicalPayloadSha256: executionReceipt.canonicalPayloadSha256
    },
    registry: {
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      bindingHash: claimEnvelope.bindingHash,
      claimedAt: claimEnvelope.claimedAt,
      stateAtBindingReceipt: claimEnvelope.state,
      finalStateRequired: 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      detachedCommitInvocationCount: 1
    },
    boundCandidateState: {
      fullPlanPackCompleted: true,
      statusSyncContentAppliedInDetachedCommit: true,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      branchRefUpdateDecisionRequired: true,
      readiness: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
    },
    sideEffects: executionReceipt.payload.sideEffects
  };
  return wrapPayload(payload, 'cm2122_r2_detached_status_sync_binding_receipt_v1');
}

function evaluateBindingReceipt(receipt = {}, { detachedBinding, executionReceipt, claimEnvelope,
  packetEvidence, finalReleaseEvidence } = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.artifactType !== 'cm2122_r2_detached_status_sync_binding_receipt_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('bindingReceipt.identityOrHash');
  try {
    const expected = buildBindingReceipt({ detachedBinding, executionReceipt, claimEnvelope, packetEvidence, finalReleaseEvidence });
    if (!sameJson(receipt, expected)) blockers.push('bindingReceipt.exactContent');
  } catch {
    blockers.push('bindingReceipt.exactContent');
  }
  if (receipt.payload?.boundCandidateState?.statusSyncPerformed !== false ||
      receipt.payload?.boundCandidateState?.currentBranchStatusSynchronized !== false ||
      receipt.payload?.boundCandidateState?.branchRefUpdateDecisionRequired !== true ||
      Object.values(receipt.payload?.boundCandidateState?.readiness || {}).some(value => value !== false) ||
      receipt.payload?.detachedCommit?.targetBranchRef !== FUTURE_BRANCH_REF ||
      receipt.payload?.detachedCommit?.targetBranchExpectedOld !== finalReleaseEvidence?.finalReleaseCommit ||
      receipt.payload?.detachedCommit?.targetBranchObservedBeforeCommit !== finalReleaseEvidence?.finalReleaseCommit ||
      receipt.payload?.detachedCommit?.targetBranchObservedAfterCommit !== finalReleaseEvidence?.finalReleaseCommit ||
      receipt.payload?.detachedCommit?.detachedHeadCasUsed !== true ||
      receipt.payload?.sideEffects?.branchRefUpdates !== 0) blockers.push('bindingReceipt.stateBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    detachedCommitBound: blockers.length === 0,
    branchRefUpdateAuthorized: false,
    statusSyncPerformed: false,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false
  };
}

async function writeExternalReceipt(registry, filename, receipt) {
  const rootIdentity = await registry.verifyRoot();
  const bytes = Buffer.from(serializeArtifact(receipt));
  const identity = { bytes: bytes.length, sha256: sha256(bytes), persistenceAcknowledged: false };
  let rootHandle = null;
  let receiptHandle = null;
  try {
    if (process.platform !== 'linux' || !Number.isInteger(fs.constants.O_DIRECTORY) ||
        !Number.isInteger(fs.constants.O_NOFOLLOW)) {
      throw new Error('cm2122_descriptor_relative_receipt_write_unsupported');
    }
    rootHandle = await fsPromises.open(
      registry.governanceRoot,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
    );
    const descriptorStat = await rootHandle.stat();
    if (!descriptorStat.isDirectory() || descriptorStat.dev !== rootIdentity.dev || descriptorStat.ino !== rootIdentity.ino) {
      throw new Error('cm2122_governance_root_descriptor_identity_mismatch');
    }
    const descriptorReceiptPath = `/proc/self/fd/${rootHandle.fd}/${filename}`;
    receiptHandle = await fsPromises.open(
      descriptorReceiptPath,
      fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
      0o600
    );
    await receiptHandle.writeFile(bytes);
    await receiptHandle.sync();
    const observed = Buffer.alloc(bytes.length);
    const readback = await receiptHandle.read(observed, 0, bytes.length, 0);
    if (readback.bytesRead !== bytes.length || !observed.equals(bytes)) {
      throw new Error(`cm2122_receipt_readback_mismatch:${filename}`);
    }
    await rootHandle.sync();
    identity.persistenceAcknowledged = true;
    return identity;
  } catch (error) {
    error.cm2122PartialReceiptIdentity = { ...identity };
    throw error;
  } finally {
    if (receiptHandle) await receiptHandle.close().catch(() => {});
    if (rootHandle) await rootHandle.close().catch(() => {});
  }
}

async function readExternalReceipt(root, filename) {
  const receiptPath = path.join(root, filename);
  const stat = await fsPromises.lstat(receiptPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`cm2122_receipt_invalid:${filename}`);
  const bytes = await fsPromises.readFile(receiptPath);
  return { receipt: JSON.parse(bytes.toString('utf8')), bytes, sha256: sha256(bytes) };
}

async function evaluateDurableDetachedBinding({ contentDecisionCommit, packetCommit, finalReleaseCommit }) {
  assertSafeGitEnvironment();
  const blockers = [];
  if (contentDecisionCommit !== CONTENT_DECISION_FREEZE.commit) {
    return { accepted: false, blockers: ['durableBinding.exactContentDecisionRequired'] };
  }
  const options = realResolverOptions();
  const packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
  const root = resolveFixedGovernanceRoot();
  const registry = new Cm2122StatusSyncClaimRegistry({ governanceRoot: root });
  let claim;
  let frozenRelease;
  try {
    frozenRelease = JSON.parse(options.resolveGitFile(finalReleaseCommit, FINAL_RELEASE_PATH).content.toString('utf8'));
  } catch {
    return { accepted: false, blockers: ['durableBinding.finalReleaseUnreadable'] };
  }
  const staticReviewTime = new Date(Date.parse(frozenRelease?.payload?.authorization?.approvedAt || '') + 1);
  const finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now: staticReviewTime,
    ...options
  });
  if (!packetEvidence.accepted || !finalReleaseEvidence.accepted) {
    return { accepted: false, blockers: ['durableBinding.upstreamRevalidation'] };
  }
  const bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  try {
    claim = await registry.read(bindingHash, finalReleaseEvidence);
    if (claim.state !== 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION' ||
        claim.branchRefUpdateCount !== 0) blockers.push('durableBinding.claimState');
    const execution = await readExternalReceipt(root, EXECUTION_RECEIPT_FILENAME);
    const binding = await readExternalReceipt(root, BINDING_RECEIPT_FILENAME);
    if (execution.sha256 !== claim.executionReceiptSha256 || binding.sha256 !== claim.bindingReceiptSha256) {
      blockers.push('durableBinding.receiptHash');
    }
    const executionEvaluation = evaluateExecutionReceipt(execution.receipt, { packetEvidence, finalReleaseEvidence });
    if (!executionEvaluation.accepted) blockers.push(...executionEvaluation.blockers.map(item => `durableBinding.${item}`));
    const detachedBinding = verifyDetachedCommitBinding({
      detachedCommit: claim.detachedStatusCommit,
      packetEvidence,
      finalReleaseEvidence,
      ...options
    });
    if (!detachedBinding.accepted) blockers.push(...detachedBinding.blockers.map(item => `durableBinding.${item}`));
    const preBindingClaim = { ...claim, state: 'EXECUTION_RECEIPT_WRITTEN', bindingReceiptCreated: false,
      bindingReceiptSha256: null, reconciliationRequired: true };
    const bindingEvaluation = evaluateBindingReceipt(binding.receipt, {
      detachedBinding,
      executionReceipt: execution.receipt,
      claimEnvelope: preBindingClaim,
      packetEvidence,
      finalReleaseEvidence
    });
    if (!bindingEvaluation.accepted) blockers.push(...bindingEvaluation.blockers.map(item => `durableBinding.${item}`));
    if (targetBranchOid(process.cwd()) !== finalReleaseCommit) blockers.push('durableBinding.branchRefDrift');
  } catch {
    blockers.push('durableBinding.evidenceUnreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    detachedStatusCommit: blockers.length === 0 ? claim.detachedStatusCommit : null,
    detachedStatusTree: blockers.length === 0 ? claim.detachedStatusTree : null,
    detachedCommitBound: blockers.length === 0,
    branchRefUpdateAuthorized: false,
    statusSyncPerformed: false,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false
  };
}

async function executeStatusSyncFromCommits({ contentDecisionCommit, packetCommit, finalReleaseCommit }) {
  assertSafeGitEnvironment();
  if (contentDecisionCommit !== CONTENT_DECISION_FREEZE.commit || !/^[a-f0-9]{40}$/.test(packetCommit || '') ||
      !/^[a-f0-9]{40}$/.test(finalReleaseCommit || '')) throw new Error('cm2122_exact_three_commit_inputs_required');
  const options = realResolverOptions();
  let packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
  if (!packetEvidence.accepted) throw new Error(`cm2122_packet_rejected:${packetEvidence.blockers.join(',')}`);
  let finalReleaseEvidence = intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now: new Date(), ...options });
  if (!finalReleaseEvidence.accepted) throw new Error(`cm2122_final_release_rejected:${finalReleaseEvidence.blockers.join(',')}`);
  const repoRoot = assertExecutionRuntime({ finalReleaseEvidence, packetEvidence });

  packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
  finalReleaseEvidence = intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now: new Date(), ...options });
  const contentEvidence = intakeContentDecision(options);
  if (!packetEvidence.accepted || !finalReleaseEvidence.accepted || !contentEvidence.accepted) {
    throw new Error('cm2122_preclaim_upstream_revalidation_failed');
  }
  const targetBlockers = [];
  verifyTargetsAtCommit(finalReleaseCommit, packetEvidence.packet.payload.detachedCommitBoundary.targets,
    options, targetBlockers, 'execution.before');
  if (targetBlockers.length) throw new Error(`cm2122_preclaim_target_drift:${targetBlockers.join(',')}`);

  const root = resolveFixedGovernanceRoot(repoRoot);
  const registry = new Cm2122StatusSyncClaimRegistry({ governanceRoot: root });
  let bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  const existing = await registry.inspectExisting(bindingHash, finalReleaseEvidence);
  if (existing.claimEnvelopePresent) {
    const reconciliationReceipt = buildReentryReceipt(existing, bindingHash, finalReleaseCommit);
    const reconciliationEvaluation = evaluateReentryReceipt(reconciliationReceipt, {
      existing,
      bindingHash,
      finalReleaseCommit
    });
    if (!reconciliationEvaluation.accepted) throw new Error('cm2122_reentry_receipt_rejected');
    return { accepted: false, state: existing.state, authorizationConsumed: true, authorizationReplayAllowed: false,
      detachedStatusCommitCreated: existing.envelope?.detachedStatusCommitCreated ?? null,
      reconciliationReceipt,
      branchRefUpdateAuthorized: false, statusSyncPerformed: false, currentBranchStatusSynchronized: false,
      readinessClaimed: false };
  }
  for (const filename of [EXECUTION_RECEIPT_FILENAME, BINDING_RECEIPT_FILENAME]) {
    if (fs.existsSync(path.join(root, filename))) throw new Error(`cm2122_preclaim_artifact_exists:${filename}`);
  }

  let state = 'UNCLAIMED';
  let detachedIdentity = null;
  let executionIdentity = null;
  let bindingIdentity = null;
  try {
    const claimTime = new Date();
    packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
    finalReleaseEvidence = intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now: claimTime, ...options });
    if (!packetEvidence.accepted || !finalReleaseEvidence.accepted || !intakeContentDecision(options).accepted) {
      throw new Error('cm2122_immediate_preclaim_revalidation_failed');
    }
    const immediateHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
    if (immediateHash !== bindingHash) throw new Error('cm2122_preclaim_binding_drift');
    bindingHash = immediateHash;
    let claim = await registry.claim(bindingHash, finalReleaseEvidence, claimTime);
    state = claim.state;
    let detached;
    try {
      detached = createExactDetachedStatusCommit({ repoRoot, finalReleaseEvidence, packetEvidence });
      detachedIdentity = detached;
    } catch (error) {
      detachedIdentity = error.cm2122PartialDetachedIdentity || null;
      throw error;
    }
    claim = await registry.transition(bindingHash, state, 'DETACHED_STATUS_COMMIT_CREATED', {
      detachedStatusCommitCreated: true,
      detachedHeadUpdateAcknowledged: true,
      detachedStatusCommit: detached.commit,
      detachedStatusTree: detached.tree
    }, finalReleaseEvidence);
    state = claim.state;
    const detachedBinding = verifyDetachedCommitBinding({
      detachedCommit: detached.commit,
      packetEvidence,
      finalReleaseEvidence,
      ...options
    });
    if (!detachedBinding.accepted) throw new Error(`cm2122_detached_commit_rejected:${detachedBinding.blockers.join(',')}`);
    const executionReceipt = buildExecutionReceipt({
      packetEvidence,
      finalReleaseEvidence,
      bindingHash,
      detachedBinding,
      claimedAt: claim.claimedAt
    });
    const executionEvaluation = evaluateExecutionReceipt(executionReceipt, { packetEvidence, finalReleaseEvidence });
    if (!executionEvaluation.accepted) throw new Error(`cm2122_execution_receipt_rejected:${executionEvaluation.blockers.join(',')}`);
    try {
      executionIdentity = await writeExternalReceipt(registry, EXECUTION_RECEIPT_FILENAME, executionReceipt);
    } catch (error) {
      executionIdentity = error.cm2122PartialReceiptIdentity || null;
      throw error;
    }
    claim = await registry.transition(bindingHash, state, 'EXECUTION_RECEIPT_WRITTEN', {
      executionReceiptCreated: true,
      executionReceiptSha256: executionIdentity.sha256
    }, finalReleaseEvidence);
    state = claim.state;
    const bindingReceipt = buildBindingReceipt({
      detachedBinding,
      executionReceipt,
      claimEnvelope: claim,
      packetEvidence,
      finalReleaseEvidence
    });
    const bindingEvaluation = evaluateBindingReceipt(bindingReceipt, {
      detachedBinding,
      executionReceipt,
      claimEnvelope: claim,
      packetEvidence,
      finalReleaseEvidence
    });
    if (!bindingEvaluation.accepted) throw new Error(`cm2122_binding_receipt_rejected:${bindingEvaluation.blockers.join(',')}`);
    try {
      bindingIdentity = await writeExternalReceipt(registry, BINDING_RECEIPT_FILENAME, bindingReceipt);
    } catch (error) {
      bindingIdentity = error.cm2122PartialReceiptIdentity || null;
      throw error;
    }
    claim = await registry.transition(bindingHash, state, 'BINDING_RECEIPT_WRITTEN', {
      bindingReceiptCreated: true,
      bindingReceiptSha256: bindingIdentity.sha256
    }, finalReleaseEvidence);
    state = claim.state;
    claim = await registry.transition(bindingHash, state,
      'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION', {}, finalReleaseEvidence);
    return {
      accepted: true,
      state: claim.state,
      detachedStatusCommit: claim.detachedStatusCommit,
      detachedStatusTree: claim.detachedStatusTree,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      branchRefUpdateAuthorized: false,
      branchRefUpdated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      fullPlanPackCompletedInDetachedCommit: true,
      readinessClaimed: false
    };
  } catch (error) {
    if (state !== 'UNCLAIMED' && state !== 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION') {
      await registry.transition(bindingHash, state, 'CONSUMED_AMBIGUOUS_POST_COMMIT', {
        detachedStatusCommitCreated: detachedIdentity?.commitObjectCreated === true ? true : null,
        detachedHeadUpdateAcknowledged: detachedIdentity?.detachedHeadUpdateAcknowledged === true ? true : null,
        detachedStatusCommit: detachedIdentity?.commit || null,
        detachedStatusTree: detachedIdentity?.tree || null,
        executionReceiptCreated: executionIdentity?.persistenceAcknowledged === true ? true : null,
        executionReceiptSha256: executionIdentity?.sha256 || null,
        bindingReceiptCreated: bindingIdentity?.persistenceAcknowledged === true ? true : null,
        bindingReceiptSha256: bindingIdentity?.sha256 || null
      }, finalReleaseEvidence).catch(() => {});
    }
    throw error;
  }
}

module.exports = {
  ACTION,
  BINDING_RECEIPT_FILENAME,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  FINAL_RELEASE_DIFF_ENTRIES,
  FINAL_RELEASE_DIFF_PATHS,
  FINAL_RELEASE_MARKDOWN_PATH,
  FINAL_RELEASE_PATH,
  FINAL_RELEASE_TASK_ID,
  FUTURE_BRANCH_REF,
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  NONCE,
  PACKET_DIFF_ENTRIES,
  PACKET_DIFF_PATHS,
  PACKET_MARKDOWN_PATH,
  PACKET_PATH,
  RECEIPT_ID,
  REGISTRY_REFERENCE,
  SUPERSEDED_FREEZE,
  TASK_ID,
  Cm2122StatusSyncClaimRegistry,
  buildBindingReceipt,
  buildClaimBindingHash,
  buildExecutionPacket,
  buildExecutionReceipt,
  buildFinalReleaseDecision,
  buildReentryReceipt,
  assertSafeGitEnvironment,
  claimFileName,
  claimId,
  evaluateDurableDetachedBinding,
  evaluateBindingReceipt,
  evaluateExecutionPacket,
  evaluateExecutionReceipt,
  evaluateFinalReleaseDecision,
  evaluateReentryReceipt,
  executeStatusSyncFromCommits,
  expectedImplementationEntries,
  identityWithoutContent,
  intakeContentDecision,
  intakeExecutionPacket,
  intakeFinalReleaseDecision,
  isMachineBoundContentDecision,
  isMachineBoundExecutionPacket,
  isMachineBoundFinalReleaseDecision,
  resolveFixedGovernanceRoot,
  sanitizedGitEnvironment,
  unsafeGitEnvironmentKeys,
  verifyDetachedCommitBinding,
  wrapPayload
};
