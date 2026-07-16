'use strict';

const crypto = require('node:crypto');
const {
  FUTURE_APPLICATION_TARGETS,
  GATE_PATH,
  HISTORICAL_IMMUTABLE_PATHS,
  READINESS_FIELDS,
  evaluateGate
} = require('./Cm2116ExactFullPlanApplicationGate');
const {
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  identityWithoutContent,
  sha256
} = require('./Cm2115R2CanonicalSnapshotSelfReviewDecisionContract');

const TASK_ID = 'CM-2117';
const DECISION_PATH = 'docs/near-model-memory-plan-pack/cm2117_exact_full_plan_application_decision.json';
const DECISION_MARKDOWN_PATH = DECISION_PATH.replace(/\.json$/, '.md');
const APPLICATION_STATE_PATH = FUTURE_APPLICATION_TARGETS.find(item => item.operation === 'add').path;

const IMPLEMENTATION_PARENT_FREEZE = Object.freeze({
  commit: 'c5a62f9bc0dda15caaafc949e3fbd12ad940aa2c',
  tree: '2e502e228a53c27b5cbc755f6f622a3fe7e70e7c'
});

const GATE_FREEZE = Object.freeze({
  gateReference: 'CM-2116-R1-EXACT-FULL-PLAN-APPLICATION-GATE-FFB0A0CF-7187E520-629CA75F',
  commit: 'f6b7f9a584946058ac8606e36efb7492dbf4da74',
  tree: '6004160d460c0498de756d8b740a9fb90bfc19f4',
  parentCommit: '629ca75fe2141049d11e41ce13551a0fde8cbc4e',
  parentTree: '6ad868b1a41539b80d0214a567b8589f9b0e3376',
  diffPathsSha256: '75e8066e114bcda3ec26b689009dfb1cdcf723a03307a8c1bdb507e4b2ef224f',
  diffEntriesSha256: '80a4e54519f681e4c62c084216b18a1e7a3de4cf2396df04c37828a0b1edb57b',
  canonicalPayloadSha256: '7591efb0ff598666bd764b99155fd05f7b7fb97c3229a4bfea855a5eb552430c',
  json: Object.freeze({
    path: GATE_PATH,
    blobOid: '5741cabeaf48680288bc48358716376754ce8177',
    bytes: 11204,
    sha256: 'db625f6218b2b2249953c4c66f4c8a2b99011cf8dad310aaa0e63a017f804442'
  }),
  markdown: Object.freeze({
    path: GATE_PATH.replace(/\.json$/, '.md'),
    blobOid: '66d95391a77341143a76581de063fa5709c5d3e1',
    bytes: 11735,
    sha256: '2f1e5bb974ceaa8934fac4dd7be9c7af08f727fa904a5fc250ac4153c38c10f5'
  })
});

const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'src/core/Cm2117ExactFullPlanApplicationDecision.js',
  'scripts/generate-cm2117-exact-full-plan-application-decision.js',
  'tests/cm2117-exact-full-plan-application-decision.test.js',
  'package.json'
]);

const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  ...IMPLEMENTATION_DIFF_PATHS,
  'src/core/Cm2116ExactFullPlanApplicationGate.js',
  'src/core/Cm2115R2SelfReviewDecisionIntakeReceiptContract.js',
  'src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotContract.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract.js',
  'src/core/NearModelMemoryPlanPackCompletionAudit.js',
  'scripts/cm2115-r2-git.js',
  'scripts/generate-cm2115-r2-self-review-decision.js',
  'scripts/generate-cm2116-exact-full-plan-application-gate.js'
]);

const DECISION_READINESS_FIELDS = Object.freeze([
  ...READINESS_FIELDS,
  'completeRealtimeMemory'
]);

const DECISION_HISTORICAL_IMMUTABLE_PATHS = Object.freeze([
  ...HISTORICAL_IMMUTABLE_PATHS,
  GATE_FREEZE.json.path,
  GATE_FREEZE.markdown.path,
  DECISION_PATH,
  DECISION_MARKDOWN_PATH
]);

