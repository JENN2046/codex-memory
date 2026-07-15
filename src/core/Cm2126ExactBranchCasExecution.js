'use strict';

const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  ACTION,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  EXPECTED_OLD,
  EXPECTED_OLD_TREE,
  FINAL_RELEASE_APPROVED_AT,
  FINAL_RELEASE_DIFF_ENTRIES,
  FINAL_RELEASE_DIFF_PATHS,
  FINAL_RELEASE_EXPIRES_AT,
  FINAL_RELEASE_MARKDOWN_PATH,
  FINAL_RELEASE_PATH,
  FINAL_RELEASE_TASK_ID,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  NEW_COMMIT,
  NEW_TREE,
  NONCE,
  PACKET_DIFF_ENTRIES,
  PACKET_DIFF_PATHS,
  PACKET_MARKDOWN_PATH,
  PACKET_PATH,
  RECEIPT_ID,
  REGISTRY_REFERENCE,
  STATUS_ENTRIES,
  STATUS_PATHS,
  TARGET_REF,
  TASK_ID
} = require('./Cm2126ExactBranchCasConstants');
const {
  Cm2126ExactBranchCasClaimRegistry,
  SUCCESS_STATE
} = require('./Cm2126ExactBranchCasClaimRegistry');
const {
  buildExecutionReceipt,
  buildReentryReceipt,
  evaluateExecutionReceipt,
  evaluateReentryReceipt,
  exactRuntimeSuccess
} = require('./Cm2126ExactBranchCasReceiptContract');
const {
  evaluateDecision: evaluateContentDecision
} = require('./Cm2125ExactBranchCasContentDecision');
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
const {
  assertSafeGitEnvironment,
  sanitizedGitEnvironment
} = require('./Cm2122FullPlanStatusSyncExecution');

const machineBoundContentDecisions = new WeakSet();
const machineBoundPackets = new WeakSet();
const machineBoundFinalReleases = new WeakSet();
const machineBoundReleaseBindings = new WeakSet();

function isolatedTestFaultSelected(point) {
  return process.env.NODE_ENV === 'test' && process.env.CM2126_ISOLATED_TEST_FIXTURE === '1' &&
    process.cwd().includes('cm2126-cas-e2e-') && process.env.CM2126_TEST_FAULT_POINT === point;
}

function injectIsolatedTestFault(point) {
  if (isolatedTestFaultSelected(point)) {
    throw new Error(`cm2126_isolated_test_fault:${point}`);
  }
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
          actual.bytes !== artifact.bytes || actual.sha256 !== artifact.sha256) {
        blockers.push(`${label}.artifact.${artifact.path}`);
      }
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
        !sameJson(paths, [CONTENT_DECISION_FREEZE.json.path, CONTENT_DECISION_FREEZE.markdown.path].sort()) ||
        !sameJson(entries, [{ status: 'A', path: CONTENT_DECISION_FREEZE.json.path },
          { status: 'A', path: CONTENT_DECISION_FREEZE.markdown.path }]
          .sort((left, right) => left.path.localeCompare(right.path)))) blockers.push('contentDecision.lineageOrDiff');
    jsonIdentity = options.resolveGitFile(CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_FREEZE.json.path);
    markdownIdentity = options.resolveGitFile(CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_FREEZE.markdown.path);
    verifyFileIdentity(jsonIdentity, CONTENT_DECISION_FREEZE.json, blockers, 'contentDecision.json',
      CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_FREEZE.tree);
    verifyFileIdentity(markdownIdentity, CONTENT_DECISION_FREEZE.markdown, blockers, 'contentDecision.markdown',
      CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_FREEZE.tree);
    decision = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (!markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd()) ||
        decision.payload?.decisionReference !== CONTENT_DECISION_FREEZE.reference ||
        decision.canonicalPayloadSha256 !== CONTENT_DECISION_FREEZE.canonicalPayloadSha256 ||
        decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) blockers.push('contentDecision.exactContent');
    verifyRecordedImplementation(decision.payload?.decisionImplementation || {}, options, blockers,
      'contentDecision.recordedImplementation');
    const evaluation = evaluateContentDecision(decision, {
      implementation: decision.payload?.decisionImplementation,
      ...options
    });
    if (!evaluation.accepted || evaluation.authorizationContentApproved !== true ||
        evaluation.branchCasExecutionAuthorized !== false || evaluation.branchRefUpdateAuthorized !== false ||
        evaluation.targetWorktreeIndexSynchronizationAuthorized !== false ||
        evaluation.targetWorktreeFileSynchronizationAuthorized !== false || evaluation.branchRefUpdated !== false ||
        evaluation.currentBranchStatusSynchronized !== false || evaluation.readinessClaimed !== false) {
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
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false
  };
}

function isMachineBoundContentDecision(value) {
  return !!value && machineBoundContentDecisions.has(value);
}

function buildTargetBindings(options) {
  if (!validResolvers(options, ['resolveGitFile', 'resolveCommitTree', 'resolveParentCommit', 'resolveDiffEntries'])) {
    throw new Error('cm2126_target_binding_resolvers_required');
  }
  if (options.resolveCommitTree(EXPECTED_OLD) !== EXPECTED_OLD_TREE ||
      options.resolveCommitTree(NEW_COMMIT) !== NEW_TREE || options.resolveParentCommit(NEW_COMMIT) !== EXPECTED_OLD ||
      !sameJson(options.resolveDiffEntries(EXPECTED_OLD, NEW_COMMIT)
        .sort((left, right) => left.path.localeCompare(right.path)), STATUS_ENTRIES)) {
    throw new Error('cm2126_exact_old_new_lineage_required');
  }
  return STATUS_PATHS.map(sourcePath => {
    const before = options.resolveGitFile(EXPECTED_OLD, sourcePath);
    const after = options.resolveGitFile(NEW_COMMIT, sourcePath);
    if (before.gitMode !== '100644' || after.gitMode !== '100644' ||
        before.gitObjectType !== 'blob' || after.gitObjectType !== 'blob') {
      throw new Error(`cm2126_regular_blob_required:${sourcePath}`);
    }
    return {
      sourcePath,
      operation: 'modify',
      before: identityWithoutContent(before),
      after: identityWithoutContent(after)
    };
  });
}

function verifyTargetBindings(bindings, options, blockers, label) {
  try {
    if (!sameJson(bindings, buildTargetBindings(options))) blockers.push(`${label}.exactTargetBindings`);
  } catch {
    blockers.push(`${label}.exactTargetBindings`);
  }
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
        !sameJson(paths, IMPLEMENTATION_DIFF_PATHS) || !sameJson(entries, IMPLEMENTATION_DIFF_ENTRIES) ||
        !sameJson(implementation.diffPaths, paths) || !sameJson(implementation.diffEntries, entries) ||
        implementation.diffPathsSha256 !== sha256Canonical(paths) ||
        implementation.diffEntriesSha256 !== sha256Canonical(entries) ||
        !options.isCommitAncestor(CONTENT_DECISION_FREEZE.commit, implementation.commit) ||
        !sameJson(implementation.artifacts.map(item => item.path), IMPLEMENTATION_ARTIFACT_PATHS)) {
      blockers.push('packet.implementationLineageOrDiff');
    }
    for (const artifact of implementation.artifacts || []) {
      const actual = options.resolveGitFile(implementation.commit, artifact.path);
      if (actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' || actual.blobOid !== artifact.blobOid ||
          actual.bytes !== artifact.bytes || actual.sha256 !== artifact.sha256) {
        blockers.push(`packet.implementationArtifact.${artifact.path}`);
      }
    }
  } catch {
    blockers.push('packet.implementationUnreadable');
  }
}

