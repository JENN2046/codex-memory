'use strict';

const {
  BASELINE,
  LOCAL_VALIDATION_RECEIPT_PATH,
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  evaluateCm2115CanonicalFullPlanEvidenceSnapshot
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshotContract');
const {
  evaluateCm2115LocalValidationReceipt
} = require('./Cm2115LocalValidationReceiptContract');

const SNAPSHOT_FREEZE = Object.freeze({
  commit: '56d3e04ccf342d47cec687ba42557a4ead76e804',
  tree: '312827b5ed08e750fba6ed880d401a45dd684b3f',
  json: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2115_r1_canonical_full_plan_evidence_snapshot.json',
    blobOid: '14f7a4eacd5234df453eac21b54d46ece83d9e15',
    bytes: 296444,
    sha256: '4bff4c1573ea74d2e6808bf0ea86ad8e7a1fdc756c83bc558bb57794954d9c09',
    canonicalPayloadSha256: '5d4a380d2a2dae4383f83f367bdea2ad137bc14211828e14f4faf521a77546ac'
  }),
  markdown: Object.freeze({
    path: 'docs/near-model-memory-plan-pack/cm2115_r1_canonical_full_plan_evidence_snapshot.md',
    blobOid: '608ef4e2fe78f55d1f8eae3d9be45188d6549cfa',
    bytes: 297242,
    sha256: '56a4f09bac1f7f961f7c4acb746c30bef498d1ed53dfc9f8531b6b831f06d59a'
  })
});

const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotContract.js',
  'src/core/Cm2115LocalValidationReceiptContract.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract.js',
  'src/cli/cm2115-canonical-full-plan-evidence-snapshot.js',
  'scripts/generate-cm2115-local-validation-receipt.js',
  'scripts/generate-cm2115-independent-review-request.js',
  'src/core/Cm2115R1Phase2CompletionAuditApplication.js',
  'scripts/generate-cm2115-r1-phase2-application-decision.js',
  'scripts/apply-cm2115-r1-phase2-completion-audit.js',
  'tests/cm2115-r1-phase2-completion-audit-application.test.js',
  'tests/cm2115-canonical-full-plan-evidence-snapshot.test.js'
]);

const REQUEST_KEYS = Object.freeze([
  'schemaVersion',
  'taskId',
  'requestType',
  'canonicalPayloadSha256',
  'payload'
]);
const PAYLOAD_KEYS = Object.freeze([
  'reviewStatus',
  'snapshot',
  'sourceBaseline',
  'localValidationReceipt',
  'reviewImplementation',
  'reviewScope',
  'requiredReviewChecks',
  'requestedDecisionBoundary',
  'currentState',
  'nonClaims',
  'sideEffects'
]);
const SNAPSHOT_KEYS = Object.freeze(['commit', 'tree', 'json', 'markdown']);
const JSON_BINDING_KEYS = Object.freeze(['path', 'blobOid', 'bytes', 'sha256', 'canonicalPayloadSha256']);
const FILE_BINDING_KEYS = Object.freeze(['path', 'blobOid', 'bytes', 'sha256']);
const BASELINE_KEYS = Object.freeze(['commit', 'tree']);
const VALIDATION_KEYS = Object.freeze([
  'commit',
  'tree',
  'path',
  'blobOid',
  'bytes',
  'sha256',
  'canonicalPayloadSha256',
  'validationTargetCommit',
  'validationTargetTree'
]);
const IMPLEMENTATION_KEYS = Object.freeze(['commit', 'tree', 'artifacts']);
const ARTIFACT_KEYS = Object.freeze(['path', 'blobOid']);
const REVIEW_SCOPE_KEYS = Object.freeze([
  'phaseRequirementCount',
  'objectiveInvariantCount',
  'traceEntryCount',
  'resolvedTraceEntryCount',
  'fakePlaceholderRefCount',
  'uniqueEvidenceFieldCount',
  'uniqueSourceObjectCount',
  'exactAuthorizedReceiptEntryCount',
  'externalReviewEntryCount'
]);
const REVIEW_CHECK_KEYS = Object.freeze([
  'snapshotRawBytesAndHashReviewRequested',
  'snapshotCanonicalPayloadReviewRequested',
  'allTraceGitObjectBindingsReviewRequested',
  'allTraceSemanticRoutesReviewRequested',
  'validationReceiptAndLineageReviewRequested',
  'phase2ApplicationReceiptSemanticReviewRequested',
  'candidateCompletionAuditReviewRequested',
  'nonClaimAndZeroSideEffectReviewRequested'
]);
const DECISION_BOUNDARY_KEYS = Object.freeze([
  'independentSnapshotReviewRequested',
  'independentSnapshotReviewPassed',
  'applicationPreparationAuthorizedByReviewRequest',
  'applicationExecutionAuthorizedByReviewRequest',
  'fullPlanPackCompleted',
  'readinessClaimed',
  'separateApplicationGateRequiredAfterIndependentPass'
]);
const CURRENT_STATE_KEYS = Object.freeze(['phase8Completed', 'fullPlanPackCompleted', 'readinessClaimed']);
const NON_CLAIM_KEYS = Object.freeze([
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'completeV8',
  'modelMemoryComplete',
  'fullRealtimeMemory',
  'fullBridgeCompletion'
]);
const SIDE_EFFECT_KEYS = Object.freeze([
  'nativeReads',
  'nativeWrites',
  'durableMutations',
  'providerCalls',
  'realMemoryReads',
  'remoteActions',
  'readinessClaims'
]);

function sameKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function hex(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

function equalJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function verifyFileBinding(binding, commit, resolveGitFile, blockers, label) {
  if (typeof resolveGitFile !== 'function') {
    blockers.push('gitFileResolverRequired');
    return null;
  }
  try {
    const actual = resolveGitFile(commit, binding.path);
    if (actual.gitObjectType !== 'blob' || actual.blobOid !== binding.blobOid ||
        actual.bytes !== binding.bytes || actual.sha256 !== binding.sha256) {
      blockers.push(`${label}.gitObjectDrift`);
    }
    return actual;
  } catch {
    blockers.push(`${label}.unreadable`);
    return null;
  }
}

function evaluateCm2115SnapshotReviewRequest(request, {
  resolveGitFile,
  resolveCommitTree,
  isCommitAncestor
} = {}) {
  const blockers = [];
  if (!sameKeys(request, REQUEST_KEYS)) blockers.push('request.fields');
  if (request?.schemaVersion !== 2 || request?.taskId !== 'CM-2115-R1' ||
      request?.requestType !== 'canonical_full_plan_evidence_snapshot_independent_review_request_v2') {
    blockers.push('request.identity');
  }
  if (!hex(request?.canonicalPayloadSha256, 64) ||
      sha256Canonical(request?.payload || {}) !== request?.canonicalPayloadSha256) {
    blockers.push('request.canonicalPayloadSha256');
  }
  const payload = request?.payload;
  if (!sameKeys(payload, PAYLOAD_KEYS) || payload?.reviewStatus !== 'pending_independent_review') {
    blockers.push('payload.fields');
  }

  if (!sameKeys(payload?.snapshot, SNAPSHOT_KEYS) ||
      !sameKeys(payload?.snapshot?.json, JSON_BINDING_KEYS) ||
      !sameKeys(payload?.snapshot?.markdown, FILE_BINDING_KEYS) ||
      !equalJson(payload?.snapshot, SNAPSHOT_FREEZE)) {
    blockers.push('payload.snapshot');
  }
  if (!sameKeys(payload?.sourceBaseline, BASELINE_KEYS) ||
      payload?.sourceBaseline?.commit !== BASELINE.sourceCommit ||
      payload?.sourceBaseline?.tree !== BASELINE.sourceTree) {
    blockers.push('payload.sourceBaseline');
  }

  const snapshotJson = payload?.snapshot?.json && verifyFileBinding(
    payload.snapshot.json,
    payload.snapshot.commit,
    resolveGitFile,
    blockers,
    'snapshot.json'
  );
  verifyFileBinding(
    payload?.snapshot?.markdown || {},
    payload?.snapshot?.commit,
    resolveGitFile,
    blockers,
    'snapshot.markdown'
  );
  let snapshotEvaluation = null;
  if (snapshotJson?.content) {
    try {
      const snapshot = JSON.parse(Buffer.isBuffer(snapshotJson.content)
        ? snapshotJson.content.toString('utf8')
        : snapshotJson.content);
      if (snapshot.canonicalPayloadSha256 !== SNAPSHOT_FREEZE.json.canonicalPayloadSha256) {
        blockers.push('snapshot.payloadSha256');
      }
      snapshotEvaluation = evaluateCm2115CanonicalFullPlanEvidenceSnapshot(snapshot, {
        resolveSourceObject: sourcePath => resolveGitFile(BASELINE.sourceCommit, sourcePath),
        resolveCommitTree,
        isCommitAncestor,
        resolveGitFile
      });
      if (!snapshotEvaluation.accepted) blockers.push('snapshot.contract');
    } catch {
      blockers.push('snapshot.json.invalid');
    }
  }

  const validation = payload?.localValidationReceipt;
  if (!sameKeys(validation, VALIDATION_KEYS) ||
      validation?.commit !== BASELINE.sourceCommit || validation?.tree !== BASELINE.sourceTree ||
      validation?.path !== LOCAL_VALIDATION_RECEIPT_PATH ||
      !hex(validation?.blobOid, 40) || !Number.isInteger(validation?.bytes) || validation.bytes <= 0 ||
      !hex(validation?.sha256, 64) || !hex(validation?.canonicalPayloadSha256, 64) ||
      !hex(validation?.validationTargetCommit, 40) || !hex(validation?.validationTargetTree, 40)) {
    blockers.push('payload.localValidationReceipt');
  }
  const validationFile = validation && verifyFileBinding(
    validation,
    validation.commit,
    resolveGitFile,
    blockers,
    'validationReceipt'
  );
  if (validationFile?.content) {
    try {
      const receipt = JSON.parse(Buffer.isBuffer(validationFile.content)
        ? validationFile.content.toString('utf8')
        : validationFile.content);
      const evaluation = evaluateCm2115LocalValidationReceipt(receipt);
      if (!evaluation.accepted || receipt.canonicalPayloadSha256 !== validation.canonicalPayloadSha256 ||
          receipt.payload.validationTarget.commit !== validation.validationTargetCommit ||
          receipt.payload.validationTarget.tree !== validation.validationTargetTree) {
        blockers.push('validationReceipt.contract');
      }
    } catch {
      blockers.push('validationReceipt.invalid');
    }
  }

  const implementation = payload?.reviewImplementation;
  if (!sameKeys(implementation, IMPLEMENTATION_KEYS) ||
      !hex(implementation?.commit, 40) || !hex(implementation?.tree, 40) ||
      !Array.isArray(implementation?.artifacts) ||
      !equalJson(implementation?.artifacts?.map(item => item?.path), IMPLEMENTATION_ARTIFACT_PATHS)) {
    blockers.push('payload.reviewImplementation');
  }
  for (const artifact of implementation?.artifacts || []) {
    if (!sameKeys(artifact, ARTIFACT_KEYS) || !hex(artifact?.blobOid, 40)) {
      blockers.push(`implementation.artifact.${artifact?.path || 'unknown'}`);
      continue;
    }
    try {
      const actual = resolveGitFile(implementation.commit, artifact.path);
      if (actual.gitObjectType !== 'blob' || actual.blobOid !== artifact.blobOid) {
        blockers.push(`implementation.artifactDrift.${artifact.path}`);
      }
    } catch {
      blockers.push(`implementation.artifactUnreadable.${artifact.path}`);
    }
  }
  if (typeof resolveCommitTree !== 'function' || typeof isCommitAncestor !== 'function') {
    blockers.push('gitLineageResolversRequired');
  } else {
    try {
      if (resolveCommitTree(SNAPSHOT_FREEZE.commit) !== SNAPSHOT_FREEZE.tree ||
          resolveCommitTree(BASELINE.sourceCommit) !== BASELINE.sourceTree ||
          resolveCommitTree(implementation.commit) !== implementation.tree) {
        blockers.push('gitLineage.tree');
      }
      if (!isCommitAncestor(BASELINE.sourceCommit, SNAPSHOT_FREEZE.commit) ||
          !isCommitAncestor(SNAPSHOT_FREEZE.commit, implementation.commit)) {
        blockers.push('gitLineage.ancestor');
      }
    } catch {
      blockers.push('gitLineage.unreadable');
    }
  }

  const expectedScope = {
    phaseRequirementCount: 11,
    objectiveInvariantCount: 13,
    traceEntryCount: 164,
    resolvedTraceEntryCount: 164,
    fakePlaceholderRefCount: 0,
    uniqueEvidenceFieldCount: 146,
    uniqueSourceObjectCount: 105,
    exactAuthorizedReceiptEntryCount: 21,
    externalReviewEntryCount: 6
  };
  if (!sameKeys(payload?.reviewScope, REVIEW_SCOPE_KEYS) || !equalJson(payload?.reviewScope, expectedScope)) {
    blockers.push('payload.reviewScope');
  }
  if (!sameKeys(payload?.requiredReviewChecks, REVIEW_CHECK_KEYS) ||
      REVIEW_CHECK_KEYS.some(field => payload?.requiredReviewChecks?.[field] !== true)) {
    blockers.push('payload.requiredReviewChecks');
  }
  const expectedDecisionBoundary = {
    independentSnapshotReviewRequested: true,
    independentSnapshotReviewPassed: false,
    applicationPreparationAuthorizedByReviewRequest: false,
    applicationExecutionAuthorizedByReviewRequest: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    separateApplicationGateRequiredAfterIndependentPass: true
  };
  if (!sameKeys(payload?.requestedDecisionBoundary, DECISION_BOUNDARY_KEYS) ||
      !equalJson(payload?.requestedDecisionBoundary, expectedDecisionBoundary)) {
    blockers.push('payload.requestedDecisionBoundary');
  }
  if (!sameKeys(payload?.currentState, CURRENT_STATE_KEYS) ||
      payload?.currentState?.phase8Completed !== true ||
      payload?.currentState?.fullPlanPackCompleted !== false ||
      payload?.currentState?.readinessClaimed !== false) {
    blockers.push('payload.currentState');
  }
  if (!sameKeys(payload?.nonClaims, NON_CLAIM_KEYS) ||
      NON_CLAIM_KEYS.some(field => payload?.nonClaims?.[field] !== false)) {
    blockers.push('payload.nonClaims');
  }
  if (!sameKeys(payload?.sideEffects, SIDE_EFFECT_KEYS) ||
      SIDE_EFFECT_KEYS.some(field => payload?.sideEffects?.[field] !== 0)) {
    blockers.push('payload.sideEffects');
  }

  const accepted = blockers.length === 0;
  return {
    accepted,
    blockers: [...new Set(blockers)],
    status: accepted
      ? 'cm2115_independent_review_request_accepted_for_submission_only'
      : 'cm2115_independent_review_request_rejected',
    snapshotContractAccepted: snapshotEvaluation?.accepted === true,
    readyToSubmitForIndependentReview: accepted,
    independentReviewPassed: false,
    applicationAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

module.exports = {
  ARTIFACT_KEYS,
  BASELINE_KEYS,
  CURRENT_STATE_KEYS,
  DECISION_BOUNDARY_KEYS,
  FILE_BINDING_KEYS,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_KEYS,
  JSON_BINDING_KEYS,
  NON_CLAIM_KEYS,
  PAYLOAD_KEYS,
  REQUEST_KEYS,
  REVIEW_CHECK_KEYS,
  REVIEW_SCOPE_KEYS,
  SIDE_EFFECT_KEYS,
  SNAPSHOT_FREEZE,
  SNAPSHOT_KEYS,
  VALIDATION_KEYS,
  evaluateCm2115SnapshotReviewRequest
};
