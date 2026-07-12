'use strict';

const {
  APPLICATION_DIFF_ENTRIES,
  APPLICATION_DIFF_PATHS,
  CONTENT_DECISION_FREEZE,
  evaluateDurableApplicationBinding,
  intakeExecutionPacket,
  intakeFinalReleaseDecision
} = require('./Cm2118FullPlanApplicationExecution');
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
  APPLICATION_COMMIT,
  APPLICATION_TREE,
  BINDING_HASH,
  FINAL_RELEASE_COMMIT,
  PACKET_COMMIT,
  RECEIPTS
} = require('../../scripts/freeze-cm2120-full-plan-application-receipts');

const TASK_ID = 'CM-2120';
const FREEZE_COMMIT = '727e812861a7b856f10fb242c62e15b638a982d8';
const FREEZE_TREE = 'e1f190c8f2fac022f7efc97f58897bcd5db110e0';
const FREEZE_PARENT_COMMIT = '13ce4d9ccf3c5367381a90280b20b81bf78dce39';
const FREEZE_PARENT_TREE = '0c86ccf6322fa25e3109a61bbc1f621de8439e2a';
const REVIEW_PATH = 'docs/near-model-memory-plan-pack/cm2120_full_plan_application_receipt_review_decision.json';
const REVIEW_MARKDOWN_PATH = REVIEW_PATH.replace(/\.json$/, '.md');

const FROZEN_RECEIPTS = Object.freeze([
  Object.freeze({
    ...RECEIPTS[0],
    blobOid: '0b0ecabc4daba8a275487f541f45613fdca9322d',
    markdownBlobOid: '7c3d1a5d8a3f1a19835444e09e4ed66d153b9783',
    markdownBytes: 8493,
    markdownSha256: 'aa3ae589cf2de279ba27a67b84c72bb4f6a14b849dde205bd1e87584ab992e4d'
  }),
  Object.freeze({
    ...RECEIPTS[1],
    blobOid: '8378bae1c06d084bd4b5386c4a625b0b4a319b36',
    markdownBlobOid: 'b4f8d64b0a925698a08ca16aba47af1253721965',
    markdownBytes: 8058,
    markdownSha256: 'de8fbbb88e52a3b72475a4da30d61ecb9dd5a265d10d49fb3a6b4d8329fe41a6'
  })
]);

const FREEZE_DIFF_PATHS = Object.freeze(FROZEN_RECEIPTS
  .flatMap(item => [item.outputPath, item.markdownPath])
  .sort());
const FREEZE_DIFF_ENTRIES = Object.freeze(FREEZE_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })));
const READINESS_FIELDS = Object.freeze([
  'completeRealtimeMemory', 'completeRealtimeMemoryClaimed', 'completeV8', 'completeV8Claimed',
  'cutoverReady', 'cutoverReadyClaimed', 'deployReady', 'deployReadyClaimed',
  'fullBridgeCompletion', 'fullBridgeCompletionClaimed', 'fullPlanPackCompletedClaimed',
  'fullRealtimeMemory', 'fullRealtimeMemoryClaimed', 'modelMemoryComplete', 'modelMemoryCompleteClaimed',
  'productionReady', 'productionReadyClaimed', 'rcReady', 'rcReadyClaimed',
  'readinessClaimed', 'releaseReady', 'releaseReadyClaimed'
]);

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

function validateReceiptIdentity(actual, expected, blockers, label) {
  if (!actual || actual.sourceCommit !== FREEZE_COMMIT || actual.sourceTree !== FREEZE_TREE ||
      actual.sourcePath !== expected.outputPath || actual.gitMode !== '100644' ||
      actual.gitObjectType !== 'blob' || actual.blobOid !== expected.blobOid ||
      actual.bytes !== expected.bytes || actual.sha256 !== expected.rawSha256 ||
      !Buffer.isBuffer(actual.content) || gitBlobOid(actual.content) !== expected.blobOid ||
      sha256(actual.content) !== expected.rawSha256) blockers.push(`${label}.gitIdentity`);
}