function buildExecutionPacket({ implementation, contentEvidence, targetBindings, targetWorktreeIdentity }) {
  if (!contentEvidence?.accepted || !isMachineBoundContentDecision(contentEvidence.decision)) {
    throw new Error('cm2126_machine_bound_content_decision_required');
  }
  if (!targetWorktreeIdentity || !/^[a-f0-9]{64}$/.test(targetWorktreeIdentity.identitySha256 || '') ||
      targetWorktreeIdentity.rawPathDisclosed !== false) throw new Error('cm2126_target_worktree_identity_required');
  const decision = contentEvidence.decision;
  const payload = {
    packetReference: `CM-2126-EXACT-BRANCH-CAS-EXECUTION-PACKET-${decision.canonicalPayloadSha256.slice(0, 8)}-${implementation.commit.slice(0, 8)}`.toUpperCase(),
    packetType: 'non_executing_exact_local_branch_cas_and_linked_worktree_sync_packet',
    implementation,
    contentDecision: {
      reference: CONTENT_DECISION_FREEZE.reference,
      commit: CONTENT_DECISION_FREEZE.commit,
      tree: CONTENT_DECISION_FREEZE.tree,
      parentCommit: CONTENT_DECISION_FREEZE.parentCommit,
      parentTree: CONTENT_DECISION_FREEZE.parentTree,
      canonicalPayloadSha256: CONTENT_DECISION_FREEZE.canonicalPayloadSha256,
      json: identityWithoutContent(contentEvidence.jsonIdentity),
      markdown: identityWithoutContent(contentEvidence.markdownIdentity),
      machineGitIntakeRequired: true
    },
    exactCasBoundary: {
      targetRef: TARGET_REF,
      expectedOld: EXPECTED_OLD,
      expectedOldTree: EXPECTED_OLD_TREE,
      newCommit: NEW_COMMIT,
      newTree: NEW_TREE,
      newCommitParent: EXPECTED_OLD,
      updateMethod: 'git_update_ref_no_deref_exact_expected_old_compare_and_swap',
      exactModifiedPaths: STATUS_PATHS,
      exactDiffEntries: STATUS_ENTRIES,
      targetBindings,
      forceAllowed: false,
      deleteAllowed: false,
      retargetAllowed: false,
      otherRefUpdateAllowed: false,
      remoteRefUpdateAllowed: false
    },
    linkedWorktreeBoundary: {
      targetWorktreeIdentity,
      targetWorktreeMustBeMachineDerived: true,
      exactSingleTargetBranchCheckoutRequired: true,
      sharedGitCommonDirRequired: true,
      callerSuppliedWorktreePathAllowed: false,
      environmentWorktreeOverrideAllowed: false,
      preClaimRefHeadIndexAndNineFilesMustMatchOld: true,
      postClaimRevalidationRequired: true,
      indexSynchronizationMethod: 'exclusive_real_index_lock_exact_old_bytes_then_exact_nine_cacheinfo_atomic_rename',
      fileSynchronizationMethod: 'exact_nine_blob_bytes_repeated_parent_and_before_identity_checks_atomic_rename_fsync',
      exactIndexPolicyAndSymbolicRefRequiredBeforeAndAfter: true,
      exactIndexSynchronizations: 1,
      exactFileSynchronizations: 9,
      resetHardAllowed: false,
      checkoutAllowed: false,
      restoreAllowed: false,
      readTreeAllowed: false,
      readTreeUpdateWorktreeAllowed: false,
      refOnlyCasIsSufficient: false
    },
    concurrencyBoundary: {
      governedExecutorsSerializedByPersistentOneShotClaim: true,
      exclusiveOperatorQuiescenceRequiredDuringNineFileSynchronization: true,
      nonCooperativeConcurrentFileWritersExcludedFromThreatModel: true,
      ordinaryRenameIsAtomicReplacementNotFilesystemExpectedOldCas: true,
      repeatedParentBeforeIdentityAndPostReceiptChecksRequired: true,
      anyObservedDriftRequiresReconciliation: true
    },
    runtimeBoundary: {
      cleanDetachedExecutionWorktreeRequired: true,
      runtimeHeadMustEqualFinalReleaseCommit: true,
      runtimeTreeMustEqualFinalReleaseTree: true,
      unsafeGitEnvironmentRejected: true,
      sanitizedGitChildEnvironmentRequired: true,
      callerRefAllowed: false,
      callerOldOrNewAllowed: false,
      callerOutputPathAllowed: false,
      callerRegistryRootAllowed: false,
      callerCallbackAllowed: false,
      callerResolverAllowed: false
    },
    oneShotRegistry: {
      governanceRootAuthority: 'git_common_dir_fixed_governance_root',
      governanceRootIdentitySha256: GOVERNANCE_ROOT_IDENTITY_SHA256,
      registryReference: REGISTRY_REFERENCE,
      nonce: NONCE,
      receiptId: RECEIPT_ID,
      claimIdExcludesBindingHash: true,
      atomicExclusiveCreateRequired: true,
      attemptBeforeEveryEffectRequired: true,
      consumedMarkerUsesUnknownOutcomeUntilObserved: true,
      durableReadonlyReentryRequired: true,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      automaticRetryAllowed: false,
      automaticRollbackAllowed: false,
      automaticCleanupAllowed: false
    },
    stateMachine: {
      successState: SUCCESS_STATE,
      partialOrAmbiguousReceiptRequired: true,
      separateReconciliationDecisionRequired: true,
      noClaimMayBeReused: true
    },
    receiptBoundary: {
      executionReceiptFilename: EXECUTION_RECEIPT_FILENAME,
      receiptStoredInFixedGovernanceRoot: true,
      upstreamGitRevalidationAtReceiptTimeRequired: true,
      targetRefHeadSymbolicRefIndexPolicyAndFilesBindingRequired: true,
      otherRefsSnapshotBindingRequired: true,
      rawWorktreePathDisclosed: false,
      separateReceiptFreezeAndReviewRequired: true
    },
    finalReleaseRequirements: {
      separateFinalExecutionReleaseRequired: true,
      finalReleaseMustBindContentDecisionGitIdentity: true,
      finalReleaseMustBindPacketGitIdentity: true,
      finalReleaseMustBindImplementationGitIdentity: true,
      finalReleaseCommitMustBeDirectChildOfPacketCommit: true,
      finalReleaseMayAuthorizeAtMostOneExactBranchCas: true,
      finalReleaseMayAuthorizeAtMostOneIndexSynchronization: true,
      finalReleaseMayAuthorizeExactlyNineFileSynchronizations: true,
      finalReleaseMayAuthorizeRemoteAction: false
    },
    currentAuthority: {
      authorizationContentApproved: true,
      executionPacketPrepared: true,
      finalExecutionReleasePresent: false,
      finalExecutionReleaseAuthorized: false,
      branchCasClaimCreationAuthorized: false,
      branchCasExecutionAuthorized: false,
      branchRefUpdateAuthorized: false,
      targetWorktreeIndexSynchronizationAuthorized: false,
      targetWorktreeFileSynchronizationAuthorized: false,
      executionReceiptCreationAuthorized: false
    },
    currentState: {
      claimCreated: false,
      branchRefUpdated: false,
      targetWorktreeIndexSynchronized: false,
      targetWorktreeFilesSynchronized: false,
      executionReceiptCreated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      readinessClaimed: false
    },
    sideEffectLimits: {
      claimEnvelopeCreates: 1,
      branchRefCasAttempts: 1,
      branchRefUpdates: 1,
      otherRefUpdates: 0,
      targetIndexSynchronizations: 1,
      targetFileSyncBatches: 1,
      targetFileSynchronizations: 9,
      executionReceiptWrites: 1,
      remoteActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      readinessClaims: 0
    },
    currentSideEffects: {
      claimEnvelopeCreates: 0,
      branchRefCasAttempts: 0,
      branchRefUpdates: 0,
      otherRefUpdates: 0,
      targetIndexSynchronizations: 0,
      targetFileSyncBatches: 0,
      targetFileSynchronizations: 0,
      executionReceiptWrites: 0,
      remoteActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      readinessClaims: 0
    },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
  };
  return wrapPayload(payload, 'cm2126_non_executing_exact_branch_cas_packet_v1');
}

function evaluateExecutionPacket(packet = {}, { targetWorktreeIdentity, ...options } = {}) {
  const blockers = [];
  if (packet.schemaVersion !== 1 || packet.taskId !== TASK_ID ||
      packet.artifactType !== 'cm2126_non_executing_exact_branch_cas_packet_v1' ||
      packet.canonicalPayloadSha256 !== sha256Canonical(packet.payload || {})) blockers.push('packet.identityOrHash');
  const contentEvidence = intakeContentDecision(options);
  if (!contentEvidence.accepted) blockers.push(...contentEvidence.blockers.map(item => `packet.${item}`));
  const implementation = packet.payload?.implementation;
  if (!implementation || !validResolvers(options, ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths',
    'resolveDiffEntries', 'resolveGitFile', 'isCommitAncestor'])) blockers.push('packet.implementationOrResolvers');
  else verifyImplementation(implementation, options, blockers);
  verifyTargetBindings(packet.payload?.exactCasBoundary?.targetBindings, options, blockers, 'packet');
  if (!targetWorktreeIdentity || !sameJson(packet.payload?.linkedWorktreeBoundary?.targetWorktreeIdentity,
    targetWorktreeIdentity)) blockers.push('packet.targetWorktreeIdentity');
  if (contentEvidence.accepted && implementation && targetWorktreeIdentity) {
    try {
      const expected = buildExecutionPacket({
        implementation,
        contentEvidence,
        targetBindings: buildTargetBindings(options),
        targetWorktreeIdentity
      });
      if (!sameJson(packet, expected)) blockers.push('packet.exactContent');
    } catch {
      blockers.push('packet.exactContent');
    }
  }
  const authority = packet.payload?.currentAuthority || {};
  const current = packet.payload?.currentState || {};
  if (authority.executionPacketPrepared !== true || authority.finalExecutionReleasePresent !== false ||
      authority.finalExecutionReleaseAuthorized !== false || authority.branchCasClaimCreationAuthorized !== false ||
      authority.branchCasExecutionAuthorized !== false || authority.branchRefUpdateAuthorized !== false ||
      authority.targetWorktreeIndexSynchronizationAuthorized !== false ||
      authority.targetWorktreeFileSynchronizationAuthorized !== false ||
      authority.executionReceiptCreationAuthorized !== false || current.claimCreated !== false ||
      current.branchRefUpdated !== false || current.targetWorktreeIndexSynchronized !== false ||
      current.targetWorktreeFilesSynchronized !== false || current.executionReceiptCreated !== false ||
      current.statusSyncPerformed !== false || current.currentBranchStatusSynchronized !== false ||
      current.readinessClaimed !== false ||
      Object.values(packet.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(packet.payload?.nonClaims || {}).some(value => value !== false)) {
    blockers.push('packet.nonExecutingBoundary');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    packetPrepared: blockers.length === 0,
    packetMachineBound: false,
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false,
    contentEvidence
  };
}

function intakeExecutionPacket({ packetCommit, targetWorktreeIdentity, ...options } = {}) {
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
        jsonIdentity.gitMode !== '100644' || jsonIdentity.gitObjectType !== 'blob' ||
        markdownIdentity.gitMode !== '100644' || markdownIdentity.gitObjectType !== 'blob' ||
        !markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('packetIntake.lineageOrFiles');
    }
    const evaluation = evaluateExecutionPacket(packet, { targetWorktreeIdentity, ...options });
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
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false
  };
}

function isMachineBoundExecutionPacket(value) {
  return !!value && machineBoundPackets.has(value);
}

function buildFinalReleaseDecision({ packetEvidence }) {
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet)) {
    throw new Error('cm2127_machine_bound_execution_packet_required');
  }
  const packet = packetEvidence.packet;
  const payload = {
    decisionReference: `CM-2127-EXACT-BRANCH-CAS-FINAL-RELEASE-${packet.canonicalPayloadSha256.slice(0, 8)}-${packetEvidence.packetCommit.slice(0, 8)}`.toUpperCase(),
    decisionType: 'exact_one_shot_local_branch_cas_and_linked_worktree_sync_final_execution_release',
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
    exactCasBoundary: packet.payload.exactCasBoundary,
    linkedWorktreeBoundary: packet.payload.linkedWorktreeBoundary,
    concurrencyBoundary: packet.payload.concurrencyBoundary,
    runtimeBoundary: packet.payload.runtimeBoundary,
    oneShotRegistry: packet.payload.oneShotRegistry,
    stateMachine: packet.payload.stateMachine,
    receiptBoundary: packet.payload.receiptBoundary,
    authorization: {
      executionReleaseAuthorized: true,
      exactAction: ACTION,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      approvedAt: FINAL_RELEASE_APPROVED_AT,
      expiresAt: FINAL_RELEASE_EXPIRES_AT,
      branchCasClaimCreationAuthorized: true,
      branchCasExecutionAuthorized: true,
      branchRefUpdateAuthorized: true,
      targetWorktreeIndexSynchronizationAuthorized: true,
      targetWorktreeFileSynchronizationAuthorized: true,
      executionReceiptCreationAuthorized: true,
      remoteActionAuthorized: false,
      forceUpdateAuthorized: false,
      refDeletionAuthorized: false,
      retargetAuthorized: false,
      otherRefUpdateAuthorized: false,
      automaticRetryAllowed: false,
      automaticRollbackAllowed: false,
      automaticCleanupAllowed: false
    },
    sideEffectLimits: packet.payload.sideEffectLimits,
    currentState: {
      finalExecutionReleasePrepared: true,
      finalExecutionReleaseGitIntakeCompleted: false,
      claimCreated: false,
      branchRefUpdated: false,
      targetWorktreeIndexSynchronized: false,
      targetWorktreeFilesSynchronized: false,
      executionReceiptCreated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      readinessClaimed: false
    },
    currentSideEffects: packet.payload.currentSideEffects,
    nonClaims: packet.payload.nonClaims
  };
  return wrapPayload(payload, 'cm2127_exact_branch_cas_final_execution_release_v1', FINAL_RELEASE_TASK_ID);
}