const PATCH_APPEND_BY_PATH = Object.freeze({
  'docs/near-model-memory-plan-pack/completion_audit_report.md': [
    '## CM-2117 Exact Full-plan Application Boundary',
    '',
    'CM-2117 permits one exact repository application only after a separate',
    'machine-bound final execution release. The application must use one durable',
    'claim, the frozen five-path patch, and a direct-child Git commit. A separate',
    'binding receipt must validate that commit before status synchronization.',
    '',
    `Machine state: \`${APPLICATION_STATE_PATH}\`.`,
    '',
    '`fullPlanPackCompleted=true` becomes current only after the exact application',
    'commit binding receipt passes. Every readiness field remains false.',
    ''
  ].join('\n'),
  'docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md': [
    '## CM-2117 Exact Full-plan Application Trace',
    '',
    'The full-plan transition is bound to the CM-2116-R1 gate, the CM-2115-R2',
    'internal self-review intake, five exact before/after target projections,',
    'one durable authorization claim, and a separate application-commit binding',
    'receipt. Decision preparation alone is not completion evidence.',
    ''
  ].join('\n'),
  'docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md': [
    '## CM-2117 Exact Full-plan Application Boundary',
    '',
    '| Evidence | Acceptance boundary | Current status |',
    '|---|---|---|',
    '| CM-2117 full-plan application | Exact five-path patch + durable one-shot claim + direct-child application commit + separate binding receipt | Pending final execution release and application binding |',
    '',
    'Gate or decision-content acceptance alone does not complete the plan pack.',
    ''
  ].join('\n'),
  'docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md': [
    '## CM-2117 Full-plan Completion Boundary',
    '',
    '- Only the exact bound application may transition `fullPlanPackCompleted` from false to true.',
    '- The transition grants no production, release, deploy, cutover, RC, complete-V8, provider, native-memory, or remote capability.',
    '- Status synchronization is forbidden until the application-commit binding receipt passes.',
    ''
  ].join('\n')
});

const IMPLEMENTATION_KEYS = Object.freeze(['commit', 'tree', 'artifacts']);
const ARTIFACT_KEYS = Object.freeze(['path', 'blobOid']);

function sameKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function gitBlobOid(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}

