'use strict';

const {
  RECEIPT_PATH: SELF_REVIEW_INTAKE_PATH,
  evaluateReceipt: evaluateSelfReviewIntakeReceipt
} = require('./Cm2115R2SelfReviewDecisionIntakeReceiptContract');
const {
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  identityWithoutContent,
  sha256
} = require('./Cm2115R2CanonicalSnapshotSelfReviewDecisionContract');

const TASK_ID = 'CM-2116-R1';
const GATE_PATH = 'docs/near-model-memory-plan-pack/cm2116_r1_exact_full_plan_application_gate.json';
const GATE_MARKDOWN_PATH = GATE_PATH.replace(/\.json$/, '.md');
const IMPLEMENTATION_PARENT_FREEZE = Object.freeze({
  commit: 'c3f3457b369e86b16dee1251f3914f343040f536',
  tree: 'f56b97dc52935d34db9135da2562387f05b30e27'
});
const SUPERSEDED_GATE_FREEZE = Object.freeze({
  commit: 'c3f3457b369e86b16dee1251f3914f343040f536',
  tree: 'f56b97dc52935d34db9135da2562387f05b30e27',
  canonicalPayloadSha256: '0fd0f9823261ada29e898eeb946e3b4b21b0e561f0100e9e28297d8c7288b2f8',
  jsonPath: 'docs/near-model-memory-plan-pack/cm2116_exact_full_plan_application_gate.json',
  markdownPath: 'docs/near-model-memory-plan-pack/cm2116_exact_full_plan_application_gate.md'
});
const SELF_REVIEW_INTAKE_FREEZE = Object.freeze({
  commit: '7187e5205806a7038a5cfaff8de46ac89ff953f3',
  tree: '6a5eed26226a7e75edc28f3e884f65ec296f5b2c',
  parentCommit: 'df0444bdd46322d52f1dd65eaf78c135f09c556b',
  parentTree: '8f979aec895f3c96c5b8aa4f5f15fe9d40f453eb',
  diffPathsSha256: '5ebc7026ba88a2a89eac8e9ee313b06ae1a7654530d7c650dd48032d9b47b0cf',
  diffEntriesSha256: '7c12df84fa903b94bce7ddd0cd4d79668d35b3761392bd195c6b2fc2535eb011',
  canonicalPayloadSha256: 'ffb0a0cf5db9fff8f04c70d0eb50af4a7adda6db9b0c7f44d3a081675e58eaba',
  json: Object.freeze({
    path: SELF_REVIEW_INTAKE_PATH,
    blobOid: '2a2c8f0192e1ef60b91f63c8c7b9104eece621e6',
    bytes: 6801,
    sha256: 'bd533593604df36d2f2b449a9c29ed72dfffd0246d490bff83cc6c185dbf044f'
  }),
  markdown: Object.freeze({
    path: SELF_REVIEW_INTAKE_PATH.replace(/\.json$/, '.md'),
    blobOid: '7a0340b8075d12482a81c4545dd565fd073369a3',
    bytes: 7378,
    sha256: '4bcd7ed3a6c3edb5a8df140d4fdb6095e26537d4d617c36883fae4d057c18219'
  })
});

const GATE_IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'src/core/Cm2116ExactFullPlanApplicationGate.js',
  'scripts/generate-cm2116-exact-full-plan-application-gate.js',
  'tests/cm2116-exact-full-plan-application-gate.test.js',
  'package.json'
]);
const GATE_IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  ...GATE_IMPLEMENTATION_DIFF_PATHS,
  'src/core/Cm2115R2SelfReviewDecisionIntakeReceiptContract.js',
  'src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotContract.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract.js',
  'src/core/NearModelMemoryPlanPackCompletionAudit.js',
  'scripts/cm2115-r2-git.js',
  'scripts/generate-cm2115-r2-self-review-decision.js'
]);

const FUTURE_APPLICATION_TARGETS = Object.freeze([
  Object.freeze({ path: 'docs/near-model-memory-plan-pack/completion_audit_report.md', operation: 'modify' }),
  Object.freeze({ path: 'docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md', operation: 'modify' }),
  Object.freeze({ path: 'docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md', operation: 'modify' }),
  Object.freeze({ path: 'docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md', operation: 'modify' }),
  Object.freeze({ path: 'docs/near-model-memory-plan-pack/cm2116_full_plan_application_state.json', operation: 'add' })
]);