function evaluateFinalReleaseDecision(decision = {}, { packetEvidence, now = new Date() } = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.taskId !== FINAL_RELEASE_TASK_ID ||
      decision.artifactType !== 'cm2127_exact_branch_cas_final_execution_release_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) blockers.push('finalRelease.identityOrHash');
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet)) {
    blockers.push('finalRelease.machineBoundPacketRequired');
  } else {
    try {
      const expected = buildFinalReleaseDecision({ packetEvidence });
      if (!sameJson(decision, expected)) blockers.push('finalRelease.exactContent');
    } catch {
      blockers.push('finalRelease.exactContent');
    }
  }
  const authority = decision.payload?.authorization || {};
  const current = decision.payload?.currentState || {};
  const approvedAt = Date.parse(authority.approvedAt || '');
  const expiresAt = Date.parse(authority.expiresAt || '');
  const observedAt = now instanceof Date ? now.getTime() : Date.parse(now);
  if (authority.approvedAt !== FINAL_RELEASE_APPROVED_AT ||
      authority.expiresAt !== FINAL_RELEASE_EXPIRES_AT) {
    blockers.push('finalRelease.authorizationWindowBinding');
  }
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(observedAt) ||
      approvedAt >= expiresAt || observedAt < approvedAt || observedAt >= expiresAt) {
    blockers.push('finalRelease.authorizationWindow');
  }
  if (authority.executionReleaseAuthorized !== true || authority.exactAction !== ACTION ||
      authority.authorizationUseCount !== 1 || authority.authorizationReplayAllowed !== false ||
      authority.branchCasClaimCreationAuthorized !== true || authority.branchCasExecutionAuthorized !== true ||
      authority.branchRefUpdateAuthorized !== true ||
      authority.targetWorktreeIndexSynchronizationAuthorized !== true ||
      authority.targetWorktreeFileSynchronizationAuthorized !== true ||
      authority.executionReceiptCreationAuthorized !== true || authority.remoteActionAuthorized !== false ||
      authority.forceUpdateAuthorized !== false || authority.refDeletionAuthorized !== false ||
      authority.retargetAuthorized !== false || authority.otherRefUpdateAuthorized !== false ||
      authority.automaticRetryAllowed !== false || authority.automaticRollbackAllowed !== false ||
      authority.automaticCleanupAllowed !== false || current.finalExecutionReleaseGitIntakeCompleted !== false ||
      current.claimCreated !== false || current.branchRefUpdated !== false ||
      current.targetWorktreeIndexSynchronized !== false || current.targetWorktreeFilesSynchronized !== false ||
      current.executionReceiptCreated !== false || current.statusSyncPerformed !== false ||
      current.currentBranchStatusSynchronized !== false || current.readinessClaimed !== false ||
      Object.values(decision.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(decision.payload?.nonClaims || {}).some(value => value !== false)) {
    blockers.push('finalRelease.authorityBoundary');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    executionReleaseAuthorized: blockers.length === 0,
    branchCasExecutionAuthorized: blockers.length === 0,
    branchRefUpdateAuthorized: blockers.length === 0,
    currentBranchStatusSynchronized: false,
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
      !validResolvers(options, ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths',
        'resolveDiffEntries', 'resolveGitFile'])) {
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
        jsonIdentity.gitMode !== '100644' || jsonIdentity.gitObjectType !== 'blob' ||
        markdownIdentity.gitMode !== '100644' || markdownIdentity.gitObjectType !== 'blob' ||
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
    branchCasExecutionAuthorized: accepted,
    branchRefUpdateAuthorized: accepted,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false
  };
}

function isMachineBoundFinalReleaseDecision(value) {
  return !!value && machineBoundFinalReleases.has(value);
}

function gitBuffer(args, { cwd = process.cwd(), input = undefined, internalEnv = {} } = {}) {
  if (Object.keys(internalEnv).some(key => key !== 'GIT_INDEX_FILE')) {
    throw new Error('cm2126_internal_git_environment_invalid');
  }
  return execFileSync('git', args, {
    cwd,
    input,
    encoding: null,
    env: { ...sanitizedGitEnvironment(), GIT_OPTIONAL_LOCKS: '0', ...internalEnv },
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  });
}

function gitText(args, options = {}) {
  return gitBuffer(args, options).toString('utf8').trim();
}

function optionalGitText(args, options = {}) {
  try {
    return gitText(args, options);
  } catch {
    return null;
  }
}

function parseWorktreeList(bytes) {
  const records = [];
  let record = {};
  for (const field of bytes.toString('utf8').split('\0')) {
    if (field === '') {
      if (Object.keys(record).length) records.push(record);
      record = {};
      continue;
    }
    const separator = field.indexOf(' ');
    if (separator === -1) record[field] = true;
    else record[field.slice(0, separator)] = field.slice(separator + 1);
  }
  if (Object.keys(record).length) records.push(record);
  return records;
}

