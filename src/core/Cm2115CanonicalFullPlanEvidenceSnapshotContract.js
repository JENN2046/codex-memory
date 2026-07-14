'use strict';

const {
  BASELINE,
  LOCAL_VALIDATION_RECEIPT_PATH,
  PHASE2_APPLICATION_RECEIPT_PATH,
  SNAPSHOT_TYPE,
  TASK_ID,
  buildCandidateAuditSummary,
  buildEntrySpecs,
  buildRouteDefinition,
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  evaluateCm2115LocalValidationReceipt
} = require('./Cm2115LocalValidationReceiptContract');
const {
  evaluateBindingReceipt: evaluateCm2115R2Phase2ApplicationBindingReceipt
} = require('./Cm2115R2Phase2CompletionAuditApplication');

const SNAPSHOT_KEYS = Object.freeze([
  'schemaVersion',
  'taskId',
  'snapshotType',
  'canonicalPayloadSha256',
  'payload'
]);
const PAYLOAD_KEYS = Object.freeze([
  'snapshotStatus',
  'baseline',
  'routeDefinitionSha256',
  'counts',
  'currentState',
  'entries',
  'candidateAudit',
  'semanticEvidenceChecks',
  'reviewBoundary',
  'nonClaims',
  'sideEffects'
]);
const BASELINE_KEYS = Object.freeze(['sourceCommit', 'sourceTree']);
const COUNT_KEYS = Object.freeze([
  'phaseRequirementCount',
  'objectiveInvariantCount',
  'phaseTraceEntryCount',
  'invariantTraceEntryCount',
  'totalTraceEntryCount',
  'resolvedTraceEntryCount',
  'fakePlaceholderRefCount',
  'uniqueEvidenceFieldCount',
  'uniqueSourceObjectCount',
  'exactAuthorizedReceiptEntryCount',
  'externalReviewEntryCount'
]);
const CURRENT_STATE_KEYS = Object.freeze([
  'phase8Completed',
  'fullPlanPackCompleted',
  'readinessClaimed'
]);
const ENTRY_KEYS = Object.freeze([
  'traceKey',
  'scope',
  'requirementId',
  'evidenceField',
  'evidenceKind',
  'derivationClass',
  'bindingStatus',
  'sourceBindings'
]);
const SOURCE_BINDING_KEYS = Object.freeze([
  'sourcePath',
  'sourceCommit',
  'sourceTree',
  'gitObjectType',
  'gitMode',
  'blobOid',
  'bytes',
  'sha256'
]);
const CANDIDATE_AUDIT_KEYS = Object.freeze([
  'evaluatorSchemaVersion',
  'evaluatorAccepted',
  'evaluatorWouldReturnFullPlanPackCompleted',
  'completedPhaseIds',
  'incompletePhaseIds',
  'missingObjectiveInvariantIds',
  'blockerCount',
  'stopReasonCount',
  'completionEligibleForIndependentReview',
  'authoritativeFullPlanPackCompleted',
  'authoritativeReadinessClaimed'
]);
const SEMANTIC_EVIDENCE_CHECK_KEYS = Object.freeze([
  'phase2ApplicationBindingReceiptContractAccepted',
  'phase2ExactEvidenceApplied',
  'phase2ApplicationCommitBound',
  'phase2ReceiptTimeUpstreamGitRevalidationPassed',
  'phase2DurableClaimReceiptStateAccepted',
  'supersededCm2074UsedAsCurrentAuthority',
  'supersededR1UsedAsCurrentAuthority'
]);
const REVIEW_BOUNDARY_KEYS = Object.freeze([
  'independentReviewRequired',
  'independentReviewPassed',
  'semanticRouteReviewPassed',
  'gitObjectReviewPassed',
  'applicationReviewIsSeparate',
  'applicationPrepared',
  'applicationAuthorized',
  'snapshotApplied'
]);
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