function validateMarkdownIdentity(actual, expected, jsonIdentity, blockers, label) {
  if (!actual || actual.sourceCommit !== FREEZE_COMMIT || actual.sourceTree !== FREEZE_TREE ||
      actual.sourcePath !== expected.markdownPath || actual.gitMode !== '100644' ||
      actual.gitObjectType !== 'blob' || actual.blobOid !== expected.markdownBlobOid ||
      actual.bytes !== expected.markdownBytes || actual.sha256 !== expected.markdownSha256 ||
      !Buffer.isBuffer(actual.content) || gitBlobOid(actual.content) !== expected.markdownBlobOid ||
      sha256(actual.content) !== expected.markdownSha256 ||
      !actual.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
    blockers.push(`${label}.markdownIdentity`);
  }
}

function validateReceiptPayload(receipt, expected, blockers, label) {
  if (receipt.schemaVersion !== 1 || receipt.taskId !== 'CM-2118' ||
      receipt.artifactType !== expected.artifactType ||
      receipt.canonicalPayloadSha256 !== expected.payloadSha256 ||
      sha256Canonical(receipt.payload || {}) !== expected.payloadSha256) blockers.push(`${label}.payloadIdentity`);
  if (receipt.payload?.application?.commit !== APPLICATION_COMMIT ||
      receipt.payload?.application?.tree !== APPLICATION_TREE ||
      receipt.payload?.application?.parentCommit !== CONTENT_DECISION_FREEZE.commit ||
      receipt.payload?.application?.parentTree !== CONTENT_DECISION_FREEZE.tree) blockers.push(`${label}.application`);
  const registry = receipt.payload?.registry || {};
  if (registry.bindingHash !== BINDING_HASH || registry.authorizationUseCount !== 1 ||
      registry.authorizationConsumed !== true || registry.authorizationReplayAllowed !== false ||
      registry.patchInvocationCount !== 1 || registry.finalStateRequired !== 'CONSUMED_SUCCESS') {
    blockers.push(`${label}.oneShotRegistry`);
  }
  const state = receipt.payload?.candidateState || receipt.payload?.appliedState || {};
  if (state.statusSyncPerformed !== false ||
      !sameJson(Object.keys(state.readiness || {}).sort(), [...READINESS_FIELDS].sort()) ||
      Object.values(state.readiness || {}).some(value => value !== false)) blockers.push(`${label}.readinessBoundary`);
  const effects = receipt.payload?.sideEffects || {};
  if (effects.repositoryPatches !== 1 || effects.applicationCommits !== 1 ||
      ['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']
        .some(field => effects[field] !== 0)) blockers.push(`${label}.sideEffects`);
}