function resolveGitCommonDir(repoRoot = process.cwd()) {
  const observed = gitText(['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: repoRoot });
  return fs.realpathSync(observed);
}

function deriveTargetWorktree(repoRoot = process.cwd()) {
  const records = parseWorktreeList(gitBuffer(['worktree', 'list', '--porcelain', '-z'], { cwd: repoRoot }));
  const matches = records.filter(record => record.branch === TARGET_REF);
  if (matches.length !== 1 || typeof matches[0].worktree !== 'string') {
    throw new Error('cm2126_exact_single_target_worktree_required');
  }
  const rawPath = matches[0].worktree;
  const stat = fs.lstatSync(rawPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('cm2126_target_worktree_directory_invalid');
  const realPath = fs.realpathSync(rawPath);
  const dotGitPath = path.join(realPath, '.git');
  const dotGitStat = fs.lstatSync(dotGitPath);
  if (!dotGitStat.isFile() || dotGitStat.isSymbolicLink()) throw new Error('cm2126_target_worktree_gitfile_invalid');
  const dotGitBytes = fs.readFileSync(dotGitPath);
  const repositoryCommonDir = resolveGitCommonDir(repoRoot);
  const targetCommonDir = resolveGitCommonDir(realPath);
  if (repositoryCommonDir !== targetCommonDir) throw new Error('cm2126_target_worktree_common_dir_mismatch');
  const identityPayload = {
    targetRef: TARGET_REF,
    worktreeRealpathSha256: sha256(realPath),
    worktreeGitFileSha256: sha256(dotGitBytes),
    gitCommonDirRealpathSha256: sha256(repositoryCommonDir),
    rawPathDisclosed: false
  };
  return {
    path: realPath,
    recordHead: matches[0].HEAD || null,
    publicIdentity: {
      ...identityPayload,
      identitySha256: sha256Canonical(identityPayload)
    }
  };
}

function targetRefOid(repoRoot = process.cwd()) {
  return optionalGitText(['show-ref', '--hash', '--verify', TARGET_REF], { cwd: repoRoot });
}

function classifyBranchCasCommandFailure(observedRef) {
  return {
    state: 'CONSUMED_AMBIGUOUS_CAS',
    details: { branchCasInvocationCount: 1, branchRefUpdates: null, targetRefObserved: observedRef }
  };
}

function fileMatchesIdentity(root, identity) {
  try {
    const absolute = path.join(root, identity.sourcePath);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) return false;
    if (identity.gitMode !== '100644' && identity.gitMode !== '100755') return false;
    const expectedExecutable = identity.gitMode === '100755';
    const observedExecutable = (stat.mode & 0o100) !== 0;
    if (observedExecutable !== expectedExecutable) return false;
    const bytes = fs.readFileSync(absolute);
    return bytes.length === identity.bytes && sha256(bytes) === identity.sha256 && gitBlobOid(bytes) === identity.blobOid;
  } catch {
    return false;
  }
}

function indexMatchesCommit(targetPath, commit) {
  try {
    gitBuffer(['diff', '--cached', '--quiet', commit, '--'], { cwd: targetPath });
    return true;
  } catch {
    return false;
  }
}

function worktreeClean(targetPath) {
  return gitText(['status', '--porcelain', '--untracked-files=all'], { cwd: targetPath }) === '';
}

function resolveTargetIndexPath(targetPath) {
  const commonDir = resolveGitCommonDir(targetPath);
  const indexPath = path.resolve(gitText(
    ['rev-parse', '--path-format=absolute', '--git-path', 'index'],
    { cwd: targetPath }
  ));
  if (!indexPath.startsWith(`${commonDir}${path.sep}`)) throw new Error('cm2126_target_index_path_escape');
  let currentDirectory = path.dirname(indexPath);
  while (currentDirectory !== commonDir) {
    const directoryStat = fs.lstatSync(currentDirectory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() ||
        fs.realpathSync(currentDirectory) !== currentDirectory) {
      throw new Error('cm2126_target_index_parent_invalid');
    }
    const parent = path.dirname(currentDirectory);
    if (parent === currentDirectory ||
        (parent !== commonDir && !parent.startsWith(`${commonDir}${path.sep}`))) {
      throw new Error('cm2126_target_index_parent_escape');
    }
    currentDirectory = parent;
  }
  const indexStat = fs.lstatSync(indexPath);
  if (!indexStat.isFile() || indexStat.isSymbolicLink() || fs.realpathSync(indexPath) !== indexPath) {
    throw new Error('cm2126_target_index_invalid');
  }
  return indexPath;
}

function targetIndexLockAbsent(targetPath) {
  try {
    fs.lstatSync(`${resolveTargetIndexPath(targetPath)}.lock`);
    return false;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
}

function assertPathAbsent(entryPath, errorCode) {
  try {
    fs.lstatSync(entryPath);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(errorCode);
}

function assertPreclaimEffectPathsAbsent(governanceRoot, targetPath, targetBindings) {
  assertPathAbsent(path.join(governanceRoot, EXECUTION_RECEIPT_FILENAME),
    'cm2126_preclaim_execution_receipt_exists');
  for (const binding of targetBindings) {
    const temporary = path.join(targetPath, path.dirname(binding.after.sourcePath),
      `.cm2126-${sha256(binding.after.sourcePath).slice(0, 16)}.sync.tmp`);
    assertPathAbsent(temporary, 'cm2126_preclaim_target_temp_exists');
  }
}

function exactIndexPolicyMatched(targetPath) {
  try {
    const sparse = optionalGitText(['config', '--bool', 'core.sparseCheckout'], { cwd: targetPath });
    const splitIndex = optionalGitText(['config', '--bool', 'core.splitIndex'], { cwd: targetPath });
    const sharedIndexPath = optionalGitText(
      ['-c', 'core.splitIndex=true', 'rev-parse', '--shared-index-path'],
      { cwd: targetPath }
    );
    const splitIndexMaterialized = sharedIndexPath !== '' &&
      !/(?:^|\/)sharedindex\.0{40}$/.test(sharedIndexPath);
    const unmerged = gitText(['ls-files', '-u'], { cwd: targetPath });
    const flags = gitText(['ls-files', '-v'], { cwd: targetPath }).split('\n').filter(Boolean);
    return sparse !== 'true' && splitIndex !== 'true' && !splitIndexMaterialized &&
      unmerged === '' && flags.every(line => line.startsWith('H '));
  } catch {
    return false;
  }
}

function targetSnapshot(repoRoot, target, targetBindings, mode) {
  const identities = targetBindings.map(item => item[mode]);
  const expectedCommit = mode === 'before' ? EXPECTED_OLD : NEW_COMMIT;
  const expectedTree = mode === 'before' ? EXPECTED_OLD_TREE : NEW_TREE;
  const ref = targetRefOid(repoRoot);
  const head = optionalGitText(['rev-parse', 'HEAD^{commit}'], { cwd: target.path });
  const symbolicRef = optionalGitText(['symbolic-ref', '-q', 'HEAD'], { cwd: target.path });
  const indexPolicyMatched = exactIndexPolicyMatched(target.path);
  const indexMatched = indexPolicyMatched ? indexMatchesCommit(target.path, expectedCommit) : false;
  const matchedFiles = identities.filter(identity => fileMatchesIdentity(target.path, identity)).length;
  return {
    ref,
    head,
    symbolicRef,
    indexTree: indexMatched ? expectedTree : null,
    indexPolicyMatched,
    indexLockAbsent: targetIndexLockAbsent(target.path),
    matchedFiles,
    clean: indexPolicyMatched ? worktreeClean(target.path) : false
  };
}

function verifyTargetOldPreflight(repoRoot, target, targetBindings) {
  const snapshot = targetSnapshot(repoRoot, target, targetBindings, 'before');
  if (target.recordHead !== EXPECTED_OLD || snapshot.ref !== EXPECTED_OLD || snapshot.head !== EXPECTED_OLD ||
      snapshot.symbolicRef !== TARGET_REF || snapshot.indexTree !== EXPECTED_OLD_TREE || snapshot.matchedFiles !== 9 ||
      snapshot.clean !== true || snapshot.indexPolicyMatched !== true || !targetIndexLockAbsent(target.path)) {
    throw new Error('cm2126_target_old_preflight_failed');
  }
  return snapshot;
}

function otherRefsSnapshotSha256(repoRoot) {
  const output = gitBuffer(['for-each-ref', '--format=%(refname)%00%(objectname)'], {
    cwd: repoRoot
  }).toString('utf8');
  const entries = output.split('\n').filter(Boolean).map(line => {
    const [ref, oid] = line.split('\0');
    return { ref, oid };
  }).filter(item => item.ref !== TARGET_REF).sort((left, right) => left.ref.localeCompare(right.ref));
  return sha256Canonical(entries);
}

function resolveFixedGovernanceRoot(repoRoot = process.cwd()) {
  return path.join(resolveGitCommonDir(repoRoot), 'codex-memory-governance',
    'phase8-one-shot-authorization-registries');
}

function realResolverOptions() {
  return require('../../scripts/generate-cm2116-exact-full-plan-application-gate').resolverOptions();
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
    targetRef: TARGET_REF,
    expectedOld: EXPECTED_OLD,
    newCommit: NEW_COMMIT,
    targetWorktreeIdentitySha256:
      packetEvidence.packet.payload.linkedWorktreeBoundary.targetWorktreeIdentity.identitySha256
  });
}

function releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash) {
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet) ||
      !finalReleaseEvidence?.accepted || !isMachineBoundFinalReleaseDecision(finalReleaseEvidence.decision)) {
    throw new Error('cm2126_machine_bound_release_binding_required');
  }
  const binding = {
    machineBound: true,
    packetEvidence,
    finalReleaseEvidence,
    bindingHash,
    decisionReference: finalReleaseEvidence.decision.payload.decisionReference,
    sourceCommit: finalReleaseEvidence.finalReleaseCommit,
    approvedAt: finalReleaseEvidence.decision.payload.authorization.approvedAt,
    expiresAt: finalReleaseEvidence.decision.payload.authorization.expiresAt,
    targetWorktreeIdentitySha256:
      packetEvidence.packet.payload.linkedWorktreeBoundary.targetWorktreeIdentity.identitySha256,
    expectedOld: EXPECTED_OLD,
    expectedOldTree: EXPECTED_OLD_TREE
  };
  deepFreeze(binding);
  machineBoundReleaseBindings.add(binding);
  return binding;
}

function isMachineBoundReleaseBinding(value) {
  return !!value && machineBoundReleaseBindings.has(value);
}

async function claimWithDurableRaceReentry({ registry, bindingHash, release, observedAt = new Date() }) {
  try {
    return { claim: await registry.claim(bindingHash, release, observedAt), existing: null };
  } catch (error) {
    const existing = await registry.inspectExisting(bindingHash, release);
    if (!existing.claimEnvelopePresent) throw error;
    return { claim: null, existing };
  }
}

function claimBoundReviewTime(claimEnvelope) {
  const claimedAt = Date.parse(claimEnvelope?.claimedAt || '');
  if (!Number.isFinite(claimedAt)) throw new Error('cm2126_claimed_at_required_for_receipt_review');
  return new Date(claimedAt);
}

function assertExecutionRuntime({ packetEvidence, finalReleaseEvidence }) {
  const repoRoot = fs.realpathSync(gitText(['rev-parse', '--show-toplevel']));
  if (repoRoot !== fs.realpathSync(process.cwd()) || gitText(['branch', '--show-current'], { cwd: repoRoot }) !== '' ||
      gitText(['status', '--porcelain', '--untracked-files=all'], { cwd: repoRoot }) !== '' ||
      gitText(['rev-parse', 'HEAD^{commit}'], { cwd: repoRoot }) !== finalReleaseEvidence.finalReleaseCommit ||
      gitText(['rev-parse', 'HEAD^{tree}'], { cwd: repoRoot }) !== finalReleaseEvidence.finalReleaseTree) {
    throw new Error('cm2126_clean_detached_final_release_runtime_required');
  }
  const target = deriveTargetWorktree(repoRoot);
  if (!sameJson(target.publicIdentity,
    packetEvidence.packet.payload.linkedWorktreeBoundary.targetWorktreeIdentity)) {
    throw new Error('cm2126_target_worktree_identity_drift');
  }
  return { repoRoot, target };
}

function verifyPerFileEffectBoundary(repoRoot, targetPath, beforeOtherRefs) {
  return targetRefOid(repoRoot) === NEW_COMMIT &&
    optionalGitText(['rev-parse', 'HEAD^{commit}'], { cwd: targetPath }) === NEW_COMMIT &&
    optionalGitText(['symbolic-ref', '-q', 'HEAD'], { cwd: targetPath }) === TARGET_REF &&
    indexMatchesCommit(targetPath, NEW_COMMIT) && exactIndexPolicyMatched(targetPath) &&
    targetIndexLockAbsent(targetPath) &&
    otherRefsSnapshotSha256(repoRoot) === beforeOtherRefs;
}

function assertTargetParentChain(root, sourcePath) {
  let directoryPath = root;
  for (const part of sourcePath.split('/').slice(0, -1)) {
    directoryPath = path.join(directoryPath, part);
    const directoryStat = fs.lstatSync(directoryPath);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() ||
        fs.realpathSync(directoryPath) !== directoryPath) {
      throw new Error(`cm2126_target_parent_invalid:${sourcePath}`);
    }
  }
  return path.dirname(path.join(root, sourcePath));
}