const HISTORICAL_IMMUTABLE_PATHS = Object.freeze([
  'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot.json',
  'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot.md',
  'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.json',
  'docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.md',
  'docs/near-model-memory-plan-pack/cm2115_r2_internal_self_review_decision.json',
  'docs/near-model-memory-plan-pack/cm2115_r2_internal_self_review_decision.md',
  SELF_REVIEW_INTAKE_FREEZE.json.path,
  SELF_REVIEW_INTAKE_FREEZE.markdown.path,
  SUPERSEDED_GATE_FREEZE.jsonPath,
  SUPERSEDED_GATE_FREEZE.markdownPath
]);

const READINESS_FIELDS = Object.freeze([
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'completeV8',
  'modelMemoryComplete',
  'fullRealtimeMemory',
  'fullBridgeCompletion',
  'readinessClaimed',
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed',
  'rcReadyClaimed',
  'completeV8Claimed',
  'fullPlanPackCompletedClaimed',
  'modelMemoryCompleteClaimed',
  'completeRealtimeMemoryClaimed',
  'fullRealtimeMemoryClaimed',
  'fullBridgeCompletionClaimed'
]);

const IMPLEMENTATION_KEYS = Object.freeze(['commit', 'tree', 'artifacts']);
const ARTIFACT_KEYS = Object.freeze(['path', 'blobOid']);

function sameKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function verifyFrozenFile(actual, expected, blockers, label) {
  if (!actual || actual.sourceCommit !== SELF_REVIEW_INTAKE_FREEZE.commit ||
      actual.sourceTree !== SELF_REVIEW_INTAKE_FREEZE.tree || actual.sourcePath !== expected.path ||
      actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256 || !Buffer.isBuffer(actual.content)) {
    blockers.push(label);
  }
}

function expectedIntakeDiffPaths() {
  return [SELF_REVIEW_INTAKE_FREEZE.json.path, SELF_REVIEW_INTAKE_FREEZE.markdown.path].sort();
}

function expectedIntakeDiffEntries() {
  return expectedIntakeDiffPaths().map(path => ({ status: 'A', path }));
}