function serializeArtifact(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function fileProjection(bytes, gitMode = '100644') {
  return {
    gitMode,
    blobOid: gitBlobOid(bytes),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

function expectedGateDiffPaths() {
  return [GATE_FREEZE.json.path, GATE_FREEZE.markdown.path].sort();
}

function expectedGateDiffEntries() {
  return expectedGateDiffPaths().map(path => ({ status: 'A', path }));
}

function expectedImplementationDiffEntries() {
  return [...IMPLEMENTATION_DIFF_PATHS].sort().map(path => ({
    status: path === 'package.json' ? 'M' : 'A',
    path
  }));
}

function verifyFrozenFile(actual, expected, blockers, label) {
  if (!actual || actual.sourceCommit !== GATE_FREEZE.commit || actual.sourceTree !== GATE_FREEZE.tree ||
      actual.sourcePath !== expected.path || actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 ||
      !Buffer.isBuffer(actual.content) || gitBlobOid(actual.content) !== expected.blobOid ||
      sha256(actual.content) !== expected.sha256) {
    blockers.push(label);
  }
}

function evaluateFrozenGate(options = {}) {
  const blockers = [];
  const required = [
    options.resolveGitFile,
    options.resolveCommitTree,
    options.resolveParentCommit,
    options.resolveDiffPaths,
    options.resolveDiffEntries,
    options.resolveGitPathState,
    options.isCommitAncestor
  ];
  if (!required.every(value => typeof value === 'function')) {
    return { accepted: false, blockers: ['decision.gitResolversRequired'] };
  }
  let gate = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  let gateEvaluation = null;
  try {
    if (options.resolveCommitTree(GATE_FREEZE.commit) !== GATE_FREEZE.tree ||
        options.resolveParentCommit(GATE_FREEZE.commit) !== GATE_FREEZE.parentCommit ||
        options.resolveCommitTree(GATE_FREEZE.parentCommit) !== GATE_FREEZE.parentTree) {
      blockers.push('decision.gateLineage');
    }
    const paths = options.resolveDiffPaths(GATE_FREEZE.parentCommit, GATE_FREEZE.commit).sort();
    const entries = options.resolveDiffEntries(GATE_FREEZE.parentCommit, GATE_FREEZE.commit)
      .sort((a, b) => a.path.localeCompare(b.path));
    if (!sameJson(paths, expectedGateDiffPaths()) || sha256Canonical(paths) !== GATE_FREEZE.diffPathsSha256 ||
        !sameJson(entries, expectedGateDiffEntries()) ||
        sha256Canonical(entries) !== GATE_FREEZE.diffEntriesSha256) {
      blockers.push('decision.gateExactAddDiff');
    }
    for (const item of [GATE_FREEZE.json, GATE_FREEZE.markdown]) {
      const parentState = options.resolveGitPathState(GATE_FREEZE.parentCommit, item.path);
      if (!parentState || parentState.exists !== false) blockers.push(`decision.gateParentPath.${item.path}`);
    }
    jsonIdentity = options.resolveGitFile(GATE_FREEZE.commit, GATE_FREEZE.json.path);
    markdownIdentity = options.resolveGitFile(GATE_FREEZE.commit, GATE_FREEZE.markdown.path);
    verifyFrozenFile(jsonIdentity, GATE_FREEZE.json, blockers, 'decision.gateJson');
    verifyFrozenFile(markdownIdentity, GATE_FREEZE.markdown, blockers, 'decision.gateMarkdown');
    gate = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (gate.canonicalPayloadSha256 !== GATE_FREEZE.canonicalPayloadSha256 ||
        gate.payload?.gateReference !== GATE_FREEZE.gateReference) {
      blockers.push('decision.gateIdentity');
    }
    if (!markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('decision.gateMarkdownMirror');
    }
    gateEvaluation = evaluateGate(gate, options);
    if (!gateEvaluation.accepted) blockers.push(...gateEvaluation.blockers.map(item => `decision.gate.${item}`));
    if (gateEvaluation.gatePrepared !== true || gateEvaluation.readyForSeparateExactApplicationDecision !== true ||
        gateEvaluation.applicationAuthorized !== false || gateEvaluation.applicationExecuted !== false ||
        gateEvaluation.fullPlanPackCompleted !== false || gateEvaluation.readinessClaimed !== false) {
      blockers.push('decision.gateBoundary');
    }
  } catch {
    blockers.push('decision.gateUnreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    gate,
    gateEvaluation,
    jsonIdentity,
    markdownIdentity
  };
}

function buildDecisionReference(decisionImplementation) {
  if (!/^[a-f0-9]{40}$/.test(decisionImplementation?.commit || '')) {
    throw new Error('cm2117_decision_implementation_commit_required');
  }
  return [
    'CM-2117-EXACT-FULL-PLAN-APPLICATION-CONTENT-DECISION',
    GATE_FREEZE.canonicalPayloadSha256.slice(0, 8),
    GATE_FREEZE.commit.slice(0, 8),
    decisionImplementation.commit.slice(0, 8)
  ].join('-').toUpperCase();
}

function buildApplicationState(decisionReference) {
  const payload = {
    decisionReference,
    stateType: 'exact_full_plan_application_state',
    authorizationContentApproved: true,
    finalExecutionReleaseAccepted: true,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    patchInvocationCount: 1,
    applicationExecuted: true,
    applicationCommitBindingRequired: true,
    applicationCommitBound: false,
    statusSyncPerformed: false,
    fullPlanPackCompleted: true,
    readiness: Object.fromEntries(DECISION_READINESS_FIELDS.map(field => [field, false])),
    sideEffects: {
      repositoryPatches: 1,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    stateType: 'exact_full_plan_application_state_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function appendExactBlock(before, block, pathLabel) {
  if (!Buffer.isBuffer(before)) throw new TypeError(`cm2117_before_bytes_required:${pathLabel}`);
  const text = before.toString('utf8');
  const marker = block.split('\n')[0];
  if (text.includes(marker)) throw new Error(`cm2117_patch_marker_already_present:${pathLabel}`);
  return Buffer.from(`${text.endsWith('\n') ? text : `${text}\n`}\n${block}`, 'utf8');
}

function buildExpectedAfterBytes(sourcePath, beforeBytes, decisionReference) {
  if (sourcePath === APPLICATION_STATE_PATH) {
    return Buffer.from(serializeArtifact(buildApplicationState(decisionReference)));
  }
  const block = PATCH_APPEND_BY_PATH[sourcePath];
  if (!block) throw new Error(`cm2117_unknown_patch_path:${sourcePath}`);
  return appendExactBlock(beforeBytes, block, sourcePath);
}

function buildPatchTargets({ baselineCommit, baselineTree, decisionReference, resolveGitFile, resolveGitPathState }) {
  if (typeof resolveGitFile !== 'function' || typeof resolveGitPathState !== 'function') {
    throw new TypeError('cm2117_baseline_resolvers_required');
  }
  return FUTURE_APPLICATION_TARGETS.map(({ path: sourcePath, operation }) => {
    if (operation === 'add') {
      const state = resolveGitPathState(baselineCommit, sourcePath);
      if (!state || state.exists !== false) throw new Error(`cm2117_add_target_exists:${sourcePath}`);
      const afterBytes = buildExpectedAfterBytes(sourcePath, null, decisionReference);
      return { sourcePath, operation, before: null, after: fileProjection(afterBytes) };
    }
    const actual = resolveGitFile(baselineCommit, sourcePath);
    if (!actual || actual.sourceCommit !== baselineCommit || actual.sourceTree !== baselineTree ||
        actual.sourcePath !== sourcePath || actual.gitObjectType !== 'blob' || !Buffer.isBuffer(actual.content) ||
        gitBlobOid(actual.content) !== actual.blobOid || sha256(actual.content) !== actual.sha256) {
      throw new Error(`cm2117_baseline_file_invalid:${sourcePath}`);
    }
    const before = {
      gitMode: actual.gitMode,
      blobOid: actual.blobOid,
      bytes: actual.bytes,
      sha256: actual.sha256
    };
    const afterBytes = buildExpectedAfterBytes(sourcePath, actual.content, decisionReference);
    return { sourcePath, operation, before, after: fileProjection(afterBytes, actual.gitMode) };
  });
}

function buildDecision({ decisionImplementation, gateEvidence, baselineCommit, baselineTree, targets }) {
  if (!gateEvidence?.accepted) throw new Error('cm2117_exact_gate_required');
  const decisionReference = buildDecisionReference(decisionImplementation);
  const gate = gateEvidence.gate;
  const patchPlan = {
    sourceBaselineCommit: baselineCommit,
    sourceBaselineTree: baselineTree,
    allowedTargets: FUTURE_APPLICATION_TARGETS.map(item => ({ ...item })),
    targets,
    historicalImmutablePaths: [...DECISION_HISTORICAL_IMMUTABLE_PATHS],
    allowedAuthoritativeStateTransition: {
      field: 'fullPlanPackCompleted',
      from: false,
      to: true
    },
    readinessFieldsMustRemainFalse: [...DECISION_READINESS_FIELDS],
    additionalSemanticStateChangesAllowed: false,
    applicationCommitMustBeDirectChildOfFrozenDecisionCommit: true,
    exactFivePathApplicationDiffRequired: true,
    executionReceiptIncludedInApplicationCommit: false,
    genericReceiptPathExceptionAllowed: false,
    separateApplicationCommitBindingReceiptRequired: true,
    statusSyncAllowedOnlyAfterBindingReceiptPasses: true
  };
  patchPlan.patchPayloadSha256 = sha256Canonical(patchPlan);
  const payload = {
    decisionReference,
    decisionType: 'exact_full_plan_application_content_decision',
    decisionImplementation,
    gateBinding: {
      gateReference: GATE_FREEZE.gateReference,
      canonicalPayloadSha256: GATE_FREEZE.canonicalPayloadSha256,
      commit: GATE_FREEZE.commit,
      tree: GATE_FREEZE.tree,
      parentCommit: GATE_FREEZE.parentCommit,
      parentTree: GATE_FREEZE.parentTree,
      diffPaths: expectedGateDiffPaths(),
      diffPathsSha256: GATE_FREEZE.diffPathsSha256,
      diffEntries: expectedGateDiffEntries(),
      diffEntriesSha256: GATE_FREEZE.diffEntriesSha256,
      json: identityWithoutContent(gateEvidence.jsonIdentity),
      markdown: identityWithoutContent(gateEvidence.markdownIdentity),
      upstreamSelfReviewIntake: gate.payload.upstreamSelfReviewIntake,
      gateContractReplayed: true,
      upstreamReceiptContractReplayed: true
    },
    authorizationContent: {
      action: gate.payload.exactFutureApplicationScope.action,
      authorizationContentApproved: true,
      applicationExecutionAuthorized: false,
      finalExecutionReleaseRequired: true,
      registryReference: gate.payload.exactFutureApplicationScope.registryReference,
      nonce: gate.payload.exactFutureApplicationScope.nonce,
      receiptId: gate.payload.exactFutureApplicationScope.receiptId,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      callerSuppliedAcceptedBooleanAllowed: false,
      alternateOutputPathAllowed: false,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false
    },
    patchPlan,
    allowedStateAfterBoundApplication: {
      phase8Completed: true,
      historicalCm2080ExternalReviewPassed: true,
      independentReviewPassed: true,
      independentReviewMode: 'repository_internal_separate_pass',
      independentExternalReviewPassed: false,
      fullPlanPackCompleted: true,
      readiness: Object.fromEntries(DECISION_READINESS_FIELDS.map(field => [field, false]))
    },
    currentState: {
      fullPlanApplicationGatePrepared: true,
      fullPlanApplicationDecisionContentApproved: true,
      fullPlanApplicationDecisionGitIntakeCompleted: false,
      finalExecutionReleasePresent: false,
      fullPlanApplicationAuthorized: false,
      claimCreated: false,
      fullPlanApplicationExecuted: false,
      fullPlanApplicationCommitBound: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    futureFinalReleaseRequirements: {
      decisionMustBeFrozenInGit: true,
      decisionGitIdentityMustBindCommitTreeParentDiffBlobBytesRawAndPayloadSha256: true,
      frozenExecutorImplementationCommitTreeAndArtifactsRequired: true,
      exactDecisionAndGateRevalidationRequired: true,
      durableAtomicOneShotClaimRequired: true,
      corruptOrExistingClaimMustFailClosed: true,
      exactBeforeAfterPatchRequired: true,
      exactDirectChildApplicationCommitRequired: true,
      receiptTimeDecisionGateAndBaselineRevalidationRequired: true,
      lowDisclosureExecutionReceiptMustRemainOutsideApplicationCommit: true,
      executionReceiptMayBeFrozenOnlyWithSeparateBindingReceiptCommit: true,
      separateApplicationCommitBindingReceiptRequired: true
    },
    futureSideEffectLimits: {
      claimCreates: 1,
      repositoryPatches: 1,
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
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: Object.fromEntries(DECISION_READINESS_FIELDS.map(field => [field, false]))
  };
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    decisionType: 'exact_full_plan_application_content_decision_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function evaluateDecision(decision = {}, options = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.taskId !== TASK_ID ||
      decision.decisionType !== 'exact_full_plan_application_content_decision_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) {
    blockers.push('decision.identityOrHash');
  }
  const gateEvidence = evaluateFrozenGate(options);
  if (!gateEvidence.accepted) blockers.push(...gateEvidence.blockers);

  const implementation = decision.payload?.decisionImplementation;
  if (!sameKeys(implementation, IMPLEMENTATION_KEYS) ||
      !/^[a-f0-9]{40}$/.test(implementation.commit || '') ||
      !/^[a-f0-9]{40}$/.test(implementation.tree || '') ||
      !Array.isArray(implementation.artifacts) ||
      !sameJson(implementation.artifacts.map(item => item?.path), IMPLEMENTATION_ARTIFACT_PATHS) ||
      implementation.artifacts.some(item => !sameKeys(item, ARTIFACT_KEYS) ||
        !/^[a-f0-9]{40}$/.test(item.blobOid || ''))) {
    blockers.push('decision.implementation');
  } else {
    try {
      const diffPaths = options.resolveDiffPaths(IMPLEMENTATION_PARENT_FREEZE.commit, implementation.commit).sort();
      const diffEntries = options.resolveDiffEntries(IMPLEMENTATION_PARENT_FREEZE.commit, implementation.commit)
        .sort((a, b) => a.path.localeCompare(b.path));
      if (options.resolveCommitTree(implementation.commit) !== implementation.tree ||
          options.resolveParentCommit(implementation.commit) !== IMPLEMENTATION_PARENT_FREEZE.commit ||
          options.resolveCommitTree(IMPLEMENTATION_PARENT_FREEZE.commit) !== IMPLEMENTATION_PARENT_FREEZE.tree ||
          !sameJson(diffPaths, [...IMPLEMENTATION_DIFF_PATHS].sort()) ||
          !sameJson(diffEntries, expectedImplementationDiffEntries()) ||
          !options.isCommitAncestor(GATE_FREEZE.commit, implementation.commit)) {
        blockers.push('decision.implementationLineage');
      }
      for (const artifact of implementation.artifacts) {
        const actual = options.resolveGitFile(implementation.commit, artifact.path);
        if (actual.gitObjectType !== 'blob' || actual.blobOid !== artifact.blobOid) {
          blockers.push(`decision.implementationArtifact.${artifact.path}`);
        }
      }
    } catch {
      blockers.push('decision.implementationUnreadable');
    }
  }

  let targets = null;
  const plan = decision.payload?.patchPlan;
  if (!implementation || plan?.sourceBaselineCommit !== implementation.commit ||
      plan?.sourceBaselineTree !== implementation?.tree) {
    blockers.push('decision.baseline');
  } else {
    try {
      if (options.resolveCommitTree(plan.sourceBaselineCommit) !== plan.sourceBaselineTree) {
        blockers.push('decision.baseline');
      }
      targets = buildPatchTargets({
        baselineCommit: plan.sourceBaselineCommit,
        baselineTree: plan.sourceBaselineTree,
        decisionReference: buildDecisionReference(implementation),
        resolveGitFile: options.resolveGitFile,
        resolveGitPathState: options.resolveGitPathState
      });
      if (!sameJson(targets, plan.targets)) blockers.push('decision.patchTargets');
    } catch {
      blockers.push('decision.patchTargets');
    }
  }

  if (gateEvidence.accepted && implementation && targets) {
    try {
      const expected = buildDecision({
        decisionImplementation: implementation,
        gateEvidence,
        baselineCommit: implementation.commit,
        baselineTree: implementation.tree,
        targets
      });
      if (!sameJson(decision, expected)) blockers.push('decision.exactContent');
    } catch {
      blockers.push('decision.exactContent');
    }
  }

  const content = decision.payload?.authorizationContent;
  const current = decision.payload?.currentState;
  if (content?.authorizationContentApproved !== true || content?.applicationExecutionAuthorized !== false ||
      content?.finalExecutionReleaseRequired !== true || content?.authorizationUseCount !== 1 ||
      content?.authorizationReplayAllowed !== false || current?.fullPlanApplicationDecisionContentApproved !== true ||
      current?.fullPlanApplicationDecisionGitIntakeCompleted !== false || current?.finalExecutionReleasePresent !== false ||
      current?.fullPlanApplicationAuthorized !== false || current?.claimCreated !== false ||
      current?.fullPlanApplicationExecuted !== false || current?.fullPlanApplicationCommitBound !== false ||
      current?.fullPlanPackCompleted !== false || current?.readinessClaimed !== false) {
    blockers.push('decision.currentBoundary');
  }
  for (const value of Object.values(decision.payload?.currentSideEffects || {})) {
    if (value !== 0) blockers.push('decision.currentSideEffects');
  }
  for (const value of Object.values(decision.payload?.nonClaims || {})) {
    if (value !== false) blockers.push('decision.nonClaims');
  }
  const accepted = blockers.length === 0;
  return {
    accepted,
    blockers: [...new Set(blockers)],
    authorizationContentApproved: accepted,
    applicationExecutionAuthorized: false,
    finalExecutionReleaseRequired: accepted,
    claimCreated: false,
    applicationExecuted: false,
    applicationCommitBound: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

module.exports = {
  APPLICATION_STATE_PATH,
  ARTIFACT_KEYS,
  DECISION_MARKDOWN_PATH,
  DECISION_PATH,
  DECISION_HISTORICAL_IMMUTABLE_PATHS,
  DECISION_READINESS_FIELDS,
  FUTURE_APPLICATION_TARGETS,
  GATE_FREEZE,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_KEYS,
  IMPLEMENTATION_PARENT_FREEZE,
  PATCH_APPEND_BY_PATH,
  TASK_ID,
  appendExactBlock,
  buildApplicationState,
  buildDecision,
  buildDecisionReference,
  buildExpectedAfterBytes,
  buildPatchTargets,
  evaluateDecision,
  evaluateFrozenGate,
  expectedGateDiffEntries,
  expectedGateDiffPaths,
  expectedImplementationDiffEntries,
  fileProjection,
  gitBlobOid,
  sameJson,
  serializeArtifact,
  sha256
};