async function syncTargetFiles(targetPath, targetBindings, options, repoRoot, beforeOtherRefs) {
  let completed = 0;
  for (const binding of targetBindings) {
    if (completed === 0 && isolatedTestFaultSelected('index_lock_before_first_file_sync')) {
      fs.writeFileSync(`${resolveTargetIndexPath(targetPath)}.lock`, 'synthetic concurrent index writer\n', {
        flag: 'wx'
      });
    }
    const identity = binding.after;
    const source = options.resolveGitFile(NEW_COMMIT, identity.sourcePath);
    if (source.blobOid !== identity.blobOid || source.bytes !== identity.bytes || source.sha256 !== identity.sha256 ||
        !Buffer.isBuffer(source.content)) throw new Error(`cm2126_target_blob_drift:${identity.sourcePath}`);
    const root = fs.realpathSync(targetPath);
    const absolute = path.resolve(root, identity.sourcePath);
    if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error(`cm2126_target_path_escape:${identity.sourcePath}`);
    assertTargetParentChain(root, identity.sourcePath);
    const existing = await fsPromises.lstat(absolute);
    if (!existing.isFile() || existing.isSymbolicLink()) throw new Error(`cm2126_target_file_invalid:${identity.sourcePath}`);
    if (!verifyPerFileEffectBoundary(repoRoot, targetPath, beforeOtherRefs) ||
        !fileMatchesIdentity(targetPath, binding.before)) {
      const error = new Error(`cm2126_target_file_before_drift:${identity.sourcePath}`);
      error.cm2126TargetFileSynchronizations = completed;
      throw error;
    }
    const temporary = path.join(path.dirname(absolute),
      `.cm2126-${sha256(identity.sourcePath).slice(0, 16)}.sync.tmp`);
    const existingMode = existing.mode & 0o777;
    const expectedMode = identity.gitMode === '100755'
      ? existingMode | 0o100
      : existingMode & ~0o100;
    let handle = null;
    let temporaryIdentity = null;
    let renameAttempted = false;
    let renameAcknowledged = false;
    try {
      handle = await fsPromises.open(temporary, 'wx', expectedMode);
      temporaryIdentity = await handle.stat();
      await handle.writeFile(source.content);
      await handle.sync();
      await handle.close();
      handle = null;
      await fsPromises.chmod(temporary, expectedMode);
      const modeDurabilityHandle = await fsPromises.open(temporary, 'r');
      try { await modeDurabilityHandle.sync(); } finally { await modeDurabilityHandle.close(); }
      injectIsolatedTestFault('file_pre_rename_failure');
      if (!verifyPerFileEffectBoundary(repoRoot, targetPath, beforeOtherRefs) ||
          !fileMatchesIdentity(targetPath, binding.before)) {
        throw new Error(`cm2126_target_file_pre_rename_drift:${identity.sourcePath}`);
      }
      assertTargetParentChain(root, identity.sourcePath);
      injectIsolatedTestFault('file_rename_rejected');
      await fsPromises.rename(temporary, absolute);
      renameAttempted = true;
      injectIsolatedTestFault('file_rename_acknowledgement_lost');
      renameAcknowledged = true;
      completed += 1;
      assertTargetParentChain(root, identity.sourcePath);
      const directory = await fsPromises.open(path.dirname(absolute), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
      if (!fileMatchesIdentity(targetPath, identity)) throw new Error(`cm2126_target_file_readback_failed:${identity.sourcePath}`);
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      if (!renameAttempted && temporaryIdentity) {
        try {
          const currentTemporary = await fsPromises.lstat(temporary);
          if (currentTemporary.isFile() && !currentTemporary.isSymbolicLink() &&
              currentTemporary.dev === temporaryIdentity.dev && currentTemporary.ino === temporaryIdentity.ino) {
            await fsPromises.unlink(temporary);
            const directory = await fsPromises.open(path.dirname(temporary), 'r');
            try { await directory.sync(); } finally { await directory.close(); }
          }
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') error.cm2126TemporaryCleanupFailed = true;
        }
      }
      error.cm2126TargetFileSynchronizations = renameAttempted && !renameAcknowledged ? null : completed;
      throw error;
    }
  }
  return completed;
}

async function synchronizeExactIndexEntries(targetPath, targetBindings, repoRoot, beforeOtherRefs) {
  const records = targetBindings.map(binding =>
    `${binding.after.gitMode} ${binding.after.blobOid}\t${binding.after.sourcePath}\0`
  ).join('');
  const indexPath = resolveTargetIndexPath(targetPath);
  const lockPath = `${indexPath}.lock`;
  const indexMode = (await fsPromises.lstat(indexPath)).mode & 0o777;
  const initialBytes = await fsPromises.readFile(indexPath);
  let lockHandle = null;
  let lockCreated = false;
  let renameAttempted = false;
  try {
    lockHandle = await fsPromises.open(lockPath, 'wx', indexMode);
    lockCreated = true;
    await lockHandle.writeFile(initialBytes);
    await lockHandle.chmod(indexMode);
    await lockHandle.sync();
    await lockHandle.close();
    lockHandle = null;
    injectIsolatedTestFault('index_pre_rename_failure');
    if (!Buffer.from(await fsPromises.readFile(indexPath)).equals(initialBytes) ||
        targetRefOid(repoRoot) !== NEW_COMMIT ||
        optionalGitText(['rev-parse', 'HEAD^{commit}'], { cwd: targetPath }) !== NEW_COMMIT ||
        optionalGitText(['symbolic-ref', '-q', 'HEAD'], { cwd: targetPath }) !== TARGET_REF ||
        !indexMatchesCommit(targetPath, EXPECTED_OLD) || !exactIndexPolicyMatched(targetPath) ||
        otherRefsSnapshotSha256(repoRoot) !== beforeOtherRefs) {
      throw new Error('cm2126_target_index_pre_effect_drift');
    }
    const internalEnv = { GIT_INDEX_FILE: lockPath };
    gitBuffer(['update-index', '-z', '--index-info'], {
      cwd: targetPath,
      input: Buffer.from(records, 'utf8'),
      internalEnv
    });
    await fsPromises.chmod(lockPath, indexMode);
    if (gitText(['write-tree'], { cwd: targetPath, internalEnv }) !== NEW_TREE ||
        !Buffer.from(await fsPromises.readFile(indexPath)).equals(initialBytes) ||
        targetRefOid(repoRoot) !== NEW_COMMIT ||
        optionalGitText(['rev-parse', 'HEAD^{commit}'], { cwd: targetPath }) !== NEW_COMMIT ||
        optionalGitText(['symbolic-ref', '-q', 'HEAD'], { cwd: targetPath }) !== TARGET_REF ||
        !exactIndexPolicyMatched(targetPath) || otherRefsSnapshotSha256(repoRoot) !== beforeOtherRefs) {
      throw new Error('cm2126_target_index_cas_precondition_drift');
    }
    await fsPromises.chmod(lockPath, indexMode);
    const durableLock = await fsPromises.open(lockPath, 'r');
    try { await durableLock.sync(); } finally { await durableLock.close(); }
    injectIsolatedTestFault('index_rename_rejected');
    await fsPromises.rename(lockPath, indexPath);
    renameAttempted = true;
    injectIsolatedTestFault('index_rename_acknowledgement_lost');
    const directory = await fsPromises.open(path.dirname(indexPath), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
    if (targetRefOid(repoRoot) !== NEW_COMMIT ||
        optionalGitText(['rev-parse', 'HEAD^{commit}'], { cwd: targetPath }) !== NEW_COMMIT ||
        optionalGitText(['symbolic-ref', '-q', 'HEAD'], { cwd: targetPath }) !== TARGET_REF ||
        !indexMatchesCommit(targetPath, NEW_COMMIT) || !exactIndexPolicyMatched(targetPath) ||
        otherRefsSnapshotSha256(repoRoot) !== beforeOtherRefs) {
      throw new Error('cm2126_target_index_postcondition_failed');
    }
  } catch (error) {
    if (lockHandle) await lockHandle.close().catch(() => {});
    if (lockCreated && !renameAttempted) {
      await fsPromises.unlink(lockPath).catch(cleanupError => {
        if (cleanupError?.code !== 'ENOENT') error.cm2126IndexLockCleanupError = cleanupError;
      });
    }
    throw error;
  }
}

function governanceDescriptorPath(rootHandle, filename) {
  return `/proc/self/fd/${rootHandle.fd}/${filename}`;
}

async function writeExternalReceipt(registry, receipt) {
  const bytes = Buffer.from(serializeArtifact(receipt));
  const identity = { bytes: bytes.length, sha256: sha256(bytes), persistenceAcknowledged: false };
  const rootHandle = await registry.openVerifiedRootHandle();
  let handle = null;
  try {
    handle = await registry.fs.open(
      governanceDescriptorPath(rootHandle, EXECUTION_RECEIPT_FILENAME),
      fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
      0o600
    );
    await handle.writeFile(bytes);
    await handle.sync();
    injectIsolatedTestFault('receipt_write_acknowledgement_lost');
    await rootHandle.sync();
    const observed = Buffer.alloc(bytes.length);
    const readback = await handle.read(observed, 0, bytes.length, 0);
    if (readback.bytesRead !== bytes.length || !observed.equals(bytes)) {
      throw new Error('cm2126_execution_receipt_readback_mismatch');
    }
    identity.persistenceAcknowledged = true;
    return identity;
  } catch (error) {
    error.cm2126PartialReceiptIdentity = { ...identity };
    throw error;
  } finally {
    if (handle) await handle.close().catch(() => {});
    await rootHandle.close().catch(() => {});
  }
}

async function readVerifiedGovernanceFile(
  receiptPath,
  fileSystem = fsPromises,
  invalidCode = 'cm2126_execution_receipt_invalid'
) {
  let handle = null;
  try {
    const pathStat = await fileSystem.lstat(receiptPath);
    if (!pathStat.isFile() || pathStat.isSymbolicLink()) throw new Error('invalid');
    handle = await fileSystem.open(
      receiptPath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const descriptorStat = await handle.stat();
    if (!descriptorStat.isFile() || descriptorStat.dev !== pathStat.dev || descriptorStat.ino !== pathStat.ino) {
      throw new Error('invalid');
    }
    return Buffer.from(await handle.readFile());
  } catch (error) {
    const wrapped = new Error(invalidCode);
    if (error?.code) wrapped.code = error.code;
    throw wrapped;
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

async function readExternalReceipt(registry) {
  const rootHandle = await registry.openVerifiedRootHandle();
  let receiptHandle = null;
  try {
    receiptHandle = await registry.fs.open(
      governanceDescriptorPath(rootHandle, EXECUTION_RECEIPT_FILENAME),
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
    );
    const stat = await receiptHandle.stat();
    if (!stat.isFile()) throw new Error('cm2126_execution_receipt_invalid');
    const bytes = Buffer.from(await receiptHandle.readFile());
    return { receipt: JSON.parse(bytes.toString('utf8')), bytes, sha256: sha256(bytes) };
  } finally {
    if (receiptHandle) await receiptHandle.close().catch(() => {});
    await rootHandle.close().catch(() => {});
  }
}

function successfulRuntimeResult({ target, beforeSnapshot, afterSnapshot, beforeOtherRefs, afterOtherRefs }) {
  return {
    targetWorktreeIdentitySha256: target.publicIdentity.identitySha256,
    targetRefBefore: beforeSnapshot.ref,
    targetRefAfter: afterSnapshot.ref,
    targetHeadBefore: beforeSnapshot.head,
    targetHeadAfter: afterSnapshot.head,
    targetSymbolicRefBefore: beforeSnapshot.symbolicRef,
    targetSymbolicRefAfter: afterSnapshot.symbolicRef,
    targetIndexTreeBefore: beforeSnapshot.indexTree,
    targetIndexTreeAfter: afterSnapshot.indexTree,
    targetIndexPolicyMatchedBefore: beforeSnapshot.indexPolicyMatched,
    targetIndexPolicyMatchedAfter: afterSnapshot.indexPolicyMatched,
    targetIndexLockAbsentBefore: beforeSnapshot.indexLockAbsent,
    targetIndexLockAbsentAfter: afterSnapshot.indexLockAbsent,
    beforeBlobMatches: beforeSnapshot.matchedFiles,
    afterBlobMatches: afterSnapshot.matchedFiles,
    targetWorktreeCleanBefore: beforeSnapshot.clean,
    targetWorktreeCleanAfter: afterSnapshot.clean,
    branchRefCasAttempts: 1,
    branchRefUpdates: 1,
    targetIndexSyncAttempts: 1,
    targetIndexSynchronizations: 1,
    targetFileSyncAttempts: 1,
    targetFileWriteSlotsConsumed: 9,
    targetFileSynchronizations: 9,
    verificationAttempts: 1,
    otherRefsSnapshotBeforeSha256: beforeOtherRefs,
    otherRefsSnapshotAfterSha256: afterOtherRefs,
    otherRefUpdates: beforeOtherRefs === afterOtherRefs ? 0 : 1
  };
}

function safeReentryRuntimeObservation(repoRoot, target, targetBindings, envelope, storedReceipt = null) {
  const stored = storedReceipt?.payload?.executionResult || {};
  try {
    const after = targetSnapshot(repoRoot, target, targetBindings, 'after');
    const otherRefs = otherRefsSnapshotSha256(repoRoot);
    return {
      targetWorktreeIdentitySha256: target.publicIdentity.identitySha256,
      targetRefBefore: stored.targetRefBefore || EXPECTED_OLD,
      targetRefAfter: after.ref,
      targetHeadBefore: stored.targetHeadBefore || EXPECTED_OLD,
      targetHeadAfter: after.head,
      targetSymbolicRefBefore: stored.targetSymbolicRefBefore || TARGET_REF,
      targetSymbolicRefAfter: after.symbolicRef,
      targetIndexTreeBefore: stored.targetIndexTreeBefore || EXPECTED_OLD_TREE,
      targetIndexTreeAfter: after.indexTree,
      targetIndexPolicyMatchedBefore: stored.targetIndexPolicyMatchedBefore ?? true,
      targetIndexPolicyMatchedAfter: after.indexPolicyMatched,
      targetIndexLockAbsentBefore: stored.targetIndexLockAbsentBefore ?? true,
      targetIndexLockAbsentAfter: after.indexLockAbsent,
      beforeBlobMatches: stored.beforeBlobMatches ?? 9,
      afterBlobMatches: after.matchedFiles,
      targetWorktreeCleanBefore: stored.targetWorktreeCleanBefore ?? true,
      targetWorktreeCleanAfter: after.clean,
      branchRefCasAttempts: envelope?.branchRefCasAttempts ?? null,
      branchRefUpdates: envelope?.branchRefUpdates ?? null,
      targetIndexSyncAttempts: envelope?.targetIndexSyncAttempts ?? null,
      targetIndexSynchronizations: envelope?.targetIndexSynchronizations ?? null,
      targetFileSyncAttempts: envelope?.targetFileSyncAttempts ?? null,
      targetFileWriteSlotsConsumed: envelope?.targetFileWriteSlotsConsumed ?? null,
      targetFileSynchronizations: envelope?.targetFileSynchronizations ?? null,
      verificationAttempts: envelope?.verificationAttempts ?? null,
      otherRefsSnapshotBeforeSha256: stored.otherRefsSnapshotBeforeSha256 || otherRefs,
      otherRefsSnapshotAfterSha256: otherRefs,
      otherRefUpdates: stored.otherRefsSnapshotBeforeSha256 && stored.otherRefsSnapshotBeforeSha256 !== otherRefs ? 1 : 0
    };
  } catch {
    return null;
  }
}

async function existingClaimResult({ existing, bindingHash, repoRoot, target, targetBindings,
  packetEvidence, finalReleaseEvidence, registry }) {
  let storedReceipt = null;
  let successReceiptAccepted = false;
  if (existing.state === SUCCESS_STATE) {
    try {
      const external = await readExternalReceipt(registry);
      if (external.sha256 === existing.envelope?.executionReceiptSha256) {
        storedReceipt = external.receipt;
        const candidateRuntime = safeReentryRuntimeObservation(
          repoRoot,
          target,
          targetBindings,
          existing.envelope,
          storedReceipt
        );
        const preReceiptClaim = {
          ...existing.envelope,
          state: 'EXECUTION_RECEIPT_WRITE_CONSUMED',
          executionReceiptWrites: null,
          executionReceiptSha256: null,
          terminalStateDurablyRecorded: false,
          reconciliationRequired: true
        };
        successReceiptAccepted = evaluateExecutionReceipt(storedReceipt, {
          packetEvidence,
          finalReleaseEvidence,
          claimEnvelope: preReceiptClaim,
          bindingHash,
          runtimeResult: candidateRuntime
        }).accepted;
      }
    } catch {
      storedReceipt = null;
      successReceiptAccepted = false;
    }
  }
  const runtimeObservation = safeReentryRuntimeObservation(
    repoRoot,
    target,
    targetBindings,
    existing.envelope,
    storedReceipt
  );
  const reconciliationReceipt = buildReentryReceipt({
    existing,
    bindingHash,
    runtimeObservation,
    packetEvidence,
    finalReleaseEvidence,
    successReceiptAccepted
  });
  const evaluation = evaluateReentryReceipt(reconciliationReceipt, {
    existing,
    bindingHash,
    runtimeObservation,
    packetEvidence,
    finalReleaseEvidence,
    successReceiptAccepted
  });
  if (!evaluation.accepted) throw new Error(`cm2126_reentry_receipt_rejected:${evaluation.blockers.join(',')}`);
  const durableSuccess = reconciliationReceipt.payload.branchRefUpdated === true &&
    reconciliationReceipt.payload.currentBranchStatusSynchronized === true &&
    reconciliationReceipt.payload.successReceiptAccepted === true &&
    reconciliationReceipt.payload.runtimeSuccessPostconditionsObserved === true;
  return {
    accepted: false,
    state: existing.state,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    branchRefUpdated: reconciliationReceipt.payload.branchRefUpdated,
    targetWorktreeIndexSynchronized: durableSuccess,
    targetWorktreeFilesSynchronized: durableSuccess,
    executionReceiptCreated: durableSuccess,
    statusSyncPerformed: durableSuccess,
    currentBranchStatusSynchronized: reconciliationReceipt.payload.currentBranchStatusSynchronized,
    fullPlanPackCompleted: durableSuccess,
    reconciliationReceipt,
    readinessClaimed: false
  };
}

async function terminalizeFailure({ registry, bindingHash, release, state, repoRoot, target, targetBindings,
  governanceRoot, knownBranchCasInvocationCount = null, branchCasReturnedSuccess = false,
  indexSyncReturnedSuccess = false, knownFileSynchronizations = null }) {
  let current = null;
  try { current = await registry.read(bindingHash, release); } catch { return; }
  if (current.state === SUCCESS_STATE || current.terminalStateDurablyRecorded === true) return;
  const durableState = current.state;
  const after = (() => {
    try { return targetSnapshot(repoRoot, target, targetBindings, 'after'); } catch { return null; }
  })();
  const before = (() => {
    try { return targetSnapshot(repoRoot, target, targetBindings, 'before'); } catch { return null; }
  })();
  const observedRef = after?.ref ?? before?.ref ?? null;
  const observedIndexTree = after?.indexTree === NEW_TREE ? NEW_TREE :
    (before?.indexTree === EXPECTED_OLD_TREE ? EXPECTED_OLD_TREE : null);
  const observedMatchedFiles = (observedIndexTree === NEW_TREE || observedRef === NEW_COMMIT ?
    after?.matchedFiles : before?.matchedFiles) ?? null;
  const completedFileSynchronizations = current.targetFileSynchronizations === 9 ? 9 :
    (current.targetFileSyncAttempts === 0 ? 0 :
      (Number.isInteger(knownFileSynchronizations) && knownFileSynchronizations >= 0 &&
        knownFileSynchronizations <= 9 ? knownFileSynchronizations : null));
  const observedClean = after?.clean ?? before?.clean ?? null;
  let terminal = 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS';
  if (durableState === 'CLAIMED') {
    terminal = 'CONSUMED_FAILED_PRE_CAS';
  } else if (durableState === 'BRANCH_REF_CAS_CONSUMED') {
    terminal = branchCasReturnedSuccess ? 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS' :
      (knownBranchCasInvocationCount === 0 ? 'CONSUMED_FAILED_PRE_CAS' : 'CONSUMED_AMBIGUOUS_CAS');
  } else if (durableState === 'EXECUTION_RECEIPT_WRITE_CONSUMED') {
    terminal = 'CONSUMED_EXECUTION_RECEIPT_AMBIGUOUS';
  }
  else if (after && after.ref === NEW_COMMIT) terminal = 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL';
  let receiptWrites = current.executionReceiptWrites;
  let receiptSha256 = current.executionReceiptSha256;
  if (current.executionReceiptWriteAttempts === 1) {
    try {
      const { bytes } = await readExternalReceipt(registry);
      receiptWrites = 1;
      receiptSha256 = sha256(bytes);
    } catch (error) {
      receiptWrites = error.code === 'ENOENT' ? 0 : null;
      receiptSha256 = null;
    }
  }
  const details = {
    branchCasInvocationCount: Number.isInteger(knownBranchCasInvocationCount) ?
      knownBranchCasInvocationCount : current.branchCasInvocationCount,
    branchRefUpdates: branchCasReturnedSuccess ? 1 : (durableState === 'CLAIMED' ? 0 :
      (durableState === 'BRANCH_REF_CAS_CONSUMED' ?
        (knownBranchCasInvocationCount === 0 ? 0 : null) : current.branchRefUpdates)),
    targetIndexSynchronizations: indexSyncReturnedSuccess || current.targetIndexSynchronizations === 1 ? 1 :
      (current.targetIndexSyncAttempts === 0 ? 0 :
        (observedIndexTree === NEW_TREE ? 1 : (observedIndexTree === EXPECTED_OLD_TREE ? 0 : null))),
    targetFileSynchronizations: completedFileSynchronizations,
    executionReceiptWrites: receiptWrites,
    executionReceiptSha256: receiptSha256,
    targetRefObserved: observedRef,
    targetIndexTreeObserved: observedIndexTree,
    targetFilesMatchedCount: observedMatchedFiles,
    targetWorktreeCleanObserved: observedClean
  };
  await registry.transition(bindingHash, durableState, terminal, details, release).catch(() => {});
}

async function executeBranchCasFromCommits(inputs = {}) {
  const exactKeys = ['contentDecisionCommit', 'finalReleaseCommit', 'packetCommit'];
  if (!inputs || typeof inputs !== 'object' || !sameJson(Object.keys(inputs).sort(), exactKeys)) {
    throw new Error('cm2126_exact_three_commit_inputs_required');
  }
  const { contentDecisionCommit, packetCommit, finalReleaseCommit } = inputs;
  assertSafeGitEnvironment();
  if (contentDecisionCommit !== CONTENT_DECISION_FREEZE.commit || !/^[a-f0-9]{40}$/.test(packetCommit || '') ||
      !/^[a-f0-9]{40}$/.test(finalReleaseCommit || '')) {
    throw new Error('cm2126_exact_three_commit_inputs_required');
  }
  const options = realResolverOptions();
  const initialTarget = deriveTargetWorktree(process.cwd());
  let packetEvidence = intakeExecutionPacket({
    packetCommit,
    targetWorktreeIdentity: initialTarget.publicIdentity,
    ...options
  });
  if (!packetEvidence.accepted) throw new Error(`cm2126_packet_rejected:${packetEvidence.blockers.join(',')}`);
  let frozenRelease;
  try {
    frozenRelease = JSON.parse(options.resolveGitFile(finalReleaseCommit, FINAL_RELEASE_PATH).content.toString('utf8'));
  } catch {
    throw new Error('cm2126_final_release_unreadable');
  }
  const staticIntakeTime = new Date(Date.parse(frozenRelease.payload?.authorization?.approvedAt || '') + 1);
  let finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now: staticIntakeTime,
    ...options
  });
  if (!finalReleaseEvidence.accepted) {
    throw new Error(`cm2126_final_release_rejected:${finalReleaseEvidence.blockers.join(',')}`);
  }
  const { repoRoot, target } = assertExecutionRuntime({ packetEvidence, finalReleaseEvidence });
  const targetBindings = packetEvidence.packet.payload.exactCasBoundary.targetBindings;
  const governanceRoot = resolveFixedGovernanceRoot(repoRoot);
  const registry = new Cm2126ExactBranchCasClaimRegistry({ governanceRoot });
  let bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  let release = releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash);

  const existing = await registry.inspectExisting(bindingHash, release);
  if (existing.claimEnvelopePresent) {
    return existingClaimResult({
      existing,
      bindingHash,
      repoRoot,
      target,
      targetBindings,
      packetEvidence,
      finalReleaseEvidence,
      registry
    });
  }

  finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now: new Date(),
    ...options
  });
  if (!finalReleaseEvidence.accepted) {
    throw new Error(`cm2126_final_release_not_active:${finalReleaseEvidence.blockers.join(',')}`);
  }
  release = releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash);

  const beforeSnapshot = verifyTargetOldPreflight(repoRoot, target, targetBindings);
  const beforeOtherRefs = otherRefsSnapshotSha256(repoRoot);
  assertPreclaimEffectPathsAbsent(governanceRoot, target.path, targetBindings);

  packetEvidence = intakeExecutionPacket({
    packetCommit,
    targetWorktreeIdentity: target.publicIdentity,
    ...options
  });
  finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now: new Date(),
    ...options
  });
  if (!packetEvidence.accepted || !finalReleaseEvidence.accepted || !intakeContentDecision(options).accepted) {
    throw new Error('cm2126_immediate_preclaim_upstream_revalidation_failed');
  }
  const immediateHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  if (immediateHash !== bindingHash) throw new Error('cm2126_preclaim_binding_drift');
  bindingHash = immediateHash;
  release = releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash);

  const claimAttempt = await claimWithDurableRaceReentry({ registry, bindingHash, release });
  if (claimAttempt.existing) {
    return existingClaimResult({
      existing: claimAttempt.existing,
      bindingHash,
      repoRoot,
      target,
      targetBindings,
      packetEvidence,
      finalReleaseEvidence,
      registry
    });
  }
  let claim = claimAttempt.claim;
  let state = claim.state;
  let runtimeResult = null;
  let receiptIdentity = null;
  let branchCasInvocationCount = 0;
  let branchCasReturnedSuccess = false;
  let indexSyncReturnedSuccess = false;
  let knownFileSynchronizations = null;
  try {
    verifyTargetOldPreflight(repoRoot, target, targetBindings);
    if (otherRefsSnapshotSha256(repoRoot) !== beforeOtherRefs) throw new Error('cm2126_pre_effect_other_ref_drift');

    claim = await registry.transition(bindingHash, state, 'BRANCH_REF_CAS_CONSUMED', {
      branchCasInvocationCount: null,
      branchRefCasAttempts: 1,
      branchRefUpdates: null
    }, release);
    state = claim.state;
    branchCasInvocationCount = 1;
    try {
      gitBuffer(['update-ref', '--no-deref', TARGET_REF, NEW_COMMIT, EXPECTED_OLD], { cwd: repoRoot });
      injectIsolatedTestFault('branch_cas_acknowledgement_lost');
      branchCasReturnedSuccess = true;
    } catch (error) {
      const observed = targetRefOid(repoRoot);
      const failure = classifyBranchCasCommandFailure(observed);
      await registry.transition(bindingHash, state, failure.state, failure.details, release).catch(() => {});
      throw error;
    }
    injectIsolatedTestFault('branch_ref_postcheck_failure');
    const refOnlySnapshot = targetSnapshot(repoRoot, target, targetBindings, 'before');
    const refOnlyAfterMatches = targetSnapshot(repoRoot, target, targetBindings, 'after').matchedFiles;
    if (refOnlySnapshot.ref !== NEW_COMMIT || refOnlySnapshot.head !== NEW_COMMIT ||
        refOnlySnapshot.symbolicRef !== TARGET_REF || refOnlySnapshot.indexTree !== EXPECTED_OLD_TREE ||
        refOnlySnapshot.matchedFiles !== 9 || refOnlyAfterMatches !== 0 ||
        otherRefsSnapshotSha256(repoRoot) !== beforeOtherRefs) {
      throw new Error('cm2126_ref_cas_postcondition_failed');
    }
    claim = await registry.transition(bindingHash, state, 'BRANCH_REF_UPDATED', {
      branchCasInvocationCount: 1,
      branchRefUpdates: 1,
      targetRefObserved: NEW_COMMIT,
      targetIndexTreeObserved: EXPECTED_OLD_TREE,
      targetFilesMatchedCount: 0,
      targetWorktreeCleanObserved: false
    }, release);
    state = claim.state;

    if (process.env.NODE_ENV === 'test' && process.env.CM2126_ISOLATED_TEST_FIXTURE === '1' &&
        process.cwd().includes('cm2126-cas-e2e-') &&
        process.env.CM2126_TEST_FAULT_POINT === 'index_preclaim_external_sync_failure') {
      await synchronizeExactIndexEntries(target.path, targetBindings, repoRoot, beforeOtherRefs);
      injectIsolatedTestFault('index_preclaim_external_sync_failure');
    }

    claim = await registry.transition(bindingHash, state, 'TARGET_INDEX_SYNC_CONSUMED', {
      targetIndexSyncAttempts: 1,
      targetIndexSynchronizations: null
    }, release);
    state = claim.state;
    const immediateIndexSnapshot = targetSnapshot(repoRoot, target, targetBindings, 'before');
    if (immediateIndexSnapshot.ref !== NEW_COMMIT || immediateIndexSnapshot.head !== NEW_COMMIT ||
        immediateIndexSnapshot.symbolicRef !== TARGET_REF ||
        immediateIndexSnapshot.indexTree !== EXPECTED_OLD_TREE || immediateIndexSnapshot.matchedFiles !== 9 ||
        immediateIndexSnapshot.indexPolicyMatched !== true) {
      throw new Error('cm2126_index_pre_effect_drift');
    }
    await synchronizeExactIndexEntries(target.path, targetBindings, repoRoot, beforeOtherRefs);
    indexSyncReturnedSuccess = true;
    if (!indexMatchesCommit(target.path, NEW_COMMIT) || !exactIndexPolicyMatched(target.path) ||
        optionalGitText(['symbolic-ref', '-q', 'HEAD'], { cwd: target.path }) !== TARGET_REF ||
        targetRefOid(repoRoot) !== NEW_COMMIT ||
        otherRefsSnapshotSha256(repoRoot) !== beforeOtherRefs) throw new Error('cm2126_index_sync_postcondition_failed');
    claim = await registry.transition(bindingHash, state, 'TARGET_INDEX_SYNCHRONIZED', {
      targetIndexSynchronizations: 1,
      targetIndexTreeObserved: NEW_TREE
    }, release);
    state = claim.state;

    claim = await registry.transition(bindingHash, state, 'TARGET_FILES_SYNC_CONSUMED', {
      targetFileSyncAttempts: 1,
      targetFileWriteSlotsConsumed: 9,
      targetFileSynchronizations: null
    }, release);
    state = claim.state;
    try {
      knownFileSynchronizations = await syncTargetFiles(
        target.path,
        targetBindings,
        options,
        repoRoot,
        beforeOtherRefs
      );
    } catch (error) {
      knownFileSynchronizations = error.cm2126TargetFileSynchronizations ?? null;
      throw error;
    }
    claim = await registry.transition(bindingHash, state, 'TARGET_FILES_SYNCHRONIZED', {
      targetFileSynchronizations: knownFileSynchronizations,
      targetFilesMatchedCount: 9
    }, release);
    state = claim.state;

    const afterSnapshot = targetSnapshot(repoRoot, target, targetBindings, 'after');
    const afterOtherRefs = otherRefsSnapshotSha256(repoRoot);
    runtimeResult = successfulRuntimeResult({
      target,
      beforeSnapshot,
      afterSnapshot,
      beforeOtherRefs,
      afterOtherRefs
    });
    if (!exactRuntimeSuccess(runtimeResult)) throw new Error('cm2126_final_runtime_postcondition_failed');
    claim = await registry.transition(bindingHash, state, 'VERIFICATION_CONSUMED', {
      verificationAttempts: 1,
      targetRefObserved: NEW_COMMIT,
      targetIndexTreeObserved: NEW_TREE,
      targetFilesMatchedCount: 9,
      targetWorktreeCleanObserved: true
    }, release);
    state = claim.state;

    const receiptPacketEvidence = intakeExecutionPacket({
      packetCommit,
      targetWorktreeIdentity: target.publicIdentity,
      ...options
    });
    const receiptContentEvidence = intakeContentDecision(options);
    const receiptFinalReleaseEvidence = intakeFinalReleaseDecision({
      finalReleaseCommit,
      packetEvidence: receiptPacketEvidence,
      now: claimBoundReviewTime(claim),
      ...options
    });
    const receiptBindingHash = buildClaimBindingHash({
      packetEvidence: receiptPacketEvidence,
      finalReleaseEvidence: receiptFinalReleaseEvidence
    });
    if (!receiptPacketEvidence.accepted || !receiptContentEvidence.accepted ||
        !receiptFinalReleaseEvidence.accepted || receiptBindingHash !== bindingHash) {
      throw new Error('cm2126_receipt_time_upstream_git_revalidation_failed');
    }
    packetEvidence = receiptPacketEvidence;
    finalReleaseEvidence = receiptFinalReleaseEvidence;
    release = releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash);

    claim = await registry.transition(bindingHash, state, 'EXECUTION_RECEIPT_WRITE_CONSUMED', {
      executionReceiptWriteAttempts: 1,
      executionReceiptWrites: null,
      targetRefObserved: NEW_COMMIT,
      targetIndexTreeObserved: NEW_TREE,
      targetFilesMatchedCount: 9,
      targetWorktreeCleanObserved: true
    }, release);
    state = claim.state;
    const receiptTimeSnapshot = targetSnapshot(repoRoot, target, targetBindings, 'after');
    const receiptTimeOtherRefs = otherRefsSnapshotSha256(repoRoot);
    runtimeResult = successfulRuntimeResult({
      target,
      beforeSnapshot,
      afterSnapshot: receiptTimeSnapshot,
      beforeOtherRefs,
      afterOtherRefs: receiptTimeOtherRefs
    });
    if (!exactRuntimeSuccess(runtimeResult)) throw new Error('cm2126_receipt_time_runtime_postcondition_failed');
    const receipt = buildExecutionReceipt({
      packetEvidence,
      finalReleaseEvidence,
      claimEnvelope: claim,
      bindingHash,
      runtimeResult
    });
    const receiptEvaluation = evaluateExecutionReceipt(receipt, {
      packetEvidence,
      finalReleaseEvidence,
      claimEnvelope: claim,
      bindingHash,
      runtimeResult
    });
    if (!receiptEvaluation.accepted) {
      throw new Error(`cm2126_execution_receipt_rejected:${receiptEvaluation.blockers.join(',')}`);
    }
    try {
      receiptIdentity = await writeExternalReceipt(registry, receipt);
    } catch (error) {
      receiptIdentity = error.cm2126PartialReceiptIdentity || null;
      throw error;
    }
    const postReceiptSnapshot = targetSnapshot(repoRoot, target, targetBindings, 'after');
    const postReceiptRuntimeResult = successfulRuntimeResult({
      target,
      beforeSnapshot,
      afterSnapshot: postReceiptSnapshot,
      beforeOtherRefs,
      afterOtherRefs: otherRefsSnapshotSha256(repoRoot)
    });
    if (!exactRuntimeSuccess(postReceiptRuntimeResult) || !sameJson(postReceiptRuntimeResult, runtimeResult)) {
      throw new Error('cm2126_post_receipt_runtime_postcondition_failed');
    }
    claim = await registry.transition(bindingHash, state, SUCCESS_STATE, {
      executionReceiptWrites: 1,
      executionReceiptSha256: receiptIdentity.sha256,
      targetRefObserved: NEW_COMMIT,
      targetIndexTreeObserved: NEW_TREE,
      targetFilesMatchedCount: 9,
      targetWorktreeCleanObserved: true
    }, release);
    return {
      accepted: true,
      state: claim.state,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      branchRefUpdated: true,
      targetWorktreeIndexSynchronized: true,
      targetWorktreeFilesSynchronized: true,
      executionReceiptCreated: true,
      executionReceiptSha256: claim.executionReceiptSha256,
      statusSyncPerformed: true,
      currentBranchStatusSynchronized: true,
      fullPlanPackCompleted: true,
      readinessClaimed: false
    };
  } catch (error) {
    if (!String(state).startsWith('CONSUMED_') && state !== SUCCESS_STATE) {
      await terminalizeFailure({
        registry,
        bindingHash,
        release,
        state,
        repoRoot,
        target,
        targetBindings,
        governanceRoot,
        knownBranchCasInvocationCount: branchCasInvocationCount,
        branchCasReturnedSuccess,
        indexSyncReturnedSuccess,
        knownFileSynchronizations
      });
    }
    const observed = await registry.inspectExisting(bindingHash, release);
    if (observed.claimEnvelopePresent) {
      return existingClaimResult({
        existing: observed,
        bindingHash,
        repoRoot,
        target,
        targetBindings,
        packetEvidence,
        finalReleaseEvidence,
        registry
      });
    }
    throw error;
  }
}