function evaluateFrozenSelfReviewIntake(options = {}) {
  const blockers = [];
  const required = [
    options.resolveGitFile,
    options.resolveCommitTree,
    options.resolveParentCommit,
    options.resolveDiffPaths,
    options.resolveDiffEntries,
    options.resolveGitPathState,
    options.resolveDurableClaim,
    options.isCommitAncestor
  ];
  if (!required.every(value => typeof value === 'function')) {
    return { accepted: false, blockers: ['gate.gitResolversRequired'] };
  }
  let jsonIdentity = null;
  let markdownIdentity = null;
  let receipt = null;
  let receiptEvaluation = null;
  try {
    if (options.resolveCommitTree(SELF_REVIEW_INTAKE_FREEZE.commit) !== SELF_REVIEW_INTAKE_FREEZE.tree ||
        options.resolveParentCommit(SELF_REVIEW_INTAKE_FREEZE.commit) !== SELF_REVIEW_INTAKE_FREEZE.parentCommit ||
        options.resolveCommitTree(SELF_REVIEW_INTAKE_FREEZE.parentCommit) !== SELF_REVIEW_INTAKE_FREEZE.parentTree) {
      blockers.push('gate.intakeLineage');
    }
    const diffPaths = options.resolveDiffPaths(
      SELF_REVIEW_INTAKE_FREEZE.parentCommit,
      SELF_REVIEW_INTAKE_FREEZE.commit
    ).sort();
    const diffEntries = options.resolveDiffEntries(
      SELF_REVIEW_INTAKE_FREEZE.parentCommit,
      SELF_REVIEW_INTAKE_FREEZE.commit
    ).sort((a, b) => a.path.localeCompare(b.path));
    if (!sameJson(diffPaths, expectedIntakeDiffPaths()) ||
        sha256Canonical(diffPaths) !== SELF_REVIEW_INTAKE_FREEZE.diffPathsSha256 ||
        !sameJson(diffEntries, expectedIntakeDiffEntries()) ||
        sha256Canonical(diffEntries) !== SELF_REVIEW_INTAKE_FREEZE.diffEntriesSha256) {
      blockers.push('gate.intakeExactAddDiff');
    }
    for (const item of [SELF_REVIEW_INTAKE_FREEZE.json, SELF_REVIEW_INTAKE_FREEZE.markdown]) {
      const parentState = options.resolveGitPathState(SELF_REVIEW_INTAKE_FREEZE.parentCommit, item.path);
      if (!parentState || parentState.exists !== false) blockers.push(`gate.parentPathAlreadyExists.${item.path}`);
    }

    jsonIdentity = options.resolveGitFile(SELF_REVIEW_INTAKE_FREEZE.commit, SELF_REVIEW_INTAKE_FREEZE.json.path);
    markdownIdentity = options.resolveGitFile(
      SELF_REVIEW_INTAKE_FREEZE.commit,
      SELF_REVIEW_INTAKE_FREEZE.markdown.path
    );
    verifyFrozenFile(jsonIdentity, SELF_REVIEW_INTAKE_FREEZE.json, blockers, 'gate.intakeJson');
    verifyFrozenFile(markdownIdentity, SELF_REVIEW_INTAKE_FREEZE.markdown, blockers, 'gate.intakeMarkdown');
    receipt = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (receipt.canonicalPayloadSha256 !== SELF_REVIEW_INTAKE_FREEZE.canonicalPayloadSha256) {
      blockers.push('gate.intakeCanonicalPayloadSha256');
    }
    if (!markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('gate.intakeMarkdownMirror');
    }
    receiptEvaluation = evaluateSelfReviewIntakeReceipt(receipt, options);
    if (!receiptEvaluation.accepted) {
      blockers.push(...receiptEvaluation.blockers.map(item => `gate.intakeReceipt.${item}`));
    }
    if (receiptEvaluation.independentReviewPassed !== true ||
        receiptEvaluation.independentReviewMode !== 'repository_internal_separate_pass' ||
        receiptEvaluation.independentExternalReviewPassed !== false ||
        receiptEvaluation.historicalCm2080ExternalReviewPassedPreserved !== true ||
        receiptEvaluation.fullPlanApplicationAuthorized !== false ||
        receiptEvaluation.fullPlanPackCompleted !== false || receiptEvaluation.readinessClaimed !== false) {
      blockers.push('gate.intakeReceiptBoundary');
    }
  } catch {
    blockers.push('gate.intakeUnreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    receipt,
    receiptEvaluation,
    jsonIdentity,
    markdownIdentity
  };
}

function buildGateReference(gateImplementation) {
  if (!/^[a-f0-9]{40}$/.test(gateImplementation?.commit || '')) {
    throw new Error('cm2116_gate_implementation_commit_required');
  }
  return [
    'CM-2116-R1-EXACT-FULL-PLAN-APPLICATION-GATE',
    SELF_REVIEW_INTAKE_FREEZE.canonicalPayloadSha256.slice(0, 8),
    SELF_REVIEW_INTAKE_FREEZE.commit.slice(0, 8),
    gateImplementation.commit.slice(0, 8)
  ].join('-').toUpperCase();
}

function buildGatePayload({ gateImplementation, intakeEvidence }) {
  if (!intakeEvidence?.accepted) throw new Error('cm2116_exact_self_review_intake_required');
  const receipt = intakeEvidence.receipt;
  return {
    gateReference: buildGateReference(gateImplementation),
    gateType: 'exact_full_plan_application_preparation_gate_r1_v1',
    supersededGate: {
      commit: SUPERSEDED_GATE_FREEZE.commit,
      tree: SUPERSEDED_GATE_FREEZE.tree,
      canonicalPayloadSha256: SUPERSEDED_GATE_FREEZE.canonicalPayloadSha256,
      usedAsCurrentAuthority: false,
      reason: 'superseded_by_exact_schema_and_complete_readiness_alias_hardening'
    },
    upstreamSelfReviewIntake: {
      receiptReference: receipt.payload.receiptReference,
      canonicalPayloadSha256: receipt.canonicalPayloadSha256,
      commit: SELF_REVIEW_INTAKE_FREEZE.commit,
      tree: SELF_REVIEW_INTAKE_FREEZE.tree,
      parentCommit: SELF_REVIEW_INTAKE_FREEZE.parentCommit,
      parentTree: SELF_REVIEW_INTAKE_FREEZE.parentTree,
      diffPaths: expectedIntakeDiffPaths(),
      diffPathsSha256: SELF_REVIEW_INTAKE_FREEZE.diffPathsSha256,
      diffEntries: expectedIntakeDiffEntries(),
      diffEntriesSha256: SELF_REVIEW_INTAKE_FREEZE.diffEntriesSha256,
      json: identityWithoutContent(intakeEvidence.jsonIdentity),
      markdown: identityWithoutContent(intakeEvidence.markdownIdentity),
      exactReceiptContractReplayed: true,
      canonicalSnapshotContractReplayed: true,
      traceEntryCount: 164,
      resolvedTraceEntryCount: 164,
      uniqueSourceObjectCount: 105,
      sourceObjectMismatchCount: 0,
      actionableFindingCount: 0
    },
    gateImplementation,
    currentState: {
      phase8Completed: true,
      historicalCm2080ExternalReviewPassed: true,
      independentReviewPassed: true,
      independentReviewMode: 'repository_internal_separate_pass',
      independentExternalReviewPassed: false,
      supersededGateUsedAsAuthority: false,
      fullPlanApplicationGatePrepared: true,
      fullPlanApplicationDecisionPresent: false,
      fullPlanApplicationAuthorized: false,
      fullPlanApplicationExecuted: false,
      fullPlanApplicationCommitBound: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    exactFutureApplicationScope: {
      action: 'apply_exact_full_plan_completion_state',
      registryReference: 'cm2116-full-plan-application-registry-001',
      nonce: 'cm2116-full-plan-application-001',
      receiptId: 'cm2116-full-plan-application-receipt-001',
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      allowedTargets: FUTURE_APPLICATION_TARGETS.map(item => ({ ...item })),
      historicalImmutablePaths: [...HISTORICAL_IMMUTABLE_PATHS],
      allowedAuthoritativeStateTransition: {
        field: 'fullPlanPackCompleted',
        from: false,
        to: true
      },
      readinessFieldsMustRemainFalse: [...READINESS_FIELDS],
      additionalSemanticStateChangesAllowed: false,
      statusSyncIncludedInExactApplicationCommit: false
    },
    futureExecutionRequirements: {
      separateExactApplicationDecisionRequired: true,
      decisionMustBindGateCommitBlobBytesRawAndPayloadSha256: true,
      decisionMustBindExactBaselineCommitAndTree: true,
      decisionMustFreezeEveryBeforeAndAfterBlobBytesAndSha256: true,
      durableAtomicOneShotClaimRequired: true,
      callerSuppliedAcceptedBooleanAllowed: false,
      alternateOutputPathAllowed: false,
      extraPatchPathAllowed: false,
      exactDirectChildApplicationCommitRequired: true,
      exactApplicationDiffRequired: true,
      receiptTimeUpstreamRevalidationRequired: true,
      separateApplicationCommitBindingReceiptRequired: true,
      statusSyncAllowedOnlyAfterBindingReceiptPasses: true,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false
    },
    gateDecision: {
      gateAccepted: true,
      readyForSeparateExactApplicationDecision: true,
      applicationAuthorizedByThisGate: false,
      applicationExecutedByThisGate: false,
      fullPlanPackCompletedByThisGate: false,
      readinessClaimedByThisGate: false
    },
    sideEffects: {
      repositoryPatches: 0,
      claimCreates: 0,
      nativeReads: 0,
      nativeWrites: 0,
      durableMemoryMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
  };
}

function buildGate(args) {
  const payload = buildGatePayload(args);
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    gateType: 'exact_full_plan_application_preparation_gate_r1_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function evaluateGate(gate = {}, options = {}) {
  const blockers = [];
  if (gate.schemaVersion !== 1 || gate.taskId !== TASK_ID ||
      gate.gateType !== 'exact_full_plan_application_preparation_gate_r1_v1' ||
      gate.canonicalPayloadSha256 !== sha256Canonical(gate.payload || {})) {
    blockers.push('gate.identityOrHash');
  }
  const intakeEvidence = evaluateFrozenSelfReviewIntake(options);
  if (!intakeEvidence.accepted) blockers.push(...intakeEvidence.blockers);

  const implementation = gate.payload?.gateImplementation;
  if (!sameKeys(implementation, IMPLEMENTATION_KEYS) ||
      !/^[a-f0-9]{40}$/.test(implementation.commit || '') ||
      !/^[a-f0-9]{40}$/.test(implementation.tree || '') ||
      !Array.isArray(implementation.artifacts) ||
      !sameJson(implementation.artifacts.map(item => item?.path), GATE_IMPLEMENTATION_ARTIFACT_PATHS) ||
      implementation.artifacts.some(item => !sameKeys(item, ARTIFACT_KEYS) ||
        !/^[a-f0-9]{40}$/.test(item.blobOid || ''))) {
    blockers.push('gate.implementation');
  } else {
    try {
      if (options.resolveCommitTree(implementation.commit) !== implementation.tree ||
          options.resolveParentCommit(implementation.commit) !== IMPLEMENTATION_PARENT_FREEZE.commit ||
          options.resolveCommitTree(IMPLEMENTATION_PARENT_FREEZE.commit) !== IMPLEMENTATION_PARENT_FREEZE.tree ||
          !sameJson(
            options.resolveDiffPaths(IMPLEMENTATION_PARENT_FREEZE.commit, implementation.commit).sort(),
            [...GATE_IMPLEMENTATION_DIFF_PATHS].sort()
          ) || !options.isCommitAncestor(SELF_REVIEW_INTAKE_FREEZE.commit, implementation.commit)) {
        blockers.push('gate.implementationLineage');
      }
      for (const artifact of implementation.artifacts) {
        const actual = options.resolveGitFile(implementation.commit, artifact.path);
        if (actual.gitObjectType !== 'blob' || actual.blobOid !== artifact.blobOid) {
          blockers.push(`gate.implementationArtifact.${artifact.path}`);
        }
      }
    } catch {
      blockers.push('gate.implementationUnreadable');
    }
  }

  if (intakeEvidence.accepted && implementation) {
    try {
      const expected = buildGate({ gateImplementation: implementation, intakeEvidence });
      if (!sameJson(gate, expected)) blockers.push('gate.exactContent');
    } catch {
      blockers.push('gate.exactContent');
    }
  }

  const current = gate.payload?.currentState;
  if (current?.phase8Completed !== true || current?.historicalCm2080ExternalReviewPassed !== true ||
      current?.independentReviewPassed !== true ||
      current?.independentReviewMode !== 'repository_internal_separate_pass' ||
      current?.independentExternalReviewPassed !== false || current?.supersededGateUsedAsAuthority !== false ||
      current?.fullPlanApplicationGatePrepared !== true ||
      current?.fullPlanApplicationDecisionPresent !== false || current?.fullPlanApplicationAuthorized !== false ||
      current?.fullPlanApplicationExecuted !== false || current?.fullPlanApplicationCommitBound !== false ||
      current?.fullPlanPackCompleted !== false || current?.readinessClaimed !== false) {
    blockers.push('gate.currentState');
  }
  if (!sameJson(gate.payload?.exactFutureApplicationScope?.allowedTargets, FUTURE_APPLICATION_TARGETS) ||
      !sameJson(gate.payload?.exactFutureApplicationScope?.historicalImmutablePaths, HISTORICAL_IMMUTABLE_PATHS) ||
      !sameJson(gate.payload?.exactFutureApplicationScope?.readinessFieldsMustRemainFalse, READINESS_FIELDS) ||
      gate.payload?.exactFutureApplicationScope?.additionalSemanticStateChangesAllowed !== false ||
      gate.payload?.exactFutureApplicationScope?.statusSyncIncludedInExactApplicationCommit !== false) {
    blockers.push('gate.futurePatchBoundary');
  }
  const decision = gate.payload?.gateDecision;
  if (decision?.gateAccepted !== true || decision?.readyForSeparateExactApplicationDecision !== true ||
      decision?.applicationAuthorizedByThisGate !== false || decision?.applicationExecutedByThisGate !== false ||
      decision?.fullPlanPackCompletedByThisGate !== false || decision?.readinessClaimedByThisGate !== false) {
    blockers.push('gate.decisionBoundary');
  }
  for (const value of Object.values(gate.payload?.sideEffects || {})) {
    if (value !== 0) blockers.push('gate.sideEffects');
  }
  for (const value of Object.values(gate.payload?.nonClaims || {})) {
    if (value !== false) blockers.push('gate.nonClaims');
  }
  const accepted = blockers.length === 0;
  return {
    accepted,
    blockers: [...new Set(blockers)],
    gatePrepared: accepted,
    readyForSeparateExactApplicationDecision: accepted,
    applicationAuthorized: false,
    applicationExecuted: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

module.exports = {
  ARTIFACT_KEYS,
  FUTURE_APPLICATION_TARGETS,
  GATE_IMPLEMENTATION_ARTIFACT_PATHS,
  GATE_IMPLEMENTATION_DIFF_PATHS,
  GATE_MARKDOWN_PATH,
  GATE_PATH,
  HISTORICAL_IMMUTABLE_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  IMPLEMENTATION_KEYS,
  READINESS_FIELDS,
  SELF_REVIEW_INTAKE_FREEZE,
  SUPERSEDED_GATE_FREEZE,
  TASK_ID,
  buildGate,
  buildGatePayload,
  buildGateReference,
  evaluateFrozenSelfReviewIntake,
  evaluateGate,
  expectedIntakeDiffEntries,
  expectedIntakeDiffPaths,
  sameJson,
  sha256
};