const FORBIDDEN_CIRCULAR_SOURCE_PATHS = Object.freeze([
  'docs/near-model-memory-plan-pack/completion_audit_report.md',
  'docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md',
  'docs/near-model-memory-plan-pack/cm2115_canonical_full_plan_evidence_snapshot.json',
  'docs/near-model-memory-plan-pack/cm2115_canonical_full_plan_evidence_snapshot.md',
  'docs/near-model-memory-plan-pack/cm2115_r1_canonical_full_plan_evidence_snapshot.json',
  'docs/near-model-memory-plan-pack/cm2115_r1_canonical_full_plan_evidence_snapshot.md',
  'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot.json',
  'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot.md'
]);

function sameKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function hex(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

const COLAMETA_PRIVATE_ROOT_FILES = new Set([
  'plan.json',
  'memory.md',
  'decisions.json',
  'todolist.json',
  'state.json',
  'executor-session.json',
  'settings.json',
  'runner-settings.json'
]);

const COLAMETA_PRIVATE_DIRECTORIES = new Set([
  'runtime',
  'logs',
  'reports',
  'audits',
  'plan-patches',
  'tmp',
  'local',
  'executor-sessions'
]);

function isPrivateColaMetaPath(value) {
  if (!value.startsWith('.colameta/')) return false;
  const relativePath = value.slice('.colameta/'.length);
  const parts = relativePath.split('/');
  return COLAMETA_PRIVATE_ROOT_FILES.has(relativePath) ||
    COLAMETA_PRIVATE_DIRECTORIES.has(parts[0]) ||
    parts.at(-1).endsWith('.lock');
}

function safeSourcePath(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 240 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    value.split('/').every(part => part && part !== '.' && part !== '..') &&
    /^[A-Za-z0-9._/@+-]+$/.test(value) &&
    !/^\.env(?:\.|$)/.test(value) &&
    !/^data\//.test(value) &&
    !/^logs\/.*\.(?:log|jsonl)$/.test(value) &&
    !isPrivateColaMetaPath(value) &&
    !FORBIDDEN_CIRCULAR_SOURCE_PATHS.includes(value) &&
    (value === LOCAL_VALIDATION_RECEIPT_PATH ||
      !/^docs\/near-model-memory-plan-pack\/cm2115_.*(?:review|application|decision|receipt)/.test(value));
}

function equalJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function unique(values) {
  return [...new Set(values)];
}

function evaluateCm2115CanonicalFullPlanEvidenceSnapshot(snapshot, {
  resolveSourceObject,
  resolveCommitTree,
  isCommitAncestor,
  resolveGitFile,
  resolveParentCommit,
  resolveDiffPaths,
  resolveGitPathState,
  resolveDurableClaim
} = {}) {
  const blockers = [];
  const resolvedByPath = new Map();
  const resolve = sourcePath => {
    if (!resolvedByPath.has(sourcePath)) resolvedByPath.set(sourcePath, resolveSourceObject(sourcePath));
    return resolvedByPath.get(sourcePath);
  };
  if (!sameKeys(snapshot, SNAPSHOT_KEYS)) blockers.push('snapshot.fields');
  if (snapshot?.schemaVersion !== 3 || snapshot?.taskId !== TASK_ID || snapshot?.snapshotType !== SNAPSHOT_TYPE) {
    blockers.push('snapshot.identity');
  }
  if (!hex(snapshot?.canonicalPayloadSha256, 64) ||
      sha256Canonical(snapshot?.payload || {}) !== snapshot?.canonicalPayloadSha256) {
    blockers.push('snapshot.canonicalPayloadSha256');
  }

  const payload = snapshot?.payload;
  if (!sameKeys(payload, PAYLOAD_KEYS) || payload?.snapshotStatus !== 'prepared_for_independent_review') {
    blockers.push('payload.fields');
  }
  if (!sameKeys(payload?.baseline, BASELINE_KEYS) ||
      payload?.baseline?.sourceCommit !== BASELINE.sourceCommit ||
      payload?.baseline?.sourceTree !== BASELINE.sourceTree) {
    blockers.push('payload.baseline');
  }

  const specs = buildEntrySpecs();
  const expectedRouteDefinitionSha256 = sha256Canonical(buildRouteDefinition());
  if (payload?.routeDefinitionSha256 !== expectedRouteDefinitionSha256) {
    blockers.push('payload.routeDefinitionSha256');
  }

  const expectedUniquePaths = unique(specs.flatMap(spec => spec.sourcePaths)).sort();
  const expectedCounts = {
    phaseRequirementCount: 11,
    objectiveInvariantCount: 13,
    phaseTraceEntryCount: 123,
    invariantTraceEntryCount: 41,
    totalTraceEntryCount: 164,
    resolvedTraceEntryCount: 164,
    fakePlaceholderRefCount: 0,
    uniqueEvidenceFieldCount: 146,
    uniqueSourceObjectCount: expectedUniquePaths.length,
    exactAuthorizedReceiptEntryCount: 21,
    externalReviewEntryCount: 6
  };
  if (!sameKeys(payload?.counts, COUNT_KEYS) || !equalJson(payload?.counts, expectedCounts)) {
    blockers.push('payload.counts');
  }
  if (!sameKeys(payload?.currentState, CURRENT_STATE_KEYS) ||
      payload?.currentState?.phase8Completed !== true ||
      payload?.currentState?.fullPlanPackCompleted !== false ||
      payload?.currentState?.readinessClaimed !== false) {
    blockers.push('payload.currentState');
  }

  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  if (!Array.isArray(payload?.entries)) blockers.push('payload.entries');
  const observedTraceKeys = entries.map(entry => entry?.traceKey);
  const expectedTraceKeys = specs.map(spec => spec.traceKey);
  if (!equalJson(observedTraceKeys, expectedTraceKeys) || new Set(observedTraceKeys).size !== observedTraceKeys.length) {
    blockers.push('entries.orderOrCoverage');
  }

  const observedPaths = [];
  entries.forEach((entry, index) => {
    const expected = specs[index];
    if (!sameKeys(entry, ENTRY_KEYS)) blockers.push(`entry.fields.${entry?.traceKey || index}`);
    if (!expected) return;
    if (entry.traceKey !== expected.traceKey || entry.scope !== expected.scope ||
        entry.requirementId !== expected.requirementId || entry.evidenceField !== expected.evidenceField ||
        entry.evidenceKind !== expected.evidenceKind || entry.derivationClass !== expected.derivationClass ||
        entry.bindingStatus !== 'bound_for_independent_review') {
      blockers.push(`entry.route.${expected.traceKey}`);
    }
    const bindings = Array.isArray(entry.sourceBindings) ? entry.sourceBindings : [];
    if (!Array.isArray(entry.sourceBindings) ||
        !equalJson(bindings.map(binding => binding?.sourcePath), expected.sourcePaths)) {
      blockers.push(`entry.sourceCoverage.${expected.traceKey}`);
    }
    for (const binding of bindings) {
      const pathLabel = binding?.sourcePath || 'unknown';
      observedPaths.push(pathLabel);
      if (!sameKeys(binding, SOURCE_BINDING_KEYS)) blockers.push(`source.fields.${expected.traceKey}.${pathLabel}`);
      if (!safeSourcePath(binding?.sourcePath)) {
        blockers.push(`source.path.${expected.traceKey}.${pathLabel}`);
        continue;
      }
      if (binding?.sourceCommit !== BASELINE.sourceCommit || binding?.sourceTree !== BASELINE.sourceTree ||
          binding?.gitObjectType !== 'blob' || !['100644', '100755'].includes(binding?.gitMode) ||
          !hex(binding?.blobOid, 40) || !Number.isInteger(binding?.bytes) || binding.bytes <= 0 ||
          !hex(binding?.sha256, 64)) {
        blockers.push(`source.identity.${expected.traceKey}.${pathLabel}`);
      }
      if (typeof resolveSourceObject !== 'function') {
        blockers.push('source.resolverRequired');
        continue;
      }
      let actual = null;
      try {
        actual = resolve(binding.sourcePath);
      } catch {
        blockers.push(`source.unreadable.${expected.traceKey}.${pathLabel}`);
      }
      if (actual && (actual.gitObjectType !== binding.gitObjectType || actual.gitMode !== binding.gitMode ||
          actual.blobOid !== binding.blobOid || actual.bytes !== binding.bytes || actual.sha256 !== binding.sha256)) {
        blockers.push(`source.gitObjectDrift.${expected.traceKey}.${pathLabel}`);
      }
    }
  });
  if (!equalJson(unique(observedPaths).sort(), expectedUniquePaths)) blockers.push('entries.uniqueSourceCoverage');
  if (!observedPaths.includes(LOCAL_VALIDATION_RECEIPT_PATH)) blockers.push('entries.currentValidationReceiptMissing');
  if (!observedPaths.includes(PHASE2_APPLICATION_RECEIPT_PATH)) {
    blockers.push('entries.phase2ApplicationReceiptMissing');
  }

  let phase2ApplicationReceiptEvaluation = null;
  if (typeof resolveSourceObject === 'function') {
    try {
      const receiptIdentity = resolve(PHASE2_APPLICATION_RECEIPT_PATH);
      const content = Buffer.isBuffer(receiptIdentity?.content)
        ? receiptIdentity.content.toString('utf8')
        : receiptIdentity?.content;
      phase2ApplicationReceiptEvaluation = evaluateCm2115R2Phase2ApplicationBindingReceipt(
        JSON.parse(content),
        { resolveGitFile, resolveCommitTree, resolveParentCommit, resolveDiffPaths, resolveGitPathState, resolveDurableClaim }
      );
      if (!phase2ApplicationReceiptEvaluation.accepted) blockers.push('phase2ApplicationReceipt.contract');
    } catch {
      blockers.push('phase2ApplicationReceipt.unreadable');
    }
  }
  const expectedSemanticEvidenceChecks = {
    phase2ApplicationBindingReceiptContractAccepted: true,
    phase2ExactEvidenceApplied: true,
    phase2ApplicationCommitBound: true,
    phase2ReceiptTimeUpstreamGitRevalidationPassed: true,
    phase2DurableClaimReceiptStateAccepted: true,
    supersededCm2074UsedAsCurrentAuthority: false,
    supersededR1UsedAsCurrentAuthority: false
  };
  if (!sameKeys(payload?.semanticEvidenceChecks, SEMANTIC_EVIDENCE_CHECK_KEYS) ||
      !equalJson(payload?.semanticEvidenceChecks, expectedSemanticEvidenceChecks) ||
      phase2ApplicationReceiptEvaluation?.accepted !== true) {
    blockers.push('payload.semanticEvidenceChecks');
  }

  let validationReceipt = null;
  let validationReceiptEvaluation = null;
  if (typeof resolveSourceObject === 'function') {
    try {
      const validationIdentity = resolve(LOCAL_VALIDATION_RECEIPT_PATH);
      const content = Buffer.isBuffer(validationIdentity?.content)
        ? validationIdentity.content.toString('utf8')
        : validationIdentity?.content;
      validationReceipt = JSON.parse(content);
      validationReceiptEvaluation = evaluateCm2115LocalValidationReceipt(validationReceipt);
      if (!validationReceiptEvaluation.accepted) blockers.push('validationReceipt.contract');
    } catch {
      blockers.push('validationReceipt.unreadable');
    }
  }
  const validationTarget = validationReceipt?.payload?.validationTarget;
  if (validationReceiptEvaluation?.accepted) {
    if (typeof resolveCommitTree !== 'function' || typeof resolveParentCommit !== 'function' ||
        typeof resolveDiffPaths !== 'function' || typeof isCommitAncestor !== 'function') {
      blockers.push('validationReceipt.gitLineageResolversRequired');
    } else {
      try {
        if (resolveCommitTree(validationTarget.commit) !== validationTarget.tree) {
          blockers.push('validationReceipt.targetTree');
        }
        if (!isCommitAncestor(validationTarget.commit, BASELINE.sourceCommit)) {
          blockers.push('validationReceipt.targetNotAncestorOfBaseline');
        }
        if (resolveParentCommit(BASELINE.sourceCommit) !== validationTarget.commit ||
            !equalJson(resolveDiffPaths(validationTarget.commit, BASELINE.sourceCommit), [LOCAL_VALIDATION_RECEIPT_PATH])) {
          blockers.push('validationReceipt.notExactBaselineParent');
        }
      } catch {
        blockers.push('validationReceipt.gitLineageUnreadable');
      }
    }
  }

  const expectedCandidate = buildCandidateAuditSummary();
  if (!sameKeys(payload?.candidateAudit, CANDIDATE_AUDIT_KEYS) ||
      !equalJson(payload?.candidateAudit, expectedCandidate) ||
      payload?.candidateAudit?.evaluatorAccepted !== true ||
      payload?.candidateAudit?.evaluatorWouldReturnFullPlanPackCompleted !== true ||
      payload?.candidateAudit?.completionEligibleForIndependentReview !== true ||
      payload?.candidateAudit?.authoritativeFullPlanPackCompleted !== false ||
      payload?.candidateAudit?.authoritativeReadinessClaimed !== false) {
    blockers.push('payload.candidateAudit');
  }

  const expectedReviewBoundary = {
    independentReviewRequired: true,
    independentReviewPassed: false,
    semanticRouteReviewPassed: false,
    gitObjectReviewPassed: false,
    applicationReviewIsSeparate: true,
    applicationPrepared: false,
    applicationAuthorized: false,
    snapshotApplied: false
  };
  if (!sameKeys(payload?.reviewBoundary, REVIEW_BOUNDARY_KEYS) ||
      !equalJson(payload?.reviewBoundary, expectedReviewBoundary)) {
    blockers.push('payload.reviewBoundary');
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
    blockers: unique(blockers),
    contractStatus: accepted
      ? 'cm2115_snapshot_contract_accepted_for_independent_review_only'
      : 'cm2115_snapshot_contract_rejected',
    readyForIndependentReview: accepted,
    independentReviewPassed: false,
    applicationAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    sourceObjectsVerifiedAgainstGit: accepted && typeof resolveSourceObject === 'function',
    validationReceiptAccepted: accepted && validationReceiptEvaluation?.accepted === true,
    phase2ApplicationBindingReceiptAccepted: accepted && phase2ApplicationReceiptEvaluation?.accepted === true,
    validationReceiptTargetCommit: validationTarget?.commit || null,
    traceEntryCount: entries.length,
    uniqueSourceObjectCount: unique(observedPaths).length,
    fakePlaceholderRefCount: payload?.counts?.fakePlaceholderRefCount ?? null
  };
}

module.exports = {
  BASELINE_KEYS,
  CANDIDATE_AUDIT_KEYS,
  COUNT_KEYS,
  CURRENT_STATE_KEYS,
  ENTRY_KEYS,
  FORBIDDEN_CIRCULAR_SOURCE_PATHS,
  NON_CLAIM_KEYS,
  PAYLOAD_KEYS,
  REVIEW_BOUNDARY_KEYS,
  SEMANTIC_EVIDENCE_CHECK_KEYS,
  SIDE_EFFECT_KEYS,
  SNAPSHOT_KEYS,
  SOURCE_BINDING_KEYS,
  evaluateCm2115CanonicalFullPlanEvidenceSnapshot,
  safeSourcePath
};