async function evaluateDurableBranchCas({ contentDecisionCommit, packetCommit, finalReleaseCommit }) {
  assertSafeGitEnvironment();
  if (contentDecisionCommit !== CONTENT_DECISION_FREEZE.commit) {
    return { accepted: false, blockers: ['durable.exactContentDecisionRequired'] };
  }
  const options = realResolverOptions();
  const target = deriveTargetWorktree(process.cwd());
  const packetEvidence = intakeExecutionPacket({
    packetCommit,
    targetWorktreeIdentity: target.publicIdentity,
    ...options
  });
  if (!packetEvidence.accepted) return { accepted: false, blockers: ['durable.packetIntake'] };
  let frozenRelease;
  try {
    frozenRelease = JSON.parse(options.resolveGitFile(finalReleaseCommit, FINAL_RELEASE_PATH).content.toString('utf8'));
  } catch {
    return { accepted: false, blockers: ['durable.finalReleaseUnreadable'] };
  }
  const reviewTime = new Date(Date.parse(frozenRelease.payload?.authorization?.approvedAt || '') + 1);
  const finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now: reviewTime,
    ...options
  });
  if (!finalReleaseEvidence.accepted) return { accepted: false, blockers: ['durable.finalReleaseIntake'] };
  const bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  const release = releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash);
  const governanceRoot = resolveFixedGovernanceRoot(process.cwd());
  const registry = new Cm2126ExactBranchCasClaimRegistry({ governanceRoot });
  const blockers = [];
  try {
    const claim = await registry.read(bindingHash, release);
    if (claim.state !== SUCCESS_STATE || claim.branchRefUpdates !== 1 ||
        claim.targetIndexSynchronizations !== 1 || claim.targetFileSynchronizations !== 9) {
      blockers.push('durable.claimState');
    }
    const external = await readExternalReceipt(registry);
    if (external.sha256 !== claim.executionReceiptSha256) blockers.push('durable.receiptHash');
    const runtimeResult = safeReentryRuntimeObservation(
      process.cwd(),
      target,
      packetEvidence.packet.payload.exactCasBoundary.targetBindings,
      claim,
      external.receipt
    );
    const preReceiptClaim = { ...claim, state: 'EXECUTION_RECEIPT_WRITE_CONSUMED', executionReceiptWrites: null,
      executionReceiptSha256: null, terminalStateDurablyRecorded: false, reconciliationRequired: true };
    const receiptEvaluation = evaluateExecutionReceipt(external.receipt, {
      packetEvidence,
      finalReleaseEvidence,
      claimEnvelope: preReceiptClaim,
      bindingHash,
      runtimeResult
    });
    if (!receiptEvaluation.accepted) blockers.push(...receiptEvaluation.blockers.map(item => `durable.${item}`));
  } catch {
    blockers.push('durable.evidenceUnreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    branchRefUpdated: blockers.length === 0,
    currentBranchStatusSynchronized: blockers.length === 0,
    readinessClaimed: false
  };
}