function evaluateFrozenReceiptSet(options = {}) {
  const blockers = [];
  if (!validResolvers(options)) return { accepted: false, blockers: ['frozenReceipts.gitResolversRequired'] };
  const identities = [];
  let executionReceipt = null;
  let bindingReceipt = null;
  let packetEvidence = null;
  let finalReleaseEvidence = null;
  try {
    const paths = options.resolveDiffPaths(FREEZE_PARENT_COMMIT, FREEZE_COMMIT).sort();
    const entries = options.resolveDiffEntries(FREEZE_PARENT_COMMIT, FREEZE_COMMIT)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (options.resolveCommitTree(FREEZE_COMMIT) !== FREEZE_TREE ||
        options.resolveParentCommit(FREEZE_COMMIT) !== FREEZE_PARENT_COMMIT ||
        options.resolveCommitTree(FREEZE_PARENT_COMMIT) !== FREEZE_PARENT_TREE ||
        !sameJson(paths, FREEZE_DIFF_PATHS) || !sameJson(entries, FREEZE_DIFF_ENTRIES) ||
        !options.isCommitAncestor(APPLICATION_COMMIT, FREEZE_COMMIT)) blockers.push('frozenReceipts.lineageOrDiff');
    if (options.resolveCommitTree(APPLICATION_COMMIT) !== APPLICATION_TREE ||
        options.resolveParentCommit(APPLICATION_COMMIT) !== CONTENT_DECISION_FREEZE.commit ||
        !sameJson(options.resolveDiffPaths(CONTENT_DECISION_FREEZE.commit, APPLICATION_COMMIT).sort(), APPLICATION_DIFF_PATHS) ||
        !sameJson(options.resolveDiffEntries(CONTENT_DECISION_FREEZE.commit, APPLICATION_COMMIT)
          .sort((left, right) => left.path.localeCompare(right.path)), APPLICATION_DIFF_ENTRIES)) {
      blockers.push('frozenReceipts.applicationLineageOrDiff');
    }
    for (const [index, expected] of FROZEN_RECEIPTS.entries()) {
      const jsonIdentity = options.resolveGitFile(FREEZE_COMMIT, expected.outputPath);
      const markdownIdentity = options.resolveGitFile(FREEZE_COMMIT, expected.markdownPath);
      validateReceiptIdentity(jsonIdentity, expected, blockers, `frozenReceipts.${index}`);
      validateMarkdownIdentity(markdownIdentity, expected, jsonIdentity, blockers, `frozenReceipts.${index}`);
      const receipt = JSON.parse(jsonIdentity.content.toString('utf8'));
      validateReceiptPayload(receipt, expected, blockers, `frozenReceipts.${index}`);
      identities.push({ json: identityWithoutContent(jsonIdentity), markdown: identityWithoutContent(markdownIdentity) });
      if (index === 0) executionReceipt = receipt;
      else bindingReceipt = receipt;
    }
    const claimedAt = new Date(executionReceipt?.payload?.registry?.claimedAt || 'invalid');
    packetEvidence = intakeExecutionPacket({ packetCommit: PACKET_COMMIT, ...options });
    finalReleaseEvidence = intakeFinalReleaseDecision({
      finalReleaseCommit: FINAL_RELEASE_COMMIT,
      packetEvidence,
      now: claimedAt,
      ...options
    });
    if (!packetEvidence.accepted || !finalReleaseEvidence.accepted) blockers.push('frozenReceipts.upstreamGitRevalidation');
    const targets = packetEvidence.packet?.payload?.applicationBoundary?.targets || [];
    for (const target of targets) {
      const actual = options.resolveGitFile(APPLICATION_COMMIT, target.sourcePath);
      if (actual.blobOid !== target.after.blobOid || actual.bytes !== target.after.bytes ||
          actual.sha256 !== target.after.sha256 || actual.gitMode !== target.after.gitMode) {
        blockers.push(`frozenReceipts.applicationTarget.${target.sourcePath}`);
      }
    }
    if (executionReceipt?.payload?.executionPacket?.commit !== PACKET_COMMIT ||
        executionReceipt?.payload?.finalRelease?.commit !== FINAL_RELEASE_COMMIT ||
        bindingReceipt?.payload?.executionPacket?.commit !== PACKET_COMMIT ||
        bindingReceipt?.payload?.finalRelease?.commit !== FINAL_RELEASE_COMMIT ||
        bindingReceipt?.payload?.executionReceipt?.rawSha256 !== FROZEN_RECEIPTS[0].rawSha256 ||
        bindingReceipt?.payload?.executionReceipt?.canonicalPayloadSha256 !== FROZEN_RECEIPTS[0].payloadSha256 ||
        executionReceipt?.payload?.registry?.bindingHash !== bindingReceipt?.payload?.registry?.bindingHash) {
      blockers.push('frozenReceipts.crossReceiptBinding');
    }
  } catch {
    blockers.push('frozenReceipts.unreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    identities,
    executionReceipt,
    bindingReceipt,
    packetEvidence,
    finalReleaseEvidence,
    applicationCommitAnchored: blockers.length === 0,
    fullPlanPackCompletedEvidenceAccepted: blockers.length === 0,
    statusSyncPerformed: false,
    readinessClaimed: false
  };
}

function buildReviewDecision({ frozenEvidence, durableEvidence, implementation }) {
  if (!frozenEvidence?.accepted || durableEvidence?.accepted !== true ||
      durableEvidence.applicationCommit !== APPLICATION_COMMIT || durableEvidence.applicationTree !== APPLICATION_TREE ||
      durableEvidence.fullPlanPackCompleted !== true || durableEvidence.readinessClaimed !== false ||
      durableEvidence.statusSyncAuthorized !== false) throw new Error('cm2120_exact_evidence_required');
  const payload = {
    decisionReference: 'CM-2120-INTERNAL-RECEIPT-REVIEW-PASS-C6BCA575-D5E61022',
    decisionType: 'internal_exact_full_plan_application_receipt_review',
    result: 'PASS',
    reviewedFreeze: {
      commit: FREEZE_COMMIT,
      tree: FREEZE_TREE,
      parentCommit: FREEZE_PARENT_COMMIT,
      parentTree: FREEZE_PARENT_TREE,
      exactDiffPaths: FREEZE_DIFF_PATHS,
      exactDiffEntries: FREEZE_DIFF_ENTRIES
    },
    reviewImplementation: implementation,
    application: {
      commit: APPLICATION_COMMIT,
      tree: APPLICATION_TREE,
      parentCommit: CONTENT_DECISION_FREEZE.commit,
      parentTree: CONTENT_DECISION_FREEZE.tree,
      exactDiffPaths: APPLICATION_DIFF_PATHS,
      exactDiffEntries: APPLICATION_DIFF_ENTRIES,
      anchoredInReviewedFreezeAncestry: true
    },
    receipts: FROZEN_RECEIPTS.map((expected, index) => ({
      role: index === 0 ? 'execution' : 'application_commit_binding',
      ...frozenEvidence.identities[index],
      rawSha256: expected.rawSha256,
      canonicalPayloadSha256: expected.payloadSha256
    })),
    oneShotResult: {
      finalState: 'CONSUMED_SUCCESS',
      bindingHash: BINDING_HASH,
      authorizationUseCount: 1,
      patchInvocationCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      durableEvaluatorAccepted: true
    },
    appliedEvidence: {
      fullPlanPackCompleted: true,
      statusSyncPerformed: false,
      statusSyncAuthorizedByThisDecision: false,
      statusSyncApplicationMayBePrepared: true,
      readiness: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
    },
    sideEffects: {
      receiptFreezeWrites: 4,
      repositoryPatches: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return wrapPayload(payload, 'cm2120_full_plan_application_receipt_review_decision_v1');
}

function evaluateReviewDecision(decision = {}, { implementation, durableEvidence, ...options } = {}) {
  const blockers = [];
  const frozenEvidence = evaluateFrozenReceiptSet(options);
  if (!frozenEvidence.accepted) blockers.push(...frozenEvidence.blockers.map(item => `review.${item}`));
  let expected = null;
  try {
    expected = buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
    if (!sameJson(decision, expected)) blockers.push('review.exactContent');
  } catch {
    blockers.push('review.exactEvidence');
  }
  if (decision.schemaVersion !== 1 || decision.taskId !== TASK_ID ||
      decision.artifactType !== 'cm2120_full_plan_application_receipt_review_decision_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) blockers.push('review.identityOrHash');
  const applied = decision.payload?.appliedEvidence || {};
  if (applied.fullPlanPackCompleted !== true || applied.statusSyncPerformed !== false ||
      applied.statusSyncAuthorizedByThisDecision !== false || applied.statusSyncApplicationMayBePrepared !== true ||
      Object.values(applied.readiness || {}).some(value => value !== false)) blockers.push('review.stateBoundary');
  if (['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']
    .some(field => decision.payload?.sideEffects?.[field] !== 0)) blockers.push('review.sideEffectBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    receiptReviewPassed: blockers.length === 0,
    fullPlanPackCompletedEvidenceAccepted: blockers.length === 0,
    statusSyncApplicationMayBePrepared: blockers.length === 0,
    statusSyncAuthorized: false,
    readinessClaimed: false
  };
}

async function evaluateCurrentDurableEvidence() {
  return evaluateDurableApplicationBinding({
    authorizationContentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    packetCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT
  });
}

module.exports = {
  APPLICATION_COMMIT,
  APPLICATION_TREE,
  BINDING_HASH,
  FREEZE_COMMIT,
  FREEZE_DIFF_ENTRIES,
  FREEZE_DIFF_PATHS,
  FREEZE_PARENT_COMMIT,
  FREEZE_PARENT_TREE,
  FREEZE_TREE,
  FROZEN_RECEIPTS,
  READINESS_FIELDS,
  REVIEW_MARKDOWN_PATH,
  REVIEW_PATH,
  TASK_ID,
  buildReviewDecision,
  canonicalize,
  evaluateCurrentDurableEvidence,
  evaluateFrozenReceiptSet,
  evaluateReviewDecision,
  serializeArtifact,
  wrapPayload
};