module.exports = {
  ACTION,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  FINAL_RELEASE_APPROVED_AT,
  FINAL_RELEASE_DIFF_ENTRIES,
  FINAL_RELEASE_DIFF_PATHS,
  FINAL_RELEASE_EXPIRES_AT,
  FINAL_RELEASE_MARKDOWN_PATH,
  FINAL_RELEASE_PATH,
  FINAL_RELEASE_TASK_ID,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  PACKET_DIFF_ENTRIES,
  PACKET_DIFF_PATHS,
  PACKET_MARKDOWN_PATH,
  PACKET_PATH,
  TASK_ID,
  buildClaimBindingHash,
  buildExecutionPacket,
  buildFinalReleaseDecision,
  claimBoundReviewTime,
  claimWithDurableRaceReentry,
  buildTargetBindings,
  classifyBranchCasCommandFailure,
  deriveTargetWorktree,
  evaluateDurableBranchCas,
  evaluateExecutionPacket,
  evaluateFinalReleaseDecision,
  executeBranchCasFromCommits,
  intakeContentDecision,
  intakeExecutionPacket,
  intakeFinalReleaseDecision,
  isMachineBoundContentDecision,
  isMachineBoundExecutionPacket,
  isMachineBoundFinalReleaseDecision,
  isMachineBoundReleaseBinding,
  parseWorktreeList,
  realResolverOptions,
  readVerifiedGovernanceFile,
  releaseBinding,
  resolveFixedGovernanceRoot,
  targetSnapshot,
  verifyTargetOldPreflight,
  wrapPayload
};
